import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClassDetail, SessionDetail } from '../apis';
import { SessionListStore } from '../stores/session.store';
import { SttService } from '../services/stt.service';

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
  selector: 'app-course-detail-page',
  imports: [CommonModule],
  styles: `
    .detail-page { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .detail-page::-webkit-scrollbar { width: 10px; height: 10px; }
    .detail-page::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .detail-page::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }

    .detail-header { padding: 0 0 16px; display: flex; align-items: center; gap: 14px; }
    .detail-title-group { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .detail-title { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .detail-subtitle { font-size: 11px; color: #9a9ab0; }

    .detail-body { display: flex; flex-direction: column; gap: 10px; }
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
    .summary-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .summary-btn { padding: 6px 14px; border-radius: 8px; border: none; background: #6b46c1; color: white; font-size: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .summary-btn:hover { background: #553c9a; }
    .summary-btn:disabled { background: #c4b5fd; cursor: not-allowed; }
    .summary-loading { font-size: 11px; color: #9a9ab0; font-style: italic; }
    .summary-error { font-size: 11px; color: #dc2626; }
    .summary-text { font-size: 12px; line-height: 1.7; color: #374151; background: #f9f7ff; padding: 14px; border-radius: 10px; border-left: 3px solid #6b46c1; white-space: pre-wrap; word-break: break-word; }

    @media (max-width: 768px) {
      .detail-page { padding: 20px; }
      .detail-header { align-items: flex-start; flex-wrap: wrap; }
      .detail-title-group { min-width: 100%; }
    }
  `,
  template: `
    <div class="detail-page">
      <div class="detail-header">
        <div class="detail-title-group">
          <span class="detail-title">{{ headerTitle() }}</span>
          <span class="detail-subtitle">{{ headerSubtitle() }}</span>
        </div>
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
  `,
})
export class CourseDetailPage implements OnInit {
  private sessionStore = inject(SessionListStore);
  private sttService = inject(SttService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly sessions = signal<SessionViewModel[]>([]);

  readonly detailType = signal<'booking' | 'class'>('booking');
  readonly teacherId = signal<number | null>(null);
  readonly classId = signal<number | null>(null);
  readonly studentId = signal<number | null>(null);

  readonly headerTeacherName = signal<string>('');
  readonly headerClassName = signal<string>('');
  readonly headerStudentName = signal<string>('');

  ngOnInit(): void {
    if (this.sessionStore.sessions().length === 0 && !this.sessionStore.isLoading()) {
      this.sessionStore.loadSessionList();
    }

    this.route.queryParamMap.subscribe((params) => {
      this.detailType.set(params.get('type') === 'class' ? 'class' : 'booking');
      this.teacherId.set(this.toInt(params.get('teacherId')));
      this.classId.set(this.toInt(params.get('classId')));
      this.studentId.set(this.toInt(params.get('studentId')));

      this.headerTeacherName.set(params.get('teacherName') ?? '');
      this.headerClassName.set(params.get('className') ?? '');
      this.headerStudentName.set(params.get('studentName') ?? '');

      this.buildSessions();
    });
  }

  headerTitle(): string {
    if (this.detailType() === 'booking') {
      if (this.headerTeacherName()) {
        return this.headerTeacherName();
      }
      if (this.headerStudentName()) {
        return this.headerStudentName();
      }
      return 'Booking detail';
    }

    return this.headerClassName() || 'Class detail';
  }

  headerSubtitle(): string {
    if (this.detailType() === 'booking') {
      if (this.teacherId()) {
        return '1-on-1 session history';
      }
      if (this.studentId()) {
        return 'Student booking session history';
      }
      return 'Session history';
    }

    if (this.headerTeacherName()) {
      return `Teacher: ${this.headerTeacherName()}`;
    }
    return 'Class session history';
  }

  headerInitial(): string {
    const title = this.headerTitle();
    return title.charAt(0).toUpperCase();
  }

  toggleSession(vm: SessionViewModel): void {
    const updated = this.sessions().map((item) =>
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
    if (this.sessionStore.isLoading()) {
      this.loading.set(true);
      this.errorMsg.set(null);

      const interval = setInterval(() => {
        if (!this.sessionStore.isLoading()) {
          clearInterval(interval);
          this.deriveAndSetSessions();
        }
      }, 50);
      return;
    }

    this.deriveAndSetSessions();
  }

  private deriveAndSetSessions(): void {
    const storeError = this.sessionStore.errorMessage();
    if (storeError) {
      this.errorMsg.set(storeError);
      this.loading.set(false);
      return;
    }

    const relevant = this.filterRelevant(this.sessionStore.sessions());
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
    if (this.detailType() === 'booking') {
      return sessions.filter((s) => {
        if (s.class_obj) {
          return false;
        }
        if (this.teacherId() && s.teacher?.id !== this.teacherId()) {
          return false;
        }
        if (this.studentId() && s.student?.id !== this.studentId()) {
          return false;
        }
        return true;
      });
    }

    const classId = this.classId();
    if (!classId) {
      return [];
    }

    return sessions.filter((s) => {
      const isClassMatched = ((s.class_obj as ClassDetail | null)?.id ?? null) === classId;
      if (!isClassMatched) {
        return false;
      }
      if (this.studentId() && s.student?.id !== this.studentId()) {
        return false;
      }
      return true;
    });
  }

  private updateSession(id: number, patch: Partial<SessionViewModel>): void {
    this.sessions.set(this.sessions().map((vm) => (vm.session.id === id ? { ...vm, ...patch } : vm)));
  }

  private toInt(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
