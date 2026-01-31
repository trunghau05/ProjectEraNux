import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

export interface Peer {
  socketId: string;
  userId: string;
  userName: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

export interface CallState {
  isInCall: boolean;
  roomId: string | null;
  localStream: MediaStream | null;
  peers: Map<string, Peer>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private socket: Socket | null = null;
  private readonly SIGNALING_SERVER = 'http://localhost:3000';
  
  // ICE servers (STUN/TURN)
  private readonly iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // State management
  private callState: CallState = {
    isInCall: false,
    roomId: null,
    localStream: null,
    peers: new Map(),
    isVideoEnabled: true,
    isAudioEnabled: true
  };

  // Observables
  private callStateSubject = new BehaviorSubject<CallState>(this.callState);
  public callState$ = this.callStateSubject.asObservable();

  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  constructor() {}

  /**
   * Connect to signaling server
   */
  private connectToSignalingServer(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.SIGNALING_SERVER, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.setupSocketListeners();
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.errorSubject.next('Không thể kết nối đến server signaling');
    });

    // User events
    this.socket.on('existing-users', (users: Peer[]) => {
      console.log('Existing users:', users);
      // Only create offer if our socket ID is smaller (to avoid glare)
      users.forEach(user => {
        const shouldOffer = (this.socket?.id || '') < user.socketId;
        console.log(`Existing user ${user.socketId}, should offer: ${shouldOffer}`);
        this.createPeerConnection(user, shouldOffer);
      });
    });

    this.socket.on('user-connected', (user: Peer) => {
      console.log('User connected:', user);
      // Only create offer if our socket ID is smaller (to avoid glare)
      const shouldOffer = (this.socket?.id || '') < user.socketId;
      console.log(`New user ${user.socketId}, should offer: ${shouldOffer}`);
      this.createPeerConnection(user, shouldOffer);
    });

    this.socket.on('user-disconnected', (data: { socketId: string }) => {
      console.log('User disconnected:', data.socketId);
      this.removePeer(data.socketId);
    });

    // WebRTC signaling events
    this.socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log('Received offer from:', from);
      await this.handleOffer(offer, from);
    });

    this.socket.on('answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      console.log('Received answer from:', from);
      await this.handleAnswer(answer, from);
    });

    this.socket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      console.log('Received ICE candidate from:', from);
      await this.handleIceCandidate(candidate, from);
    });

    // Media control events
    this.socket.on('user-video-toggled', ({ socketId, enabled }: { socketId: string; enabled: boolean }) => {
      const peer = this.callState.peers.get(socketId);
      if (peer) {
        console.log(`User ${socketId} ${enabled ? 'enabled' : 'disabled'} video`);
      }
    });

    this.socket.on('user-audio-toggled', ({ socketId, enabled }: { socketId: string; enabled: boolean }) => {
      const peer = this.callState.peers.get(socketId);
      if (peer) {
        console.log(`User ${socketId} ${enabled ? 'enabled' : 'disabled'} audio`);
      }
    });
  }

  /**
   * Start a call - get user media and join room
   */
  async startCall(roomId: string, userId: string, userName: string): Promise<void> {
    try {
      // Connect to signaling server
      this.connectToSignalingServer();

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.callState.localStream = stream;
      this.callState.isInCall = true;
      this.callState.roomId = roomId;
      this.callState.isVideoEnabled = true;
      this.callState.isAudioEnabled = true;

      this.updateCallState();

      // Join room
      this.socket?.emit('join-room', { roomId, userId, userName });

    } catch (error: any) {
      console.error('Error starting call:', error);
      this.errorSubject.next(`Không thể khởi động cuộc gọi: ${error.message}`);
      throw error;
    }
  }

  /**
   * End call and cleanup
   */
  endCall(): void {
    // Stop local stream
    if (this.callState.localStream) {
      this.callState.localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    this.callState.peers.forEach(peer => {
      peer.peerConnection?.close();
      if (peer.stream) {
        peer.stream.getTracks().forEach(track => track.stop());
      }
    });

    // Leave room
    if (this.socket && this.callState.roomId) {
      this.socket.emit('leave-room');
    }

    // Disconnect socket
    this.socket?.disconnect();
    this.socket = null;

    // Reset state
    this.callState = {
      isInCall: false,
      roomId: null,
      localStream: null,
      peers: new Map(),
      isVideoEnabled: true,
      isAudioEnabled: true
    };

    this.updateCallState();
  }

  /**
   * Create peer connection for a remote peer
   */
  private async createPeerConnection(peer: Peer, shouldCreateOffer: boolean = true): Promise<void> {
    try {
      const peerConnection = new RTCPeerConnection(this.iceServers);

      // Add local stream tracks to peer connection
      if (this.callState.localStream) {
        this.callState.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.callState.localStream!);
        });
      }

      // Handle remote stream
      const remoteStream = new MediaStream();
      peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind, 'from peer:', peer.socketId);
        console.log('Event streams:', event.streams);
        
        // Add track to remote stream
        if (!remoteStream.getTracks().find(t => t.id === event.track.id)) {
          remoteStream.addTrack(event.track);
          console.log('Added track to remote stream. Total tracks:', remoteStream.getTracks().length);
        }
        
        // Update peer stream and notify
        peer.stream = remoteStream;
        this.callState.peers.set(peer.socketId, peer);
        console.log('Updated peer stream for:', peer.socketId);
        this.updateCallState();
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to:', peer.socketId);
          this.socket?.emit('ice-candidate', {
            candidate: event.candidate,
            to: peer.socketId
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${peer.socketId}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'failed' || 
            peerConnection.connectionState === 'disconnected') {
          this.removePeer(peer.socketId);
        }
      };

      peer.peerConnection = peerConnection;
      this.callState.peers.set(peer.socketId, peer);

      // Only create and send offer if requested (not when handling incoming offer)
      if (shouldCreateOffer) {
        await this.createAndSendOffer(peer);
      }

    } catch (error) {
      console.error('Error creating peer connection:', error);
      this.errorSubject.next('Lỗi khi thiết lập kết nối peer');
    }
  }

  /**
   * Create and send WebRTC offer
   */
  private async createAndSendOffer(peer: Peer): Promise<void> {
    try {
      const offer = await peer.peerConnection!.createOffer();
      await peer.peerConnection!.setLocalDescription(offer);

      console.log('Sending offer to:', peer.socketId);
      this.socket?.emit('offer', {
        offer,
        to: peer.socketId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  /**
   * Handle received offer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit, from: string): Promise<void> {
    try {
      let peer = this.callState.peers.get(from);

      // Create peer connection if it doesn't exist (don't send offer back)
      if (!peer) {
        peer = { socketId: from, userId: '', userName: '' };
        await this.createPeerConnection(peer, false); // false = don't create offer
        peer = this.callState.peers.get(from)!;
      }

      // Set remote description
      const currentState = peer.peerConnection!.signalingState;
      console.log(`Current signaling state for ${from}:`, currentState);
      
      // Only set remote description if we're in the correct state
      if (currentState === 'stable' || currentState === 'have-local-offer') {
        await peer.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

        // Create and send answer
        const answer = await peer.peerConnection!.createAnswer();
        await peer.peerConnection!.setLocalDescription(answer);

        console.log('Sending answer to:', from);
        this.socket?.emit('answer', {
          answer,
          to: from
        });
      } else {
        console.warn(`Cannot handle offer in state: ${currentState}`);
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  /**
   * Handle received answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit, from: string): Promise<void> {
    try {
      const peer = this.callState.peers.get(from);
      if (!peer?.peerConnection) {
        console.warn(`No peer connection found for ${from}`);
        return;
      }

      const currentState = peer.peerConnection.signalingState;
      console.log(`Current signaling state for ${from}:`, currentState);

      // Only set remote description if we're expecting an answer
      if (currentState === 'have-local-offer') {
        await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`Successfully set remote answer from ${from}`);
      } else {
        console.warn(`Received answer in wrong state (${currentState}), ignoring`);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  /**
   * Handle received ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit, from: string): Promise<void> {
    try {
      const peer = this.callState.peers.get(from);
      if (peer?.peerConnection) {
        await peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  /**
   * Remove peer connection
   */
  private removePeer(socketId: string): void {
    const peer = this.callState.peers.get(socketId);
    if (peer) {
      peer.peerConnection?.close();
      if (peer.stream) {
        peer.stream.getTracks().forEach(track => track.stop());
      }
      this.callState.peers.delete(socketId);
      this.updateCallState();
    }
  }

  /**
   * Toggle video
   */
  toggleVideo(): void {
    if (this.callState.localStream) {
      const videoTrack = this.callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.callState.isVideoEnabled = videoTrack.enabled;
        
        // Notify other peers
        if (this.callState.roomId) {
          this.socket?.emit('toggle-video', {
            roomId: this.callState.roomId,
            enabled: videoTrack.enabled
          });
        }
        
        this.updateCallState();
      }
    }
  }

  /**
   * Toggle audio
   */
  toggleAudio(): void {
    if (this.callState.localStream) {
      const audioTrack = this.callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.callState.isAudioEnabled = audioTrack.enabled;
        
        // Notify other peers
        if (this.callState.roomId) {
          this.socket?.emit('toggle-audio', {
            roomId: this.callState.roomId,
            enabled: audioTrack.enabled
          });
        }
        
        this.updateCallState();
      }
    }
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.callState.localStream;
  }

  /**
   * Get remote streams
   */
  getRemoteStreams(): MediaStream[] {
    return Array.from(this.callState.peers.values())
      .filter(peer => peer.stream)
      .map(peer => peer.stream!);
  }

  /**
   * Update call state and notify subscribers
   */
  private updateCallState(): void {
    this.callStateSubject.next({ ...this.callState });
  }
}
