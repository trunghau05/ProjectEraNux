import { computed, inject, Injectable, signal } from '@angular/core';
import { SessionDetail, SessionsService } from '../apis';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class ScheduleStore {
  private sessionService = inject(SessionsService);
  private userService = inject(UserService);

  readonly user = this.userService.user;

  readonly studentSessions = signal<SessionDetail[]>([]);
  readonly tutorSessions = signal<SessionDetail[]>([]);
  readonly teacherSessions = signal<SessionDetail[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly sessions = computed<SessionDetail[]>(() => {
    const role = this.user().role;
    if (role === 'student') return this.studentSessions();
    if (role === 'tutor') return this.tutorSessions();
    if (role === 'teacher') return this.teacherSessions();
    return [];
  });

  loadSchedule(): void {
    // Refresh user from session storage to pick up any authentication changes
    this.userService.loadUser();
    const currentUser = this.user();

    // Guard: do nothing if user is not logged in or has no role assigned
    if (!currentUser?.id || !currentUser?.role) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (currentUser.role === 'student') {
      // Students see all sessions associated with their student ID
      this.sessionService.sessionsByStudentList(currentUser.id).subscribe({
        next: (res) => {
          this.studentSessions.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to load student schedule: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'tutor') {
      // Tutors see sessions linked to their time slots
      this.sessionService.sessionsByTutorList(currentUser.id).subscribe({
        next: (res) => {
          this.tutorSessions.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to load tutor schedule: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'teacher') {
      // Teachers see all class-based sessions they own
      this.sessionService.sessionsByTeacherList(currentUser.id).subscribe({
        next: (res) => {
          this.teacherSessions.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to load teacher schedule: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    this.isLoading.set(false);
  }
}
