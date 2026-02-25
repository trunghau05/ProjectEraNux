import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Peer {
  socketId: string;
  userId: string;
  userName: string;
  stream?: MediaStream;
  screenStream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  screenPeerConnection?: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  isScreenSharing?: boolean;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export interface CallState {
  isInCall: boolean;
  roomId: string | null;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  peers: Map<string, Peer>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private socket: Socket | null = null;
  private readonly SIGNALING_SERVER = environment.signalingServerUrl;
  
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
    screenStream: null,
    peers: new Map(),
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false
  };

  // Observables
  private callStateSubject = new BehaviorSubject<CallState>(this.callState);
  public callState$ = this.callStateSubject.asObservable();

  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  private messageSubject = new Subject<ChatMessage>();
  public message$ = this.messageSubject.asObservable();

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
        console.log(`Existing user ${user.socketId}, should offer: ${shouldOffer}, isScreenSharing: ${user.isScreenSharing}`);
        // Đảm bảo flag isScreenSharing được truyền vào peer object
        // Flag này sẽ được sử dụng trong createPeerConnection để xác định track type
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
        peer.isVideoEnabled = enabled;
        this.updateCallState();
      }
    });

    this.socket.on('user-audio-toggled', ({ socketId, enabled }: { socketId: string; enabled: boolean }) => {
      const peer = this.callState.peers.get(socketId);
      if (peer) {
        console.log(`User ${socketId} ${enabled ? 'enabled' : 'disabled'} audio`);
        peer.isAudioEnabled = enabled;
        this.updateCallState();
      }
    });

    // Screen sharing events
    this.socket.on('screen-share-start', ({ socketId }: { socketId: string }) => {
      console.log('User started screen sharing:', socketId);
      const peer = this.callState.peers.get(socketId);
      if (peer) {
        peer.isScreenSharing = true;
        this.callState.peers = new Map(this.callState.peers);
        this.updateCallState();
      } else {
        console.log('Peer not yet created for screen sharing user:', socketId, '- will be set when peer connects');
      }
    });

    this.socket.on('screen-share-stop', ({ socketId }: { socketId: string }) => {
      console.log('User stopped screen sharing:', socketId);
      const peer = this.callState.peers.get(socketId);
      if (peer) {
        peer.isScreenSharing = false;
        if (peer.screenStream) {
          peer.screenStream.getTracks().forEach(track => track.stop());
          peer.screenStream = undefined;
        }
        this.callState.peers = new Map(this.callState.peers);
        this.updateCallState();
      }
    });
  }

  /**
   * Start a call - get user media and join room
   */
  async startCall(roomId: string, userId: string, userName: string): Promise<void> {
    try {
      console.log('[WebRTC] Starting call with:', { roomId, userId, userName });
      
      // Connect to signaling server
      this.connectToSignalingServer();

      // Wait for socket to be connected
      if (!this.socket?.connected) {
        console.log('[WebRTC] Waiting for socket connection...');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Không thể kết nối đến server'));
          }, 5000);

          this.socket?.once('connect', () => {
            clearTimeout(timeout);
            console.log('[WebRTC] Socket connected');
            resolve();
          });

          // If already connected, resolve immediately
          if (this.socket?.connected) {
            clearTimeout(timeout);
            console.log('[WebRTC] Socket already connected');
            resolve();
          }
        });
      }

      console.log('[WebRTC] Requesting user media...');
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

      console.log('[WebRTC] Got user media, tracks:', stream.getTracks().length);
      
      this.callState.localStream = stream;
      this.callState.roomId = roomId;
      this.callState.isVideoEnabled = true;
      this.callState.isAudioEnabled = true;
      this.callState.isInCall = true;

      // Update state immediately
      this.updateCallState();
      console.log('[WebRTC] Call state updated, isInCall:', this.callState.isInCall);

      // Join room
      console.log('[WebRTC] Joining room:', roomId);
      this.socket?.emit('join-room', { roomId, userId, userName });

    } catch (error: any) {
      console.error('[WebRTC] Error starting call:', error);
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
      screenStream: null,
      peers: new Map(),
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false
    };

    this.updateCallState();
  }

  /**
   * Create peer connection for a remote peer
   */
  private async createPeerConnection(peer: Peer, shouldCreateOffer: boolean = true): Promise<void> {
    try {
      const peerConnection = new RTCPeerConnection(this.iceServers);

      // Initialize peer state defaults if not set
      if (peer.isVideoEnabled === undefined) peer.isVideoEnabled = true;
      if (peer.isAudioEnabled === undefined) peer.isAudioEnabled = true;

      // Lưu peer vào callState ngay lập tức để giữ trạng thái isScreenSharing
      peer.peerConnection = peerConnection;
      this.callState.peers.set(peer.socketId, peer);

      // Add local stream tracks to peer connection
      if (this.callState.localStream) {
        const localTracks = this.callState.localStream.getTracks();
        console.log(`🎥 Adding ${localTracks.length} LOCAL tracks to peer ${peer.socketId}:`, 
          localTracks.map(t => ({ kind: t.kind, label: t.label })));
        localTracks.forEach(track => {
          const sender = peerConnection.addTrack(track, this.callState.localStream!);
          console.log(`  ✓ Added ${track.kind} track:`, track.label);
        });
      }

      // Add screen share tracks if currently sharing
      if (this.callState.screenStream) {
        const screenTracks = this.callState.screenStream.getTracks();
        console.log(`🖥️  Adding ${screenTracks.length} SCREEN tracks to peer ${peer.socketId}:`, 
          screenTracks.map(t => ({ kind: t.kind, label: t.label })));
        screenTracks.forEach(track => {
          const sender = peerConnection.addTrack(track, this.callState.screenStream!);
          console.log(`  ✓ Added screen ${track.kind} track:`, track.label);
        });
      } else if (peer.isScreenSharing) {
        console.warn(`⚠️  Peer ${peer.socketId} isScreenSharing=true but no local screenStream available`);
      }

      // Log total tracks in this peer connection
      const senders = peerConnection.getSenders();
      console.log(`📊 Total tracks in peer connection for ${peer.socketId}:`, 
        senders.map(s => s.track ? { kind: s.track.kind, label: s.track.label } : 'null'));

      // Handle remote stream - separate camera and screen tracks
      const remoteStream = new MediaStream();
      const screenStream = new MediaStream();
      const tracksReceived: Array<{kind: string, label: string, streamId: string}> = [];
      let primaryVideoStreamId: string | null = null;
      
      peerConnection.ontrack = (event) => {
        const track = event.track;
        const stream = event.streams[0];
        const streamId = stream?.id || 'no-stream';
        
        // Log để debug
        tracksReceived.push({ kind: track.kind, label: track.label, streamId });
        console.log(`📥 Track #${tracksReceived.length} from ${peer.socketId}:`, {
          kind: track.kind,
          label: track.label,
          streamId,
          peerIsScreenSharing: peer.isScreenSharing,
          allTracks: tracksReceived
        });
        
        // Phát hiện screen share track dựa trên:
        // 1. Label chứa "screen"/"display"
        // 2. Video track đến từ streamId khác với camera stream đầu tiên
        // 3. Fallback: khi đã có camera video và peer báo đang share
        const trackLabel = track.label.toLowerCase();
        const isScreenByLabel = trackLabel.includes('screen') || trackLabel.includes('display');

        let isScreenShareTrack = false;

        if (track.kind === 'video') {
          if (isScreenByLabel) {
            isScreenShareTrack = true;
          } else if (!primaryVideoStreamId) {
            primaryVideoStreamId = streamId;
          } else if (streamId !== primaryVideoStreamId) {
            isScreenShareTrack = true;
          } else if (peer.isScreenSharing && remoteStream.getVideoTracks().length > 0) {
            isScreenShareTrack = true;
          }
        }
        
        if (isScreenShareTrack) {
          console.log('✅ SCREEN SHARE track detected:', {
            label: track.label,
            streamId,
            reason: isScreenByLabel ? 'label-based' : 'second-video-track'
          });
          
          if (!screenStream.getTracks().find(t => t.id === track.id)) {
            screenStream.addTrack(track);
            peer.screenStream = screenStream;
            peer.isScreenSharing = true;
            console.log('✅ Added to screenStream. Total screen tracks:', screenStream.getTracks().length);
          }
        } else {
          console.log('📹 CAMERA track detected:', { label: track.label, kind: track.kind });
          
          if (!remoteStream.getTracks().find(t => t.id === track.id)) {
            remoteStream.addTrack(track);
            console.log('📹 Added to remoteStream. Total camera tracks:', remoteStream.getTracks().length);
          }
        }
        
        peer.stream = remoteStream;
        this.callState.peers = new Map(this.callState.peers.set(peer.socketId, peer));
        console.log(`✓ Updated peer ${peer.socketId}:`, {
          hasCamera: peer.stream?.getTracks().length,
          hasScreen: peer.screenStream?.getTracks().length,
          isScreenSharing: peer.isScreenSharing
        });
        this.updateCallState();
        
        track.onended = () => {
          console.log('Track ended:', track.kind, 'from:', peer.socketId);
          if (isScreenShareTrack) {
            peer.isScreenSharing = false;
            peer.screenStream = undefined;
            this.updateCallState();
          }
        };
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

      // Setup data channel for chat messages
      if (shouldCreateOffer) {
        // Create data channel (only the offerer creates it)
        const dataChannel = peerConnection.createDataChannel('chat');
        this.setupDataChannel(dataChannel, peer);
        peer.dataChannel = dataChannel;
        console.log('Created data channel for:', peer.socketId);
      } else {
        // Listen for data channel (answerer receives it)
        peerConnection.ondatachannel = (event) => {
          const dataChannel = event.channel;
          this.setupDataChannel(dataChannel, peer);
          peer.dataChannel = dataChannel;
          console.log('Received data channel from:', peer.socketId);
        };
      }
      
      // Cập nhật callState với peer mới
      this.callState.peers = new Map(this.callState.peers);
      console.log('Added peer connection for:', peer.socketId, 'isScreenSharing:', peer.isScreenSharing, 'Total peers:', this.callState.peers.size);

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
      this.callState.peers = new Map(this.callState.peers);
      console.log('Removed peer:', socketId, 'Remaining peers:', this.callState.peers.size);
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
   * Get remote streams with peer info
   */
  getRemoteStreams(): Array<{ stream: MediaStream; peer: Peer }> {
    return Array.from(this.callState.peers.values())
      .filter(peer => peer.stream)
      .map(peer => ({ stream: peer.stream!, peer }));
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      } as any);

      this.callState.screenStream = screenStream;
      this.callState.isScreenSharing = true;

      screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      const promises: Promise<void>[] = [];
      this.callState.peers.forEach(peer => {
        if (peer.peerConnection) {
          const promise = (async () => {
            screenStream.getTracks().forEach(track => {
              peer.peerConnection!.addTrack(track, screenStream);
              console.log('Added screen share track to peer:', peer.socketId);
            });
            
            const offer = await peer.peerConnection!.createOffer();
            await peer.peerConnection!.setLocalDescription(offer);
            
            this.socket?.emit('offer', {
              offer,
              to: peer.socketId
            });
          })();
          promises.push(promise);
        }
      });

      await Promise.all(promises);

      if (this.callState.roomId) {
        this.socket?.emit('screen-share-start', {
          roomId: this.callState.roomId,
          socketId: this.socket?.id
        });
      }

      this.updateCallState();
      console.log('Screen sharing started successfully');
    } catch (error: any) {
      console.error('Error starting screen share:', error);
      this.errorSubject.next('Không thể chia sẻ màn hình');
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(): void {
    if (this.callState.screenStream) {
      this.callState.screenStream.getTracks().forEach(track => track.stop());

      const promises: Promise<void>[] = [];
      this.callState.peers.forEach(peer => {
        if (peer.peerConnection) {
          const promise = (async () => {
            const senders = peer.peerConnection!.getSenders();
            senders.forEach(sender => {
              if (sender.track && this.callState.screenStream?.getTracks().includes(sender.track)) {
                peer.peerConnection!.removeTrack(sender);
              }
            });
            
            try {
              const offer = await peer.peerConnection!.createOffer();
              await peer.peerConnection!.setLocalDescription(offer);
              
              this.socket?.emit('offer', {
                offer,
                to: peer.socketId
              });
            } catch (error) {
              console.error('Error renegotiating after screen share stop:', error);
            }
          })();
          promises.push(promise);
        }
      });

      Promise.all(promises);

      this.callState.screenStream = null;
      this.callState.isScreenSharing = false;

      if (this.callState.roomId) {
        this.socket?.emit('screen-share-stop', {
          roomId: this.callState.roomId,
          socketId: this.socket?.id
        });
      }

      this.updateCallState();
      console.log('Screen sharing stopped');
    }
  }

  /**
   * Setup data channel for chat messages
   */
  private setupDataChannel(dataChannel: RTCDataChannel, peer: Peer): void {
    dataChannel.onopen = () => {
      console.log('Data channel opened with:', peer.socketId);
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed with:', peer.socketId);
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error with', peer.socketId, error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        console.log('Received message from', peer.socketId, message);
        this.messageSubject.next(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  /**
   * Send chat message to all peers
   */
  sendChatMessage(message: string, userId: string, userName: string): void {
    const chatMessage: ChatMessage = {
      userId,
      userName,
      message,
      timestamp: Date.now()
    };

    const messageStr = JSON.stringify(chatMessage);
    let sentCount = 0;

    this.callState.peers.forEach(peer => {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        try {
          peer.dataChannel.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error('Error sending message to', peer.socketId, error);
        }
      }
    });

    console.log(`Sent message to ${sentCount} peers`);
  }

  /**
   * Update call state and notify subscribers
   */
  private updateCallState(): void {
    this.callStateSubject.next({ ...this.callState });
  }
}
