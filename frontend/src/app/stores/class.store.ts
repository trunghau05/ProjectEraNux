import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  readonly enrolledClasses = signal<ClassDetail[]>([]);
  readonly teacherClasses = signal<ClassDetail[]>([]);

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
    this.isLoading.set(true);
    this.isLoadingMore.set(false);
    this.errorMessage.set(null);
    this.hasMore.set(true);

    const allClasses$ = this.classService.classesList(1, pageSize).pipe(
      catchError((err) => {
        this.errorMessage.set('Failed to get class list: ' + err.message);
        return of({ results: [], count: 0, next: null });
      }),
    );

    if (currentUser?.id && currentUser?.role === 'student') {
      const enrolled$ = this.classService
        .classesByStudentList(currentUser.id, 1, 1000)
        .pipe(catchError(() => of({ results: [], count: 0, next: null })));

      forkJoin({ all: allClasses$, enrolled: enrolled$ }).subscribe(({ all, enrolled }) => {
        const allList = all.results ?? [];
        this.classes.set(allList);
        this.classEnrollmentCounts.set(this.buildEnrollmentMap(allList));
        this.total.set(all.count ?? 0);
        this.hasMore.set(Boolean(all.next));
        this.enrolledClasses.set(enrolled.results ?? []);
        this.isLoading.set(false);
      });
      return;
    }

    if (currentUser?.id && (currentUser?.role === 'teacher' || currentUser?.role === 'tutor')) {
      const teacher$ = this.classService
        .classesByTeacherList(currentUser.id, 1, 1000)
        .pipe(catchError(() => of({ results: [], count: 0, next: null })));

      forkJoin({ all: allClasses$, teacher: teacher$ }).subscribe(({ all, teacher }) => {
        const allList = all.results ?? [];
        this.classes.set(allList);
        this.classEnrollmentCounts.set(this.buildEnrollmentMap(allList));
        this.total.set(all.count ?? 0);
        this.hasMore.set(Boolean(all.next));
        this.teacherClasses.set(teacher.results ?? []);
        this.isLoading.set(false);
      });
      return;
    }

    allClasses$.subscribe((all) => {
      const allList = all.results ?? [];
      this.classes.set(allList);
      this.classEnrollmentCounts.set(this.buildEnrollmentMap(allList));
      this.total.set(all.count ?? 0);
      this.hasMore.set(Boolean(all.next));
      this.isLoading.set(false);
    });
  }

  loadMoreClasses(): void {
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) {
      return;
    }

    const nextPage = this.currentPage() + 1;
    this.isLoadingMore.set(true);
    this.errorMessage.set(null);

    this.classService.classesList(nextPage, this.pageSize()).subscribe({
      next: (res) => {
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
      },
      error: (err) => {
        this.errorMessage.set('Failed to load more classes: ' + (err?.message ?? 'Unknown error'));
        this.isLoadingMore.set(false);
      },
    });
  }
}