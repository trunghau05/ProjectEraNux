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
    // Build a lookup map of { classId -> enrolled student count } for quick access in the template
    return classList.reduce<Record<number, number>>((acc, classItem) => {
      acc[classItem.id] = classItem.enrolled_students ?? 0;
      return acc;
    }, {});
  }

  loadClassList(pageSize: number = this.defaultPageSize): void {
    // Reload user from session storage to pick up any role changes
    this.userService.loadUser();
    const currentUser = this.user();

    // Reset pagination state for a fresh load
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.isLoading.set(true);
    this.isLoadingMore.set(false);
    this.errorMessage.set(null);
    this.hasMore.set(true);

    // Always fetch the first page of all classes; fall back to empty list on error
    const allClasses$ = this.classService.classesList(1, pageSize).pipe(
      catchError((err) => {
        this.errorMessage.set('Failed to get class list: ' + err.message);
        return of({ results: [], count: 0, next: null });
      }),
    );

    if (currentUser?.id && currentUser?.role === 'student') {
      // For students: also fetch their enrolled classes in parallel via forkJoin
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

    if (currentUser?.id && currentUser?.role === 'teacher') {
      // For teachers: also fetch their own classes in parallel via forkJoin
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

    if (currentUser?.role === 'tutor') {
      // Class board is not used for tutor role
      this.classes.set([]);
      this.enrolledClasses.set([]);
      this.teacherClasses.set([]);
      this.classEnrollmentCounts.set({});
      this.total.set(0);
      this.hasMore.set(false);
      this.isLoading.set(false);
      return;
    }

    // Unauthenticated or unrecognised role: just load all classes with no enrollment data
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
    // Prevent duplicate loads: skip if already loading or no more pages exist
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) {
      return;
    }

    const nextPage = this.currentPage() + 1;
    this.isLoadingMore.set(true);
    this.errorMessage.set(null);

    this.classService.classesList(nextPage, this.pageSize()).subscribe({
      next: (res) => {
        const newItems = res.results ?? [];
        // Append newly fetched classes to the existing list (infinite scroll pattern)
        this.classes.update((existing) => {
          const merged = [...existing, ...newItems];
          // Rebuild enrollment map to include the newly appended items
          this.classEnrollmentCounts.set(this.buildEnrollmentMap(merged));
          return merged;
        });
        this.total.set(res.count ?? 0);
        this.currentPage.set(nextPage);
        // Determine whether another page is available for future loads
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