import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { WebrtcService, CallState } from '../../services/webrtc.service';
import { UserService } from '../../services/user.service';
import { StudentsService, TeachersService } from '../../apis';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideosContainer') remoteVideosContainer!: ElementRef<HTMLDivElement>;

  roomId: string = '';
  userId: string = '';
  userName: string = '';
  
  callState: CallState | null = null;
  isConnecting = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private remoteVideoElements = new Map<string, HTMLVideoElement>();
  private userService = inject(UserService);
  private studentService = inject(StudentsService);
  private teacherService = inject(TeachersService);

  constructor(
    private webrtcService: WebrtcService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load user info from session
    this.loadUserInfo();

    // Get room ID from route params
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['roomId']) {
        this.roomId = params['roomId'];
      }
    });

    // Subscribe to call state changes
    this.webrtcService.callState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.callState = state;
        this.updateVideoElements();
      });

    // Subscribe to errors
    this.webrtcService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error;
        this.isConnecting = false;
      });
  }

  ngOnDestroy(): void {
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
      return;
    }

    // Set user data immediately from session
    this.userId = user.id.toString();
    this.userName = `User ${user.id}`; // Default fallback
    const role = (user.role || '').toLowerCase().trim();

    // Fetch full name from API in background (optional)
    if (role === 'student') {
      this.studentService.studentsRetrieve(user.id).subscribe({
        next: (student) => {
          this.userName = student.name;
        },
        error: (err) => {
          console.error('Failed to fetch student info:', err);
        }
      });
    } else if (role === 'teacher' || role === 'tutor') {
      this.teacherService.teachersRetrieve(user.id).subscribe({
        next: (teacher) => {
          this.userName = teacher.name;
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

    if (!this.userId || !this.userName) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.';
      return;
    }

    try {
      this.isConnecting = true;
      this.errorMessage = '';

      await this.webrtcService.startCall(this.roomId, this.userId, this.userName);
      
      // Immediately stop connecting state after successful join
      this.isConnecting = false;
      
      // Wait for local stream and set it
      setTimeout(() => {
        const localStream = this.webrtcService.getLocalStream();
        if (localStream && this.localVideo) {
          this.localVideo.nativeElement.srcObject = localStream;
        }
      }, 100);

    } catch (error: any) {
      this.errorMessage = error.message || 'Không thể khởi động cuộc gọi';
      console.error('Start call error:', error);
      this.isConnecting = false;
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
   * Update remote video elements
   */
  private updateVideoElements(): void {
    if (!this.callState || !this.remoteVideosContainer) return;

    const remoteStreams = this.webrtcService.getRemoteStreams();
    console.log('Updating video elements, stream count:', remoteStreams.length);
    
    // Remove video elements for disconnected peers
    const currentStreamIds = new Set(remoteStreams.map(s => s.id));
    this.remoteVideoElements.forEach((videoElement, streamId) => {
      if (!currentStreamIds.has(streamId)) {
        console.log('Removing video element for disconnected stream:', streamId);
        videoElement.remove();
        this.remoteVideoElements.delete(streamId);
      }
    });

    // Add video elements for new peers only
    remoteStreams.forEach(stream => {
      if (!this.remoteVideoElements.has(stream.id)) {
        console.log('Creating NEW video element for stream:', stream.id);
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = false;
        videoElement.className = 'remote-video';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        
        // Append to DOM first
        this.remoteVideosContainer.nativeElement.appendChild(videoElement);
        this.remoteVideoElements.set(stream.id, videoElement);
        
        // Set srcObject after element is in DOM
        videoElement.srcObject = stream;
        
        console.log('Remote video element created, tracks:', stream.getTracks().length);
      } else {
        // Update existing element if stream changed
        const existingElement = this.remoteVideoElements.get(stream.id);
        if (existingElement && existingElement.srcObject !== stream) {
          console.log('Updating srcObject for existing video element:', stream.id);
          existingElement.srcObject = stream;
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
}
