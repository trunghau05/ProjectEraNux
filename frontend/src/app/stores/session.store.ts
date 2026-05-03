import { inject, Injectable, signal } from '@angular/core';
import { SessionDetail, SessionsService, SessionStatusEnum } from '../apis';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class SessionListStore {
  private sessionService = inject(SessionsService);
  private userService = inject(UserService);

  readonly user = this.userService.user;
  readonly sessions = signal<SessionDetail[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  loadSessionList(): void {
    // Reload user info from session storage in case it changed
    this.userService.loadUser();
    const currentUser = this.user();

    // Guard: skip loading if user is unauthenticated or has no role
    if (!currentUser?.id || !currentUser?.role) {
      this.sessions.set([]);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // After fetching sessions from the API, sync their statuses based on current time
    const onLoaded = (res: SessionDetail[]) => {
      const synced = this.syncStatuses(res);
      this.sessions.set(synced);
      this.isLoading.set(false);
    };

    const onError = (err: any, label: string) => {
      this.errorMessage.set(`Failed to get session list by ${label}: ` + err.message);
      this.isLoading.set(false);
    };

    // Choose the correct API endpoint depending on the user's role
    if (currentUser.role === 'student') {
      this.sessionService.sessionsByStudentList(currentUser.id).subscribe({
        next: (res) => onLoaded(res),
        error: (err) => onError(err, 'student'),
      });
      return;
    }

    if (currentUser.role === 'teacher') {
      this.sessionService.sessionsByTeacherList(currentUser.id).subscribe({
        next: (res) => onLoaded(res),
        error: (err) => onError(err, 'teacher'),
      });
      return;
    }

    if (currentUser.role === 'tutor') {
      this.sessionService.sessionsByTutorList(currentUser.id).subscribe({
        next: (res) => onLoaded(res),
        error: (err) => onError(err, 'tutor'),
      });
      return;
    }

    // Unknown role — clear the list
    this.sessions.set([]);
    this.isLoading.set(false);
  }

  private syncStatuses(sessions: SessionDetail[]): SessionDetail[] {
    const now = new Date();
    return sessions.map(s => {
      // Never override a cancelled session's status
      if (s.status === 'cancelled') return s;

      // Compute what the status should be based on the current time
      const computed = this.computeStatus(s, now);
      if (computed === s.status) return s;

      // Persist the corrected status to the backend (fire-and-forget); update local copy regardless
      this.sessionService.sessionsPartialUpdate(Number(s.id), { status: computed as SessionStatusEnum })
        .subscribe({
          error: (err) => console.warn(`Failed to sync status for session ${s.id}:`, err),
        });

      return { ...s, status: computed };
    });
  }

  private computeStatus(session: SessionDetail, now: Date): SessionStatusEnum {
    const start = new Date(session.start_at);
    const end = new Date(session.end_at);
    // Determine ongoing/upcoming/finished based on current time relative to start and end
    if (now < start) return SessionStatusEnum.Upcoming;
    if (now <= end)  return SessionStatusEnum.Ongoing;
    return SessionStatusEnum.Finished;
  }
}