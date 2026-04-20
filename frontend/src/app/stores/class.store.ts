import { inject, Injectable, signal } from '@angular/core';
import { ClassDetail, ClassesService } from '../apis';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class ClassListStore {
  private classService = inject(ClassesService);
  private userService = inject(UserService);
  private readonly defaultPageSize = 12;

  readonly user = this.userService.user;
  readonly classes = signal<ClassDetail[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingMore = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(this.defaultPageSize);
  readonly total = signal<number>(0);
  readonly hasMore = signal<boolean>(true);
  readonly classEnrollmentCounts = signal<Record<number, number>>({});

  private buildEnrollmentMap(classList: ClassDetail[]): Record<number, number> {
    return classList.reduce<Record<number, number>>((acc, classItem) => {
      acc[classItem.id] = classItem.enrolled_students ?? 0;
      return acc;
    }, {});
  }

  loadClassList(pageSize: number = this.defaultPageSize): void {
    this.userService.loadUser();
    const currentUser = this.user();

    this.pageSize.set(pageSize);
    this.currentPage.set(1);

    if (!currentUser?.id || !currentUser?.role) {
      this.classes.set([]);
      this.classEnrollmentCounts.set({});
      this.total.set(0);
      this.hasMore.set(false);
      return;
    }

    this.isLoading.set(true);
    this.isLoadingMore.set(false);
    this.errorMessage.set(null);
    this.hasMore.set(true);

    if (currentUser.role === 'student') {
      this.classService
        .classesByStudentList(currentUser.id, 1, this.pageSize())
        .subscribe({
        next: (res) => {
          const classList = res.results ?? [];
          this.classes.set(classList);
          this.classEnrollmentCounts.set(this.buildEnrollmentMap(classList));
          this.total.set(res.count ?? 0);
          this.hasMore.set(Boolean(res.next));
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to get class list by student: ' + err.message);
          this.classes.set([]);
          this.classEnrollmentCounts.set({});
          this.total.set(0);
          this.hasMore.set(false);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'teacher' || currentUser.role === 'tutor') {
      this.classService
        .classesByTeacherList(currentUser.id, 1, this.pageSize())
        .subscribe({
        next: (res) => {
          const classList = res.results ?? [];
          this.classes.set(classList);
          this.classEnrollmentCounts.set(this.buildEnrollmentMap(classList));
          this.total.set(res.count ?? 0);
          this.hasMore.set(Boolean(res.next));
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Failed to get class list by teacher: ' + err.message);
          this.classes.set([]);
          this.classEnrollmentCounts.set({});
          this.total.set(0);
          this.hasMore.set(false);
          this.isLoading.set(false);
        },
      });
      return;
    }

    this.classes.set([]);
    this.classEnrollmentCounts.set({});
    this.total.set(0);
    this.hasMore.set(false);
    this.isLoading.set(false);
  }

  loadMoreClasses(): void {
    const currentUser = this.user();

    if (!currentUser?.id || !currentUser?.role) {
      return;
    }

    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) {
      return;
    }

    const nextPage = this.currentPage() + 1;
    this.isLoadingMore.set(true);
    this.errorMessage.set(null);

    const onSuccess = (res: { results: ClassDetail[]; count: number; next?: string | null }) => {
      const newItems = res.results ?? [];
      this.classes.update((existing) => {
        const merged = [...existing, ...newItems];
        this.classEnrollmentCounts.set(this.buildEnrollmentMap(merged));
        return merged;
      });
      this.total.set(res.count ?? 0);
      this.currentPage.set(nextPage);
      this.hasMore.set(Boolean(res.next));
      this.isLoadingMore.set(false);
    };

    const onError = (err: { message?: string }) => {
      this.errorMessage.set('Failed to load more classes: ' + (err?.message ?? 'Unknown error'));
      this.isLoadingMore.set(false);
    };

    if (currentUser.role === 'student') {
      this.classService
        .classesByStudentList(currentUser.id, nextPage, this.pageSize())
        .subscribe({ next: onSuccess, error: onError });
      return;
    }

    if (currentUser.role === 'teacher' || currentUser.role === 'tutor') {
      this.classService
        .classesByTeacherList(currentUser.id, nextPage, this.pageSize())
        .subscribe({ next: onSuccess, error: onError });
      return;
    }

    this.isLoadingMore.set(false);
  }
}