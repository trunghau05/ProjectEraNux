import { inject, Injectable, signal } from '@angular/core';
import { SessionDetail, SessionsService } from '../apis';
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
    this.userService.loadUser();
    const currentUser = this.user();

    if (!currentUser?.id || !currentUser?.role) {
      this.sessions.set([]);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (currentUser.role === 'student') {
      this.sessionService.sessionsByStudentList(currentUser.id).subscribe({
        next: (res) => {
          console.log('Student sessions:', res);
          this.sessions.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to get session list by student: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'teacher') {
      this.sessionService.sessionsByTeacherList(currentUser.id).subscribe({
        next: (res) => {
          console.log('Teacher sessions:', res);
          this.sessions.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to get session list by teacher: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'tutor') {
      this.sessionService.sessionsByTutorList(currentUser.id).subscribe({
        next: (res) => {
          console.log('Tutor sessions:', res);
          this.sessions.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to get session list by tutor: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    this.sessions.set([]);
    this.isLoading.set(false);
  }
}