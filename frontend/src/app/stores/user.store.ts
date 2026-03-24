import { computed, inject, Injectable, signal } from '@angular/core';
import { Student, StudentsService, Teacher, TeachersService } from '../apis';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class UserStore {
  private studentsService = inject(StudentsService);
  private teachersService = inject(TeachersService);
  private userService = inject(UserService);

  readonly user = this.userService.user;
  readonly student = signal<Student>({} as Student);
  readonly teacher = signal<Teacher>({} as Teacher);
  readonly userName = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly normalizedRole = computed(() => {
    const role = this.user().role || '';
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  });

  readonly avatarUrl = computed(() => {
    const role = this.user().role;
    if (role === 'student') {
      return this.student().img || 'default-avatar.jpg';
    }

    return this.teacher().img || 'default-avatar.jpg';
  });

  loadUserInfo(): void {
    this.userService.loadUser();
    const currentUser = this.user();

    if (!currentUser?.id || !currentUser?.role) {
      this.userName.set('');
      this.student.set({} as Student);
      this.teacher.set({} as Teacher);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (currentUser.role === 'student') {
      this.studentsService.studentsRetrieve(currentUser.id).subscribe({
        next: (res) => {
          this.student.set(res);
          this.teacher.set({} as Teacher);
          this.userName.set(res.name || '');
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to fetch student info: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'teacher' || currentUser.role === 'tutor') {
      this.teachersService.teachersRetrieve(currentUser.id).subscribe({
        next: (res) => {
          this.teacher.set(res);
          this.student.set({} as Student);
          this.userName.set(res.name || '');
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to fetch teacher info: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    this.userName.set('');
    this.isLoading.set(false);
  }
}
