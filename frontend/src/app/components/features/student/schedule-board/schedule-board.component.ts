import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SessionDetail } from '../../../../apis';

export interface StudentSessionByDate {
  date: string;
  displayDate: string;
  sessions: SessionDetail[];
}

type SessionJoinState = 'ongoing' | 'upcoming' | 'finished';

@Component({
  selector: 'app-student-schedule-board',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './schedule-board.component.html',
  styleUrls: ['./schedule-board.component.scss']
})
export class StudentScheduleBoardComponent implements OnChanges {
  @Input() sessions: SessionDetail[] = [];
  @Input() joiningSessionId: number | null = null;

  @Output() joinSession = new EventEmitter<SessionDetail>();

  selectedWeekDate = new Date();
  selectedWeekDateValue = this.toLocalDateKey(new Date());
  sessionsByDate: StudentSessionByDate[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sessions']) {
      this.applyWeekFilter();
    }
  }

  get selectedWeekDisplay(): string {
    const { start, end } = this.getWeekRange(this.selectedWeekDate);

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };

    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  }

  openWeekPicker(input: HTMLInputElement): void {
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

    this.updateSelectedWeekByDateValue(target.value);
  }

  handleJoinSession(session: SessionDetail): void {
    if (!this.isSessionJoinable(session) || this.isJoiningSession(session)) {
      return;
    }

    this.joinSession.emit(session);
  }

  getSessionClass(session: SessionDetail): string {
    if (session.class_obj) {
      return 'session-teacher';
    }

    if (session.time_slot) {
      return 'session-tutor';
    }

    return 'session-default';
  }

  isSessionJoinable(session: SessionDetail): boolean {
    return this.getSessionJoinState(session) === 'ongoing';
  }

  isJoiningSession(session: SessionDetail): boolean {
    return this.joiningSessionId === session.id;
  }

  getSessionJoinButtonText(session: SessionDetail): string {
    const joinState = this.getSessionJoinState(session);

    if (joinState === 'ongoing') {
      return 'Join - Ongoing';
    }

    if (joinState === 'upcoming') {
      return 'Join - Upcoming';
    }

    return 'Join - Finished';
  }

  private updateSelectedWeekByDateValue(dateValue: string): void {
    if (!dateValue) {
      return;
    }

    const pickedDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(pickedDate.getTime())) {
      return;
    }

    this.selectedWeekDate = pickedDate;
    this.selectedWeekDateValue = dateValue;
    this.applyWeekFilter();
  }

  private getWeekRange(anchorDate: Date): { start: Date; end: Date } {
    const date = new Date(anchorDate);
    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
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

    const sessionsInWeek = this.sessions.filter((session) => {
      const sessionDateKey = this.toLocalDateKey(session.start_at);
      return sessionDateKey >= weekStartKey && sessionDateKey <= weekEndKey;
    });

    this.sessionsByDate = this.groupSessionsByDate(sessionsInWeek);
  }

  private parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private groupSessionsByDate(sessions: SessionDetail[]): StudentSessionByDate[] {
    const map = new Map<string, SessionDetail[]>();

    sessions.forEach((session) => {
      const start = new Date(session.start_at);
      const key = this.toLocalDateKey(start);

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(session);
    });

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

  private toLocalDateKey(dateValue: string | Date): string {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getSessionJoinState(session: SessionDetail): SessionJoinState {
    if (session.status === 'finished' || session.status === 'cancelled') {
      return 'finished';
    }

    const todayKey = this.toLocalDateKey(new Date());
    const startDateKey = this.toLocalDateKey(session.start_at);

    if (todayKey === startDateKey) {
      return 'ongoing';
    }

    if (todayKey < startDateKey) {
      return 'upcoming';
    }

    return 'finished';
  }
}
