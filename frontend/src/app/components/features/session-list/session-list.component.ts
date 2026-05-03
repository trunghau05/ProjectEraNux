import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SessionDetail } from '../../../apis';
import { SessionListStore } from '../../../stores/session.store';
import { UserService } from '../../../services/user.service';

interface SessionGroup {
  label: string;
  sessions: SessionDetail[];
}

@Component({
  selector: 'app-session-list',
  imports: [CommonModule, MatIconModule],
  templateUrl: './session-list.component.html',
  styleUrl: './session-list.component.scss',
})
export class SessionListComponent implements OnInit {
  @Output() sessionSelected = new EventEmitter<Date>();

  readonly sessionStore = inject(SessionListStore);
  readonly userService = inject(UserService);

  readonly sessions = this.sessionStore.sessions;
  readonly isLoading = this.sessionStore.isLoading;
  readonly errorMessage = this.sessionStore.errorMessage;
  readonly user = this.userService.user;

  readonly sessionsByDate = computed<SessionGroup[]>(() => {
    // Sort sessions newest-first before grouping
    const sorted = [...this.sessions()].sort(
      (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
    );
    // Accumulate sessions into a Map keyed by YYYY-MM-DD date string
    const map = new Map<string, SessionDetail[]>();
    sorted.forEach(s => {
      const key = this.toDateKey(s.start_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    // Convert each map entry into a group with a human-readable label
    return Array.from(map.entries()).map(([key, list]) => ({
      label: this.toDateLabel(key),
      sessions: list,
    }));
  });

  ngOnInit(): void {
    // Trigger the initial session load from the store
    this.sessionStore.loadSessionList();
  }

  statusIcon(status: string | undefined): string {
    // Map each session status to a corresponding Material icon name
    switch (status) {
      case 'ongoing':  return 'play_circle';
      case 'upcoming': return 'schedule';
      case 'finished': return 'check_circle';
      case 'cancelled': return 'cancel';
      default: return 'help_outline';
    }
  }

  getSessionTitle(session: SessionDetail): string {
    // Show the class subject name for class sessions; fall back to 'Private Session'
    const s = session as any;
    return s.class_obj?.subject?.name ?? 'Private Session';
  }

  getPersonName(session: SessionDetail): string {
    // Students see the teacher name; all other roles see the student name
    const s = session as any;
    const role = this.user().role;
    if (role === 'student') return s.teacher?.name ?? '';
    return s.student?.name ?? '';
  }

  getPersonAvatar(session: SessionDetail): string | null {
    // Mirror the same role-based logic for the avatar image URL
    const s = session as any;
    const role = this.user().role;
    if (role === 'student') return s.teacher?.img ?? null;
    return s.student?.img ?? null;
  }

  selectSession(session: SessionDetail): void {
    // Emit the session start time so the parent can scroll the calendar to that date
    this.sessionSelected.emit(new Date(session.start_at));
  }

  formatTime(dateStr: string): string {
    // Format the date string to HH:mm using 12-hour US locale
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  private toDateKey(dateValue: string | Date): string {
    // Build a zero-padded YYYY-MM-DD string for local date comparisons
    const d = new Date(dateValue);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toDateLabel(key: string): string {
    // Humanise the date key: 'Today', 'Yesterday', or a formatted date string
    const today = this.toDateKey(new Date());
    const yesterday = this.toDateKey(new Date(Date.now() - 86400000));
    if (key === today) return 'Today';
    if (key === yesterday) return 'Yesterday';
    const d = new Date(key + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
