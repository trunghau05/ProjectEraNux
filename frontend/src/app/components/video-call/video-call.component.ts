import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { WebrtcService, CallState } from '../../services/webrtc.service';
import { UserService } from '../../services/user.service';
import { StudentsService, TeachersService } from '../../apis';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideosContainer') remoteVideosContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('previewVideo') previewVideo!: ElementRef<HTMLVideoElement>;

  roomId: string = '';
  userId: string = '';
  userName: string = '';
  
  // Preview states before joining
  previewStream: MediaStream | null = null;
  isPreviewVideoEnabled: boolean = true;
  isPreviewAudioEnabled: boolean = true;
  
  callState: CallState | null = null;
  errorMessage = '';
  callDuration = 0;
  callDurationDisplay = '00:00';
  private callTimerInterval: any = null;

  private destroy$ = new Subject<void>();
  private remoteVideoElements = new Map<string, HTMLDivElement>();
  private screenVideoElements = new Map<string, HTMLVideoElement>();
  private previousScreenSharingState = false;
  private containerCheckScheduled = false;
  private userService = inject(UserService);
  private studentService = inject(StudentsService);
  private teacherService = inject(TeachersService);
  private visibilityHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;

  constructor(
    private webrtcService: WebrtcService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewChecked(): void {
    // Check if screen sharing state changed (layout switch)
    const currentScreenSharingState = this.isAnyoneScreenSharing();
    
    if (currentScreenSharingState !== this.previousScreenSharingState) {
      console.log('Screen sharing state changed:', this.previousScreenSharingState, '->', currentScreenSharingState);
      this.previousScreenSharingState = currentScreenSharingState;
      
      // Schedule container check to avoid ExpressionChangedAfterItHasBeenCheckedError
      if (!this.containerCheckScheduled) {
        this.containerCheckScheduled = true;
        setTimeout(() => {
          this.containerCheckScheduled = false;
          this.handleLayoutChange();
        }, 0);
      }
    }
  }

  ngOnInit(): void {
    // Load user info from session
    this.loadUserInfo();

    // Get room ID from route params
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['roomId']) {
        this.roomId = params['roomId'];
      }
    });

    // Initialize preview camera
    this.initializePreview();

    // Subscribe to call state changes
    this.webrtcService.callState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.ngZone.run(() => {
          this.callState = state;
          console.log('Call state updated:', {
            isInCall: state.isInCall,
            peersCount: state.peers.size,
            hasLocalStream: !!state.localStream
          });
          
          // Start timer when call starts
          if (state.isInCall && !this.callTimerInterval) {
            this.startCallTimer();
          }
          
          // Stop timer when call ends
          if (!state.isInCall && this.callTimerInterval) {
            this.stopCallTimer();
          }
          
          this.updateVideoElements();
          this.cdr.markForCheck();
        });
      });

    // Subscribe to errors
    this.webrtcService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error;
      });

    // Handle visibility change to keep videos playing
    this.visibilityHandler = () => {
      if (!document.hidden && this.callState?.isInCall) {
        console.log('Tab visible again, resuming videos');
        this.ngZone.run(() => {
          setTimeout(() => {
            this.refreshAllVideos();
            this.cdr.detectChanges();
          }, 100);
        });
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Handle window focus
    this.focusHandler = () => {
      if (this.callState?.isInCall) {
        console.log('Window focused, resuming videos');
        this.ngZone.run(() => {
          setTimeout(() => {
            this.refreshAllVideos();
            this.cdr.detectChanges();
          }, 100);
        });
      }
    };
    window.addEventListener('focus', this.focusHandler);
  }

  ngOnDestroy(): void {
    // Remove event listeners
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
    }
    
    // Stop timer
    this.stopCallTimer();
    
    // Cleanup preview stream
    this.cleanupPreview();
    
    this.destroy$.next();
    this.destroy$.complete();
    this.endCall();
  }

  /**
   * Load user info from session
   */
  private loadUserInfo(): void {
    const user = this.userService.getUser();
    
    // Check if user is logged in
    if (!user || !user.id || user.id === 0) {
      console.error('No user found in session');
      this.errorMessage = 'Vui lòng đăng nhập để sử dụng video call';
      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      return;
    }

    // Set user data immediately from session
    this.userId = user.id.toString();
    this.userName = `User ${user.id}`; // Default fallback
    const role = (user.role || '').toLowerCase().trim();

    console.log('User info loaded:', { userId: this.userId, userName: this.userName, role });

    // Fetch full name from API in background (optional)
    if (role === 'student') {
      this.studentService.studentsRetrieve(user.id).subscribe({
        next: (student) => {
          this.userName = student.name;
          console.log('Student name updated:', this.userName);
        },
        error: (err) => {
          console.error('Failed to fetch student info:', err);
        }
      });
    } else if (role === 'teacher' || role === 'tutor') {
      this.teacherService.teachersRetrieve(user.id).subscribe({
        next: (teacher) => {
          this.userName = teacher.name;
          console.log('Teacher name updated:', this.userName);
        },
        error: (err) => {
          console.error('Failed to fetch teacher info:', err);
        }
      });
    }
  }

  /**
   * Generate random room ID
   */
  generateRoomId(): void {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    this.roomId = `${timestamp}-${randomStr}`;
  }

  /**
   * Start the video call
   */
  async startCall(): Promise<void> {
    if (!this.roomId) {
      this.errorMessage = 'Vui lòng nhập mã phòng hoặc tạo phòng mới';
      return;
    }

    if (!this.userId) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.';
      return;
    }

    try {
      this.errorMessage = '';
      console.log('Starting call with:', { roomId: this.roomId, userId: this.userId, userName: this.userName });

      // Save preview states before starting call
      const previewVideoEnabled = this.isPreviewVideoEnabled;
      const previewAudioEnabled = this.isPreviewAudioEnabled;

      // Cleanup preview stream before starting call
      this.cleanupPreview();

      await this.webrtcService.startCall(this.roomId, this.userId, this.userName);
      
      console.log('Call started successfully');
      
      // Set local video stream immediately
      const localStream = this.webrtcService.getLocalStream();
      if (localStream && this.localVideo) {
        this.localVideo.nativeElement.srcObject = localStream;
        console.log('Local video stream set');
      }

      // Apply preview states to the call
      if (!previewVideoEnabled && this.callState?.isVideoEnabled) {
        this.toggleVideo();
      }
      if (!previewAudioEnabled && this.callState?.isAudioEnabled) {
        this.toggleAudio();
      }
      
    } catch (error: any) {
      this.errorMessage = error.message || 'Không thể khởi động cuộc gọi';
      console.error('Start call error:', error);
      
      // If it's a permission error, show a more helpful message
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.errorMessage = 'Vui lòng cho phép truy cập camera và microphone';
      }
    }
  }

  /**
   * Start call timer
   */
  private startCallTimer(): void {
    this.callDuration = 0;
    this.ngZone.runOutsideAngular(() => {
      this.callTimerInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.callDuration++;
          const minutes = Math.floor(this.callDuration / 60);
          const seconds = this.callDuration % 60;
          this.callDurationDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          this.cdr.markForCheck();
        });
      }, 1000);
    });
  }

  /**
   * Stop call timer
   */
  private stopCallTimer(): void {
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
      this.callTimerInterval = null;
      this.callDuration = 0;
      this.callDurationDisplay = '00:00';
    }
  }

  /**
   * End the video call
   */
  endCall(): void {
    this.webrtcService.endCall();
    this.remoteVideoElements.clear();
  }

  /**
   * Toggle video on/off
   */
  toggleVideo(): void {
    this.webrtcService.toggleVideo();
  }

  /**
   * Toggle audio on/off
   */
  toggleAudio(): void {
    this.webrtcService.toggleAudio();
  }

  /**
   * Toggle screen sharing
   */
  async toggleScreenShare(): Promise<void> {
    if (this.callState?.isScreenSharing) {
      this.webrtcService.stopScreenShare();
    } else {
      try {
        await this.webrtcService.startScreenShare();
      } catch (error) {
        console.error('Failed to start screen share:', error);
      }
    }
  }

  /**
   * Check if anyone is sharing screen
   */
  isAnyoneScreenSharing(): boolean {
    if (this.callState?.isScreenSharing) return true;
    return Array.from(this.callState?.peers.values() || []).some(peer => peer.isScreenSharing);
  }

  /**
   * Get the screen sharing stream (local or remote)
   */
  getScreenSharingStream(): MediaStream | null {
    // First check if local user is sharing
    if (this.callState?.screenStream) {
      console.log('Returning LOCAL screen stream, tracks:', this.callState.screenStream.getTracks().length);
      this.callState.screenStream.getTracks().forEach(track => {
        console.log('  - Track:', track.kind, track.label, 'enabled:', track.enabled);
      });
      return this.callState.screenStream;
    }
    // Then check if any remote peer is sharing
    const screenSharingPeer = Array.from(this.callState?.peers.values() || []).find(peer => peer.isScreenSharing && peer.screenStream);
    if (screenSharingPeer?.screenStream) {
      console.log('Found remote screen share from peer:', screenSharingPeer.socketId);
      screenSharingPeer.screenStream.getTracks().forEach(track => {
        console.log('  - Track:', track.kind, track.label, 'enabled:', track.enabled);
      });
      return screenSharingPeer.screenStream;
    }
    console.log('No screen sharing stream found');
    return null;
  }

  /**
   * Handle layout change when screen sharing starts/stops
   */
  private handleLayoutChange(): void {
    console.log('Handling layout change - clearing and recreating video elements');
    
    // Clear all existing video elements
    this.remoteVideoElements.forEach((videoElement) => {
      if (videoElement.parentNode) {
        videoElement.remove();
      }
    });
    this.remoteVideoElements.clear();
    
    // Force recreate all video elements in new layout
    setTimeout(() => {
      this.updateVideoElements();
    }, 50);
  }

  /**
   * Update remote video elements
   */
  private updateVideoElements(): void {
    if (!this.callState || !this.remoteVideosContainer) {
      console.log('Cannot update video elements:', {
        hasCallState: !!this.callState,
        hasContainer: !!this.remoteVideosContainer
      });
      return;
    }

    const container = this.remoteVideosContainer.nativeElement;
    if (!container) {
      console.log('Container element not available');
      return;
    }

    const remoteStreams = this.webrtcService.getRemoteStreams();
    console.log('Updating video elements, stream count:', remoteStreams.length, 'in layout:', this.isAnyoneScreenSharing() ? 'screen-share' : 'normal');
    
    // Remove video elements for disconnected peers or wrong container
    const currentStreamIds = new Set(remoteStreams.map(s => s.stream.id));
    this.remoteVideoElements.forEach((wrapperElement, streamId) => {
      if (!currentStreamIds.has(streamId) || !container.contains(wrapperElement)) {
        console.log('Removing video element for stream:', streamId);
        if (wrapperElement.parentNode) {
          wrapperElement.remove();
        }
        this.remoteVideoElements.delete(streamId);
      }
    });

    // Add video elements for new peers only
    remoteStreams.forEach(({ stream, peer }) => {
      const existingElement = this.remoteVideoElements.get(stream.id);
      const needsNewElement = !existingElement || !container.contains(existingElement);
      
      if (needsNewElement) {
        console.log('Creating NEW video element for stream:', stream.id, 'user:', peer.userName);
        
        if (existingElement) {
          if (existingElement.parentNode) {
            existingElement.remove();
          }
          this.remoteVideoElements.delete(stream.id);
        }
        
        // Create wrapper div
        const wrapperDiv = document.createElement('div');
        const isScreenShareLayout = this.isAnyoneScreenSharing();
        
        if (isScreenShareLayout) {
          wrapperDiv.className = 'remote-video-item';
        } else {
          wrapperDiv.className = 'remote-video-wrapper';
        }
        
        wrapperDiv.style.position = 'relative';
        wrapperDiv.style.width = '100%';
        wrapperDiv.style.aspectRatio = '16/9';
        wrapperDiv.style.borderRadius = isScreenShareLayout ? '6px' : '8px';
        wrapperDiv.style.overflow = 'hidden';
        wrapperDiv.style.background = '#000';
        
        // Create video element
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = false;
        videoElement.className = 'remote-video';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        videoElement.style.transform = 'scaleX(-1)';
        videoElement.srcObject = stream;
        
        // Create name label (without icon)
        const nameLabel = document.createElement('span');
        nameLabel.className = 'participant-name';
        nameLabel.style.position = 'absolute';
        nameLabel.style.bottom = isScreenShareLayout ? '6px' : '10px';
        nameLabel.style.left = isScreenShareLayout ? '6px' : '10px';
        nameLabel.style.background = 'rgba(0, 0, 0, 0.75)';
        nameLabel.style.color = '#fff';
        nameLabel.style.padding = isScreenShareLayout ? '3px 10px' : '4px 12px';
        nameLabel.style.borderRadius = isScreenShareLayout ? '10px' : '12px';
        nameLabel.style.fontSize = isScreenShareLayout ? '10px' : '11px';
        nameLabel.style.fontWeight = '500';
        nameLabel.textContent = peer.userName || 'User';
        
        // Create video status indicator (camera off)
        const videoStatus = document.createElement('div');
        videoStatus.className = 'video-status';
        videoStatus.style.position = 'absolute';
        videoStatus.style.top = isScreenShareLayout ? '6px' : '10px';
        videoStatus.style.right = isScreenShareLayout ? '6px' : '10px';
        videoStatus.style.background = 'rgba(211, 47, 47, 0.9)';
        videoStatus.style.color = '#fff';
        videoStatus.style.padding = isScreenShareLayout ? '4px' : '6px';
        videoStatus.style.borderRadius = '50%';
        videoStatus.style.display = (peer.isVideoEnabled === false) ? 'flex' : 'none';
        videoStatus.style.alignItems = 'center';
        videoStatus.style.justifyContent = 'center';
        
        const videoIcon = document.createElement('span');
        videoIcon.className = 'material-icons';
        videoIcon.style.fontSize = isScreenShareLayout ? '14px' : '16px';
        videoIcon.style.width = isScreenShareLayout ? '14px' : '16px';
        videoIcon.style.height = isScreenShareLayout ? '14px' : '16px';
        videoIcon.textContent = 'videocam_off';
        videoStatus.appendChild(videoIcon);
        
        // Create mic status indicator (mic off)
        const micStatus = document.createElement('div');
        micStatus.className = 'mic-status';
        micStatus.style.position = 'absolute';
        micStatus.style.top = isScreenShareLayout ? '6px' : '10px';
        // Position based on if video icon is shown
        const rightOffset = (peer.isVideoEnabled === false) 
          ? (isScreenShareLayout ? '40px' : '50px') 
          : (isScreenShareLayout ? '6px' : '10px');
        micStatus.style.right = rightOffset;
        micStatus.style.background = 'rgba(211, 47, 47, 0.9)';
        micStatus.style.color = '#fff';
        micStatus.style.padding = isScreenShareLayout ? '4px' : '6px';
        micStatus.style.borderRadius = '50%';
        micStatus.style.display = (peer.isAudioEnabled === false) ? 'flex' : 'none';
        micStatus.style.alignItems = 'center';
        micStatus.style.justifyContent = 'center';
        
        // Create icon using Material Icons font
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.style.fontSize = isScreenShareLayout ? '14px' : '16px';
        icon.style.width = isScreenShareLayout ? '14px' : '16px';
        icon.style.height = isScreenShareLayout ? '14px' : '16px';
        icon.textContent = 'mic_off';
        micStatus.appendChild(icon);
        
        wrapperDiv.appendChild(videoElement);
        wrapperDiv.appendChild(nameLabel);
        wrapperDiv.appendChild(videoStatus);
        wrapperDiv.appendChild(micStatus);
        container.appendChild(wrapperDiv);
        this.remoteVideoElements.set(stream.id, wrapperDiv);
        
        setTimeout(() => {
          videoElement.play().catch((err: any) => {
            console.error('Error playing remote video:', err);
          });
        }, 100);
        
        console.log('Remote video element created and playing');
      } else {
        const wrapperElement = this.remoteVideoElements.get(stream.id);
        if (wrapperElement) {
          const videoElement = wrapperElement.querySelector('video') as HTMLVideoElement;
          if (videoElement) {
            if (videoElement.srcObject !== stream) {
              console.log('Updating srcObject for existing video element:', stream.id);
              videoElement.srcObject = stream;
            }
            if (videoElement.paused) {
              videoElement.play().catch((err: any) => {
                console.error('Error resuming video:', err);
              });
            }
          }
          
          // Update video status for existing video
          const videoStatusElement = wrapperElement.querySelector('.video-status') as HTMLDivElement;
          if (videoStatusElement) {
            videoStatusElement.style.display = (peer.isVideoEnabled === false) ? 'flex' : 'none';
          }
          
          // Update mic status for existing video
          const micStatusElement = wrapperElement.querySelector('.mic-status') as HTMLDivElement;
          if (micStatusElement) {
            micStatusElement.style.display = (peer.isAudioEnabled === false) ? 'flex' : 'none';
            // Update position based on video status
            const isScreenShareLayout = this.isAnyoneScreenSharing();
            const rightOffset = (peer.isVideoEnabled === false) 
              ? (isScreenShareLayout ? '40px' : '50px') 
              : (isScreenShareLayout ? '6px' : '10px');
            micStatusElement.style.right = rightOffset;
          }
        }
      }
    });
  }

  /**
   * Refresh all video elements (called when tab becomes visible)
   */
  private refreshAllVideos(): void {
    console.log('Refreshing all videos...');
    
    // Refresh local video
    const localStream = this.webrtcService.getLocalStream();
    if (localStream && this.localVideo?.nativeElement) {
      const localVideoEl = this.localVideo.nativeElement;
      if (!localVideoEl.srcObject || localVideoEl.paused) {
        localVideoEl.srcObject = localStream;
        localVideoEl.play().catch(err => {
          console.error('Error playing local video:', err);
        });
      }
    }

    // Refresh all remote videos with force reset
    const remoteStreams = this.webrtcService.getRemoteStreams();
    console.log('Refreshing remote videos, count:', remoteStreams.length);
    
    remoteStreams.forEach(({ stream }) => {
      const wrapperElement = this.remoteVideoElements.get(stream.id);
      if (wrapperElement) {
        const videoElement = wrapperElement.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          console.log('Refreshing remote video:', stream.id);
          const currentSrc = videoElement.srcObject;
          if (!currentSrc || currentSrc !== stream) {
            videoElement.srcObject = stream;
          }
          videoElement.play().catch((err: any) => {
            console.error('Error playing remote video:', stream.id, err);
          });
        }
      }
    });
  }

  /**
   * Copy room link to clipboard
   */
  copyRoomLink(): void {
    const link = `${window.location.origin}/video-call/${this.roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Đã copy link phòng!');
    });
  }

  /**
   * Get participant count
   */
  getParticipantCount(): number {
    return this.callState ? this.callState.peers.size + 1 : 1;
  }

  /**
   * Initialize preview camera before joining call
   */
  private async initializePreview(): Promise<void> {
    try {
      this.previewStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Wait for view to be ready
      setTimeout(() => {
        if (this.previewVideo?.nativeElement && this.previewStream) {
          this.previewVideo.nativeElement.srcObject = this.previewStream;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to initialize preview:', error);
      this.errorMessage = 'Không thể truy cập camera/microphone';
    }
  }

  /**
   * Toggle preview video
   */
  togglePreviewVideo(): void {
    if (this.previewStream) {
      const videoTrack = this.previewStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isPreviewVideoEnabled = videoTrack.enabled;
      }
    }
  }

  /**
   * Toggle preview audio
   */
  togglePreviewAudio(): void {
    if (this.previewStream) {
      const audioTrack = this.previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isPreviewAudioEnabled = audioTrack.enabled;
      }
    }
  }

  /**
   * Cleanup preview stream
   */
  private cleanupPreview(): void {
    if (this.previewStream) {
      this.previewStream.getTracks().forEach(track => track.stop());
      this.previewStream = null;
    }
  }
}
