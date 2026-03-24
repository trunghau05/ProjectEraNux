import { inject, Injectable, signal } from '@angular/core';
import { ClassDetail, ClassesService } from '../apis';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class ClassListStore {
  private classService = inject(ClassesService);
  private userService = inject(UserService);

  readonly user = this.userService.user;
  readonly classes = signal<ClassDetail[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  loadClassList(): void {
    this.userService.loadUser();
    const currentUser = this.user();

    if (!currentUser?.id || !currentUser?.role) {
      this.classes.set([]);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (currentUser.role === 'student') {
      this.classService.classesByStudentList(currentUser.id).subscribe({
        next: (res) => {
          this.classes.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to get class list by student: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'teacher' || currentUser.role === 'tutor') {
      this.classService.classesByTeacherList(currentUser.id).subscribe({
        next: (res) => {
          this.classes.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to get class list by teacher: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    this.classes.set([]);
    this.isLoading.set(false);
  }
}