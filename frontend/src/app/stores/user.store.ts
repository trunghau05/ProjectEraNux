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
    // Capitalize the first letter of the role string (e.g., 'student' → 'Student')
    const role = this.user().role || '';
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  });

  readonly avatarUrl = computed(() => {
    // Return the user's profile image URL; fall back to a default avatar if not set
    const role = this.user().role;
    if (role === 'student') {
      return this.student().img || 'default-avatar.jpg';
    }

    return this.teacher().img || 'default-avatar.jpg';
  });

  loadUserInfo(): void {
    // Reload user from session storage to ensure we have the latest credentials
    this.userService.loadUser();
    const currentUser = this.user();

    // Guard: reset profile data if user is unauthenticated
    if (!currentUser?.id || !currentUser?.role) {
      this.userName.set('');
      this.student.set({} as Student);
      this.teacher.set({} as Teacher);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (currentUser.role === 'student') {
      // Fetch the student profile record from the API
      this.studentsService.studentsRetrieve(currentUser.id).subscribe({
        next: (res) => {
          this.student.set(res);
          this.teacher.set({} as Teacher); // clear teacher data for students
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
      // Both teacher and tutor roles use the same teacher record API
      this.teachersService.teachersRetrieve(currentUser.id).subscribe({
        next: (res) => {
          this.teacher.set(res);
          this.student.set({} as Student); // clear student data for teachers/tutors
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

    // Unknown role — clear the username and stop loading
    this.userName.set('');
    this.isLoading.set(false);
  }
}
