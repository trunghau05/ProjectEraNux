import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClassDetail, SessionDetail, Teacher } from '../../../apis';
import { SessionListStore } from '../../../stores/session.store';
import { SttService } from '../../../services/stt.service';

export interface CourseDetailContext {
  type: 'booking' | 'class';
  teacher?: Teacher;
  classItem?: ClassDetail;
  studentId?: number;
}

interface SessionViewModel {
  session: SessionDetail;
  label: string;
  index: number;
  expanded: boolean;
  summaryLoading: boolean;
  summaryText: string | null;
  summaryError: string | null;
}

@Component({
  selector: 'app-course-detail',
  imports: [CommonModule],
  styles: `
    .detail-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .detail-panel { background: #f8f7fc; border-radius: 16px; width: 100%; max-width: 720px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(107,70,193,0.18); }
    .detail-header { padding: 20px 24px 16px; background: white; border-bottom: 1px solid #f1f1f1; display: flex; align-items: center; gap: 14px; }
    .detail-icon { width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: white; flex-shrink: 0; }
    .detail-title-group { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .detail-title { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .detail-subtitle { font-size: 11px; color: #9a9ab0; }
    .close-btn { width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f0f8; cursor: pointer; font-size: 16px; color: #6b46c1; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; }
    .close-btn:hover { background: #ede9f8; }

    .detail-body { overflow-y: auto; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .detail-body::-webkit-scrollbar { width: 6px; }
    .detail-body::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 6px; }

    .state-box { padding: 20px; border-radius: 12px; background: white; text-align: center; display: flex; flex-direction: column; gap: 6px; align-items: center; }
    .state-title { font-size: 13px; font-weight: 600; }
    .state-text { font-size: 11px; color: #7a7a7a; }

    .session-item { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #ede9f8; transition: box-shadow 0.2s; }
    .session-item:hover { box-shadow: 0 4px 16px rgba(107,70,193,0.10); }
    .session-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; user-select: none; }
    .session-number { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
    .session-meta { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .session-label { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .session-time { font-size: 10px; color: #9a9ab0; }
    .session-date-chip { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; color: #111827; background: #e5e7eb; white-space: nowrap; }
    .session-status { padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: 600; color: white; }
    .status-upcoming { background: #6b46c1; }
    .status-ongoing { background: #d97706; }
    .status-finished { background: #2563eb; }
    .status-cancelled { background: #dc2626; }
    .session-chevron { font-size: 12px; color: #000000; transition: transform 0.25s; flex-shrink: 0; }
    .session-chevron.expanded { transform: rotate(180deg); }

    .session-body { overflow: hidden; transition: max-height 0.35s ease; max-height: 0; }
    .session-body.open { max-height: 900px; }
    .session-body-inner { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 14px; border-top: 1px solid #f1f0f8; padding-top: 14px; }

    .video-section { display: flex; flex-direction: column; gap: 8px; }
    .section-label { font-size: 11px; font-weight: 600; color: #6b46c1; text-transform: uppercase; letter-spacing: 0.04em; }
    .video-frame { width: 100%; aspect-ratio: 16/9; border-radius: 10px; border: none; background: #1a1a2e; }
    .no-video { background: #f5f3ff; border-radius: 10px; padding: 20px; text-align: center; font-size: 11px; color: #9a9ab0; }

    .summary-section { display: flex; flex-direction: column; gap: 8px; }
    .summary-actions { display: flex; gap: 8px; }
    .summary-btn { padding: 6px 14px; border-radius: 8px; border: none; background: #6b46c1; color: white; font-size: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .summary-btn:hover { background: #553c9a; }
    .summary-btn:disabled { background: #c4b5fd; cursor: not-allowed; }
    .summary-loading { font-size: 11px; color: #9a9ab0; font-style: italic; }
    .summary-error { font-size: 11px; color: #dc2626; }
    .summary-text { font-size: 12px; line-height: 1.7; color: #374151; background: #f9f7ff; padding: 14px; border-radius: 10px; border-left: 3px solid #6b46c1; white-space: pre-wrap; word-break: break-word; }
  `,
  template: `
    <div class="detail-overlay" (click)="onOverlayClick($event)">
      <div class="detail-panel" (click)="$event.stopPropagation()">
        <div class="detail-header">
          <div class="detail-icon">{{ headerInitial() }}</div>
          <div class="detail-title-group">
            <span class="detail-title">{{ headerTitle() }}</span>
            <span class="detail-subtitle">{{ headerSubtitle() }}</span>
          </div>
          <button class="close-btn" (click)="closed.emit()">✕</button>
        </div>

        <div class="detail-body">
          @if (loading()) {
            <div class="state-box">
              <span class="state-title">Loading sessions</span>
              <span class="state-text">Please wait a moment...</span>
            </div>
          } @else if (errorMsg()) {
            <div class="state-box">
              <span class="state-title">Unable to load data</span>
              <span class="state-text">{{ errorMsg() }}</span>
            </div>
          } @else if (sessions().length === 0) {
            <div class="state-box">
              <span class="state-title">No sessions yet</span>
              <span class="state-text">Sessions will appear here once they are created.</span>
            </div>
          } @else {
            @for (vm of sessions(); track vm.session.id) {
              <div class="session-item">
                <div class="session-header" (click)="toggleSession(vm)">
                  <div class="session-number">{{ vm.index }}</div>
                  <div class="session-meta">
                    <span class="session-label">{{ vm.label }}</span>
                    <span class="session-time">{{ formatStatus(vm.session.status) }}</span>
                  </div>
                  <span class="session-date-chip">{{ formatRange(vm.session.start_at, vm.session.end_at) }}</span>
                  <span class="session-chevron" [class.expanded]="vm.expanded">▼</span>
                </div>

                <div class="session-body" [class.open]="vm.expanded">
                  @if (vm.expanded) {
                    <div class="session-body-inner">
                      <div class="video-section">
                        <span class="section-label">Session recording</span>
                        @if (vm.session.recording_url) {
                          <iframe
                            class="video-frame"
                            [src]="getVideoUrl(vm.session.recording_url)"
                            allowfullscreen
                            allow="autoplay; encrypted-media">
                          </iframe>
                        } @else {
                          <div class="no-video">No recording available for this session</div>
                        }
                      </div>

                      <div class="summary-section">
                        <span class="section-label">Session summary</span>
                        @if (!vm.summaryText && !vm.summaryLoading && !vm.summaryError) {
                          <div class="summary-actions">
                            <button class="summary-btn" (click)="loadSummary(vm)" [disabled]="!vm.session.recording_url">
                              Load summary
                            </button>
                            @if (!vm.session.recording_url) {
                              <span class="summary-loading">A recording is required to generate a summary</span>
                            }
                          </div>
                        }
                        @if (vm.summaryLoading) {
                          <span class="summary-loading">Processing audio, please wait...</span>
                        }
                        @if (vm.summaryError) {
                          <span class="summary-error">{{ vm.summaryError }}</span>
                          <div class="summary-actions">
                            <button class="summary-btn" (click)="loadSummary(vm)">Retry</button>
                          </div>
                        }
                        @if (vm.summaryText) {
                          <div class="summary-text">{{ vm.summaryText }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class CourseDetail implements OnInit {
  @Input({ required: true }) context!: CourseDetailContext;
  @Output() closed = new EventEmitter<void>();

  private sessionStore = inject(SessionListStore);
  private sttService = inject(SttService);
  private sanitizer = inject(DomSanitizer);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly sessions = signal<SessionViewModel[]>([]);

  ngOnInit(): void {
    if (this.sessionStore.sessions().length === 0 && !this.sessionStore.isLoading()) {
      this.sessionStore.loadSessionList();
    }
    this.buildSessions();
  }

  headerTitle(): string {
    if (this.context.type === 'booking') {
      return this.context.teacher?.name ?? 'Tutor';
    }
    return this.context.classItem?.subject?.name ?? 'Class';
  }

  headerSubtitle(): string {
    if (this.context.type === 'booking') {
      return '1-on-1 session history';
    }
    const teacher = this.context.classItem?.teacher?.name;
    return teacher ? `Teacher: ${teacher}` : 'Class session history';
  }

  headerInitial(): string {
    const title = this.headerTitle();
    return title.charAt(0).toUpperCase();
  }

  toggleSession(vm: SessionViewModel): void {
    const list = this.sessions();
    const updated = list.map((item) =>
      item.session.id === vm.session.id ? { ...item, expanded: !item.expanded } : item,
    );
    this.sessions.set(updated);
  }

  loadSummary(vm: SessionViewModel): void {
    const audioUrl = vm.session.recording_url; 
        
    if (!audioUrl) return;

    this.updateSession(vm.session.id, { summaryLoading: true, summaryError: null });

    this.sttService.transcribeSummary(audioUrl).subscribe({
      next: (res) => {
        this.updateSession(vm.session.id, { summaryLoading: false, summaryText: res.summary });
      },
      error: (err: { message?: string }) => {
        this.updateSession(vm.session.id, {
          summaryLoading: false,
          summaryError: 'Failed to load summary: ' + (err?.message ?? 'Unknown error'),
        });
      },
    });
  }

  getVideoUrl(url: string): SafeResourceUrl {
    // Build a YouTube embed URL using the provided API key if it looks like a YT watch link,
    // otherwise treat as a direct embed/iframe URL.
    const apiKey = 'AIzaSyBtuf_EaTWWlAbySX4SOt0eRXjVnaRmq0A';
    const ytMatch = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${ytMatch[1]}?key=${apiKey}`,
      );
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  formatRange(start: string, end: string): string {
    const fmt = (v: string) =>
      new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(v));
    return `${fmt(start)} – ${fmt(end)}`;
  }

  formatStatus(status?: string): string {
    const map: Record<string, string> = {
      upcoming: 'Upcoming',
      ongoing: 'Ongoing',
      finished: 'Finished',
      cancelled: 'Cancelled',
    };
    return map[status ?? ''] ?? (status ?? 'Unknown');
  }

  statusClass(status?: string): string {
    return `status-${status ?? 'upcoming'}`;
  }

  private buildSessions(): void {
    // Reactively derive sessions from store whenever it changes
    const run = () => {
      if (this.sessionStore.isLoading()) {
        this.loading.set(true);
        this.errorMsg.set(null);
        // Poll until store finishes loading
        const interval = setInterval(() => {
          if (!this.sessionStore.isLoading()) {
            clearInterval(interval);
            this.deriveAndSetSessions();
          }
        }, 50);
        return;
      }
      this.deriveAndSetSessions();
    };
    run();
  }

  private deriveAndSetSessions(): void {
    const storeError = this.sessionStore.errorMessage();
    if (storeError) {
      this.errorMsg.set(storeError);
      this.loading.set(false);
      return;
    }

    const all = this.sessionStore.sessions();
    const relevant = this.filterRelevant(all);
    const sorted = [...relevant].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    this.sessions.set(
      sorted.map((s, i) => ({
        session: s,
        label: `Session ${i + 1}`,
        index: i + 1,
        expanded: false,
        summaryLoading: false,
        summaryText: null,
        summaryError: null,
      })),
    );
    this.loading.set(false);
  }

  private filterRelevant(sessions: SessionDetail[]): SessionDetail[] {
    if (this.context.type === 'booking') {
      // 1-on-1 tutor sessions: no class_obj, filter by teacher if provided
      const byTeacher = this.context.teacher
        ? sessions.filter((s) => s.teacher?.id === this.context.teacher!.id)
        : sessions;
      // keep only tutor-style sessions (no class attached)
      return byTeacher.filter((s) => !s.class_obj);
    }
    if (this.context.type === 'class' && this.context.classItem) {
      const classId = this.context.classItem.id;
      // For tutor view with a specific student
      if (this.context.studentId !== undefined) {
        return sessions.filter(
          (s) => (s.class_obj as ClassDetail | null)?.id === classId &&
                 s.student?.id === this.context.studentId,
        );
      }
      return sessions.filter((s) => (s.class_obj as ClassDetail | null)?.id === classId);
    }
    return sessions;
  }

  private updateSession(id: number, patch: Partial<SessionViewModel>): void {
    this.sessions.set(this.sessions().map((vm) => (vm.session.id === id ? { ...vm, ...patch } : vm)));
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('detail-overlay')) {
      this.closed.emit();
    }
  }
}
