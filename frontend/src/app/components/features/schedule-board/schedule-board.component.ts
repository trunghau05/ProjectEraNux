import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, effect, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SessionDetail } from '../../../apis';
import { SessionListStore } from '../../../stores/session.store';

export interface SessionByDate {
  date: string;
  displayDate: string;
  sessions: SessionDetail[];
}

type SessionJoinState = 'ongoing' | 'upcoming' | 'finished';

@Component({
  selector: 'app-schedule-board',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './schedule-board.component.html',
  styleUrls: ['./schedule-board.component.scss']
})
export class ScheduleBoardComponent implements OnInit {
  private sessionListStore = inject(SessionListStore);

  readonly user = this.sessionListStore.user;
  readonly sessions = this.sessionListStore.sessions;

  @Input() joiningSessionId: number | null = null;

  @Output() joinSession = new EventEmitter<SessionDetail>();

  selectedWeekDate = new Date();
  selectedWeekDateValue = this.toLocalDateKey(new Date());
  sessionsByDate: SessionByDate[] = [];

  constructor() {
    // Keep the grouped schedule in sync with the role-scoped sessions from store.
    effect(() => {
      this.sessions();
      this.user();
      this.applyWeekFilter();
    });
  }

  ngOnInit(): void {
    this.sessionListStore.loadSessionList();
    this.applyWeekFilter();
  }

  get selectedWeekDisplay(): string {
    // Build a human-readable "Mon DD, YYYY – Mon DD, YYYY" range for the current week
    const { start, end } = this.getWeekRange(this.selectedWeekDate);

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };

    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  }

  openWeekPicker(input: HTMLInputElement): void {
    // Programmatically open the native date picker; fall back to focus+click
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };

    if (pickerInput.showPicker) {
      pickerInput.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  onWeekDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (!target.value) {
      return;
    }

    // Delegate the rest of the update to the shared helper
    this.updateSelectedWeekByDateValue(target.value);
  }

  handleJoinSession(session: SessionDetail): void {
    // Guard: only emit if the session is joinable and not already joining
    if (!this.isSessionJoinable(session) || this.isJoiningSession(session)) {
      return;
    }

    this.joinSession.emit(session);
  }

  isSessionJoinable(session: SessionDetail): boolean {
    // Only 'ongoing' sessions can be joined
    return this.getSessionJoinState(session) === 'ongoing';
  }

  isJoiningSession(session: SessionDetail): boolean {
    // True when a join request for this session is in progress
    return this.joiningSessionId === session.id;
  }

  getSessionJoinButtonText(session: SessionDetail): string {
    // Surface the join state in the button label so the user knows the session status
    const joinState = this.getSessionJoinState(session);

    if (joinState === 'ongoing') {
      return 'Join - Ongoing';
    }

    if (joinState === 'upcoming') {
      return 'Join - Upcoming';
    }

    return 'Join - Finished';
  }

  getStatusColor(session: SessionDetail): string {
    // Return a distinct background colour for each join state
    const state = this.getSessionJoinState(session);
    if (state === 'ongoing') {
      return '#10b981';
    }
    if (state === 'upcoming') {
      return '#514fe3';
    }
    return '#dcdcdc';
  }

  getStatusTextColor(session: SessionDetail): string {
    // Use a darker text colour for finished/grey backgrounds to maintain contrast
    const state = this.getSessionJoinState(session);
    if (state === 'finished') {
      return '#374151';
    }
    return '#e5e7eb';
  }

  getSessionHeadline(session: SessionDetail): string {
    // Build a descriptive "Subject/Student - Teacher" headline for the session card
    const studentName = (session as SessionDetail & { student?: { name?: string } | null }).student?.name;
    const teacherName = (session as SessionDetail & { teacher?: { name?: string } | null }).teacher?.name;
    const classSubjectName = (session as SessionDetail & {
      class_obj?: { subject?: { name?: string } | null; id?: number } | null;
    }).class_obj?.subject?.name;
    const classId = (session as SessionDetail & { class_obj?: { id?: number } | null }).class_obj?.id;

    const leftLabel = studentName || classSubjectName || (classId ? `Class #${classId}` : 'Private session');
    const rightLabel = teacherName || 'Unknown teacher';

    return `${leftLabel} - ${rightLabel}`;
  }

  private updateSelectedWeekByDateValue(dateValue: string): void {
    if (!dateValue) {
      return;
    }

    // Parse the date-input value (YYYY-MM-DD) into a local Date
    const pickedDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(pickedDate.getTime())) {
      return;
    }

    this.selectedWeekDate = pickedDate;
    this.selectedWeekDateValue = dateValue;
    this.applyWeekFilter();
  }

  private getWeekRange(anchorDate: Date): { start: Date; end: Date } {
    // Calculate Monday-to-Sunday week boundaries for the given date
    const date = new Date(anchorDate);
    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
    // Offset to Monday (Sunday = 0 needs -6, all others use 1 - day)
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(date);
    start.setDate(date.getDate() + diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start, end };
  }

  private applyWeekFilter(): void {
    const { start, end } = this.getWeekRange(this.selectedWeekDate);
    const weekStartKey = this.toLocalDateKey(start);
    const weekEndKey = this.toLocalDateKey(end);
    const sessions = this.getSessionsByRole();

    // Keep only sessions whose date key falls within the selected week
    const sessionsInWeek = sessions.filter((session) => {
      const sessionDateKey = this.toLocalDateKey(session.start_at);
      return sessionDateKey >= weekStartKey && sessionDateKey <= weekEndKey;
    });

    this.sessionsByDate = this.groupSessionsByDate(sessionsInWeek);
  }

  private parseDateKey(dateKey: string): Date {
    // Parse YYYY-MM-DD into a local Date without timezone shifts
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private groupSessionsByDate(sessions: SessionDetail[]): SessionByDate[] {
    // Group sessions into a Map keyed by local date string
    const map = new Map<string, SessionDetail[]>();

    sessions.forEach((session) => {
      const start = new Date(session.start_at);
      const key = this.toLocalDateKey(start);

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(session);
    });

    // Sort day buckets chronologically and sort sessions within each day by start time
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, groupedSessions]) => ({
        date,
        displayDate: this.parseDateKey(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        sessions: groupedSessions.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      }));
  }

  private getSessionsByRole(): SessionDetail[] {
    const currentUser = this.user();

    if (!currentUser?.id || !currentUser?.role) {
      return [];
    }

    // SessionListStore already loads role-specific sessions, so this is a safe role gate.
    if (currentUser.role === 'student' || currentUser.role === 'teacher' || currentUser.role === 'tutor') {
      return this.sessions();
    }

    return [];
  }

  private toLocalDateKey(dateValue: string | Date): string {
    // Produce a zero-padded YYYY-MM-DD key using local time (no UTC shift)
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getSessionJoinState(session: SessionDetail): SessionJoinState {
    // Treat finished and cancelled as the same end state
    if (session.status === 'finished' || session.status === 'cancelled') {
      return 'finished';
    }

    const todayKey = this.toLocalDateKey(new Date());
    const startDateKey = this.toLocalDateKey(session.start_at);

    // A session whose start date matches today is considered ongoing
    if (todayKey === startDateKey) {
      return 'ongoing';
    }

    // Start date is in the future
    if (todayKey < startDateKey) {
      return 'upcoming';
    }

    // Start date is in the past without a finished/cancelled status
    return 'finished';
  }
}
