import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookedTimeSlot, BookingDetail, BookingsService, ClassDetail, Teacher, TutorBookedStudent } from '../apis';
import { Search } from '../components/shared/search/search.component';
import { UserService } from '../services/user.service';
import { BookingStore } from '../stores/booking.store';
import { ClassListStore } from '../stores/class.store';

@Component({
  selector: 'app-course',
  imports: [CommonModule, FormsModule, Search],
  styles: `
    .course-container { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .title { font-size: 14px; font-weight: 500; height: 25px; }
    .toolbar { width: 100%; flex-wrap: wrap; }
    app-search { flex: 1; min-width: 420px; }
    .filter-select { background: white; color: black; padding: 10px 30px 10px 15px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.12); cursor: pointer; font-size: 11px; font-weight: 500; outline: none; transition: all 0.3s; min-width: 120px; flex: 0 0 auto; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }

    .section { margin-top: 20px; }
    .section-title { font-size: 12px; font-weight: 600; margin-bottom: 12px; }

    .booking-list { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
    .booking-card { background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; align-self: flex-start; }
    .booking-list .booking-card { flex: 1 1 280px; max-width: calc(25% - 15px); min-width: 260px; }
    .booking-card-header { display: flex; align-items: center; gap: 12px; }
    .booking-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
    .booking-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .booking-name { font-size: 12px; font-weight: 500; }
    .booking-role { font-size: 10px; color: #acacacff; margin: 0; }
    .booking-badge { padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; }
    .booking-badge span { font-size: 9px; color: white; font-weight: 500; }
    .badge-active { background-color: #6b46c1; }
    .badge-pending { background-color: #7e72bdff; }
    .badge-completed { background-color: #3432c0ff; }
    .badge-cancelled { background-color: #bb295fff; }
    .booking-divider { border-bottom: 1px solid #f1f1f1; }
    .booking-details { display: flex; flex-direction: column; gap: 8px; }
    .booking-detail-row { display: flex; justify-content: space-between; }
    .booking-detail-row.bio { align-items: flex-start; gap: 8px; }
    .booking-detail-label { font-size: 11px; color: #acacacff; }
    .booking-detail-value { font-size: 11px; font-weight: 500; }
    .booking-detail-value.bio-text { text-align: right; max-width: 72%; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; word-break: break-word; }

    .class-list { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
    .class-card { background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; align-self: flex-start; flex: 1 1 280px; max-width: calc(25% - 15px); min-width: 260px; }
    .class-card-header { display: flex; align-items: center; gap: 12px; }
    .class-icon { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: white; }
    .icon-default { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .class-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .class-name { font-size: 12px; font-weight: 500; }
    .class-teacher { font-size: 10px; color: #acacacff; margin: 0; }
    .class-badge { padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; }
    .class-badge span { font-size: 9px; color: white; font-weight: 500; }
    .badge-open { background-color: #6b46c1; }
    .badge-full { background-color: #2f855a; }
    .badge-closed { background-color: #718096; }
    .badge-complete { background-color: #3432c0ff; }
    .class-divider { border-bottom: 1px solid #f1f1f1; }
    .class-details { display: flex; flex-direction: column; gap: 8px; }
    .class-detail-row { display: flex; justify-content: space-between; }
    .class-detail-label { font-size: 11px; color: #acacacff; }
    .class-detail-value { font-size: 11px; font-weight: 500; }

    .state-box { margin-top: 20px; padding: 24px; border-radius: 12px; background: white; display: flex; flex-direction: column; gap: 8px; }
    .state-title { font-size: 13px; font-weight: 600; }
    .state-text { font-size: 11px; color: #7a7a7a; }

    .course-container::-webkit-scrollbar { width: 10px; height: 10px; }
    .course-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .course-container::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
    .course-container::-webkit-scrollbar-button { display: none; width: 0; height: 0; }

    @media (max-width: 1200px) {
      .booking-list .booking-card { max-width: calc(33.333% - 14px); }
      .class-card { max-width: calc(33.333% - 14px); }
    }

    @media (max-width: 900px) {
      .booking-list .booking-card { max-width: calc(50% - 10px); }
      .class-card { max-width: calc(50% - 10px); }
    }

    @media (max-width: 768px) {
      .course-container { padding: 20px; }
      app-search { min-width: 100%; }
      .filter-select { width: 100%; }
      .booking-list .booking-card { max-width: 100%; min-width: 100%; }
      .class-card { max-width: 100%; min-width: 100%; }
    }
  `,
  template: `
    <div class="course-container">
      <div class="title d-flex items-cen">
        <span>Course</span>
      </div>

      <div class="toolbar mt-20 flex-cen gap-20">
        <app-search
          placeholder="Search course data..."
          (searchChange)="onSearchChange($event)">
        </app-search>

        @if (isStudentRole()) {
          <select class="filter-select" [(ngModel)]="studentContentFilter">
            <option value="all">All</option>
            <option value="bookings">Bookings</option>
            <option value="classes">Classes</option>
          </select>
        }
      </div>

      @if (showLoadingState()) {
        <div class="state-box">
          <span class="state-title">Loading course data</span>
          <span class="state-text">Please wait while we prepare your learning overview.</span>
        </div>
      } @else if (combinedErrorMessage()) {
        <div class="state-box">
          <span class="state-title">Unable to load course data</span>
          <span class="state-text">{{ combinedErrorMessage() }}</span>
        </div>
      } @else if (isStudentRole()) {
        @if (showStudentBookingsSection()) {
          <div class="section">
            <div class="section-title">Your bookings</div>

            @if (filteredStudentBookings.length > 0) {
              <div class="booking-list">
                @for (booking of filteredStudentBookings; track booking.id) {
                  <div class="booking-card" style="cursor:pointer" (click)="openBookingDetail(booking)">
                    <div class="booking-card-header">
                      <img class="booking-avatar" [src]="booking.img || 'default-avatar.jpg'" alt="avatar">
                      <div class="booking-info">
                        <span class="booking-name">{{ booking.name }}</span>
                        <p class="booking-role">{{ formatRole(booking.role) }}</p>
                      </div>
                      <div class="booking-badge badge-active">
                        <span>{{ formatTutorBadge(booking.rating) }}</span>
                      </div>
                    </div>

                    <div class="booking-divider"></div>

                    <div class="booking-details">
                      <div class="booking-detail-row">
                        <span class="booking-detail-label">Email:</span>
                        <span class="booking-detail-value">{{ booking.email }}</span>
                      </div>
                      <div class="booking-detail-row">
                        <span class="booking-detail-label">Phone:</span>
                        <span class="booking-detail-value">{{ booking.phone || 'Updating' }}</span>
                      </div>
                      <div class="booking-detail-row bio">
                        <span class="booking-detail-label">Bio:</span>
                        <span class="booking-detail-value bio-text">{{ booking.bio || 'No bio yet' }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="state-box">
                <span class="state-title">No bookings found</span>
                <span class="state-text">Try a different keyword to find your bookings.</span>
              </div>
            }
          </div>
        }

        @if (showStudentClassesSection()) {
          <div class="section">
            <div class="section-title">Your classes</div>

            @if (filteredStudentClasses.length > 0) {
              <div class="class-list">
                @for (classItem of filteredStudentClasses; track classItem.id) {
                  <div class="class-card" style="cursor:pointer" (click)="openClassDetail(classItem)">
                    <div class="class-card-header">
                      <div class="class-icon icon-default">{{ getClassInitial(classItem) }}</div>
                      <div class="class-info">
                        <span class="class-name">{{ classItem.subject.name || 'Unknown Subject' }}</span>
                        <p class="class-teacher">{{ classItem.teacher.name || 'Unknown Teacher' }}</p>
                      </div>
                      <div class="class-badge" [ngClass]="getClassBadgeClass(classItem.status)">
                        <span>{{ formatStatus(classItem.status) }}</span>
                      </div>
                    </div>

                    <div class="class-divider"></div>

                    <div class="class-details">
                      <div class="class-detail-row">
                        <span class="class-detail-label">Level:</span>
                        <span class="class-detail-value">{{ classItem.level || '-' }}</span>
                      </div>
                      <div class="class-detail-row">
                        <span class="class-detail-label">Max students:</span>
                        <span class="class-detail-value">{{ classItem.max_students || '-' }}</span>
                      </div>
                      <div class="class-detail-row">
                        <span class="class-detail-label">Registered:</span>
                        <span class="class-detail-value">{{ classItem.enrolled_students || 0 }} / {{ classItem.max_students || '-' }}</span>
                      </div>
                      <div class="class-detail-row">
                        <span class="class-detail-label">Created at:</span>
                        <span class="class-detail-value">{{ formatDate(classItem.created_at) }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="state-box">
                <span class="state-title">No classes found</span>
                <span class="state-text">Try a different keyword to find your classes.</span>
              </div>
            }
          </div>
        }
      } @else if (isTutorRole()) {
        <div class="section">
          <div class="section-title">Students booked with you</div>

          @if (filteredTutorStudents.length > 0) {
            <div class="booking-list">
              @for (item of filteredTutorStudents; track item.student.id) {
                <div class="booking-card" style="cursor:pointer" (click)="openTutorStudentDetail(item)">
                  <div class="booking-card-header">
                    <img class="booking-avatar" [src]="item.student.img || 'default-avatar.jpg'" alt="avatar">
                    <div class="booking-info">
                      <span class="booking-name">{{ item.student.name }}</span>
                      <p class="booking-role">Student</p>
                    </div>
                    <div class="booking-badge" [ngClass]="getBookingBadgeClass(getLatestSlot(item.time_slots)?.booking_status)">
                      <span>{{ formatStatus(getLatestSlot(item.time_slots)?.booking_status) }}</span>
                    </div>
                  </div>

                  <div class="booking-divider"></div>

                  <div class="booking-details">
                    <div class="booking-detail-row">
                      <span class="booking-detail-label">Email:</span>
                      <span class="booking-detail-value">{{ item.student.email }}</span>
                    </div>
                    <div class="booking-detail-row">
                      <span class="booking-detail-label">Booked slots:</span>
                      <span class="booking-detail-value">{{ item.time_slots.length }}</span>
                    </div>
                    <div class="booking-detail-row">
                      <span class="booking-detail-label">Nearest slot:</span>
                      <span class="booking-detail-value">{{ getNearestSlotLabel(item.time_slots) }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="state-box">
              <span class="state-title">No booked students found</span>
              <span class="state-text">Students booking your slots will appear here.</span>
            </div>
          }
        </div>
      } @else if (isTeacherRole()) {
        <div class="section">
          <div class="section-title">Your classes</div>

          @if (filteredTeacherClasses.length > 0) {
            <div class="class-list">
              @for (classItem of filteredTeacherClasses; track classItem.id) {
                <div class="class-card" style="cursor:pointer" (click)="openClassDetail(classItem)">
                  <div class="class-card-header">
                    <div class="class-icon icon-default">{{ getClassInitial(classItem) }}</div>
                    <div class="class-info">
                      <span class="class-name">{{ classItem.subject.name || 'Unknown Subject' }}</span>
                      <p class="class-teacher">{{ classItem.teacher.name || 'Unknown Teacher' }}</p>
                    </div>
                    <div class="class-badge" [ngClass]="getClassBadgeClass(classItem.status)">
                      <span>{{ formatStatus(classItem.status) }}</span>
                    </div>
                  </div>

                  <div class="class-divider"></div>

                  <div class="class-details">
                    <div class="class-detail-row">
                      <span class="class-detail-label">Level:</span>
                      <span class="class-detail-value">{{ classItem.level || '-' }}</span>
                    </div>
                    <div class="class-detail-row">
                      <span class="class-detail-label">Max students:</span>
                      <span class="class-detail-value">{{ classItem.max_students || '-' }}</span>
                    </div>
                    <div class="class-detail-row">
                      <span class="class-detail-label">Registered:</span>
                      <span class="class-detail-value">{{ classItem.enrolled_students || 0 }} / {{ classItem.max_students || '-' }}</span>
                    </div>
                    <div class="class-detail-row">
                      <span class="class-detail-label">Created at:</span>
                      <span class="class-detail-value">{{ formatDate(classItem.created_at) }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="state-box">
              <span class="state-title">No classes found</span>
              <span class="state-text">Try a different keyword to find your classes.</span>
            </div>
          }
        </div>
      } @else {
        <div class="state-box">
          <span class="state-title">Current role is not supported</span>
          <span class="state-text">This page supports student, tutor and teacher roles.</span>
        </div>
      }
    </div>
  `,
})
export class Course implements OnInit {
  private bookingStore = inject(BookingStore);
  private classStore = inject(ClassListStore);
  private userService = inject(UserService);
  private bookingsService = inject(BookingsService);
  private router = inject(Router);

  readonly user = this.userService.user;
  readonly bookedStudents = this.bookingStore.bookedStudents;
  readonly classes = this.classStore.classes;

  readonly bookingLoading = this.bookingStore.isLoading;
  readonly classLoading = this.classStore.isLoading;
  readonly bookingError = this.bookingStore.errorMessage;
  readonly classError = this.classStore.errorMessage;
  readonly joinedTeachers = signal<Teacher[]>([]);
  readonly joinedTeachersLoading = signal<boolean>(false);
  readonly joinedTeachersError = signal<string | null>(null);

  searchValue = '';
  studentContentFilter = 'all';

  ngOnInit(): void {
    if (this.isStudentRole()) {
      this.loadStudentJoinedTeachers();
      this.classStore.loadClassList();
      return;
    }

    if (this.isTutorRole()) {
      this.bookingStore.loadBookingData();
      return;
    }

    if (this.isTeacherRole()) {
      this.classStore.loadClassList();
    }
  }

  onSearchChange(value: string): void {
    this.searchValue = value.trim().toLowerCase();
  }

  openBookingDetail(teacher: Teacher): void {
    this.router.navigate(['/course/detail'], {
      queryParams: {
        type: 'booking',
        teacherId: teacher.id,
        teacherName: teacher.name,
      },
    });
  }

  openTutorStudentDetail(item: TutorBookedStudent): void {
    this.router.navigate(['/course/detail'], {
      queryParams: {
        type: 'booking',
        studentId: item.student.id,
        studentName: item.student.name,
      },
    });
  }

  openClassDetail(classItem: ClassDetail): void {
    this.router.navigate(['/course/detail'], {
      queryParams: {
        type: 'class',
        classId: classItem.id,
        className: classItem.subject?.name,
        teacherName: classItem.teacher?.name,
      },
    });
  }

  isStudentRole(): boolean {
    return this.user().role === 'student';
  }

  isTutorRole(): boolean {
    return this.user().role === 'tutor';
  }

  isTeacherRole(): boolean {
    return this.user().role === 'teacher';
  }

  showLoadingState(): boolean {
    if (this.isStudentRole()) {
      return this.joinedTeachersLoading() || this.classLoading();
    }

    if (this.isTutorRole()) {
      return this.bookingLoading();
    }

    if (this.isTeacherRole()) {
      return this.classLoading();
    }

    return false;
  }

  combinedErrorMessage(): string | null {
    if (this.isStudentRole()) {
      return this.joinedTeachersError() || this.classError();
    }

    if (this.isTutorRole()) {
      return this.bookingError();
    }

    if (this.isTeacherRole()) {
      return this.classError();
    }

    return null;
  }

  showStudentBookingsSection(): boolean {
    return this.studentContentFilter === 'all' || this.studentContentFilter === 'bookings';
  }

  showStudentClassesSection(): boolean {
    return this.studentContentFilter === 'all' || this.studentContentFilter === 'classes';
  }

  get filteredStudentBookings(): Teacher[] {
    return this.joinedTeachers().filter((item) => this.matchesText([item.name, item.email, item.phone, item.role, item.bio ?? undefined]));
  }

  get filteredStudentClasses(): ClassDetail[] {
    return this.classes().filter((item) => this.matchesText([item.subject?.name, item.teacher?.name, item.level, item.status]));
  }

  get filteredTutorStudents(): TutorBookedStudent[] {
    return this.bookedStudents().filter((item) => this.matchesText([item.student.name, item.student.email, item.student.phone]));
  }

  get filteredTeacherClasses(): ClassDetail[] {
    return this.classes().filter((item) => this.matchesText([item.subject?.name, item.teacher?.name, item.level, item.status]));
  }

  getClassInitial(classItem: ClassDetail): string {
    const subject = classItem.subject?.name?.trim();
    if (!subject) {
      return '?';
    }

    return subject.charAt(0).toUpperCase();
  }

  getClassBadgeClass(status?: string): string {
    switch (status) {
      case 'open':
        return 'badge-open';
      case 'full':
        return 'badge-full';
      case 'closed':
        return 'badge-closed';
      case 'complete':
        return 'badge-complete';
      default:
        return 'badge-open';
    }
  }

  getBookingBadgeClass(status?: string): string {
    switch (status) {
      case 'pending':
        return 'badge-pending';
      case 'cancelled':
        return 'badge-cancelled';
      case 'confirmed':
      case 'booked':
        return 'badge-active';
      default:
        return 'badge-completed';
    }
  }

  getLatestSlot(timeSlots: BookedTimeSlot[]): BookedTimeSlot | undefined {
    return [...timeSlots].sort((left, right) => new Date(right.start_at).getTime() - new Date(left.start_at).getTime())[0];
  }

  getNearestSlotLabel(timeSlots: BookedTimeSlot[]): string {
    const now = Date.now();
    const nearest = [...timeSlots]
      .filter((slot) => new Date(slot.start_at).getTime() >= now)
      .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())[0];

    if (!nearest) {
      return 'No upcoming slot';
    }

    return this.formatDateTime(nearest.start_at);
  }

  formatRole(role?: string): string {
    if (!role) {
      return 'Tutor';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  formatStatus(status?: string): string {
    if (!status) {
      return 'Unknown';
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatRating(rating?: string | null): string {
    return rating ? `${rating}/5` : 'Not rated';
  }

  formatTutorBadge(rating?: string | null): string {
    return rating || 'N/A';
  }

  formatDate(rawDate: string): string {
    if (!rawDate) {
      return '-';
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('vi-VN');
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private matchesText(values: Array<string | undefined>): boolean {
    if (!this.searchValue) {
      return true;
    }

    return values
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(this.searchValue));
  }

  private loadStudentJoinedTeachers(): void {
    const currentUser = this.user();
    if (!currentUser?.id) {
      this.joinedTeachers.set([]);
      return;
    }

    this.joinedTeachersLoading.set(true);
    this.joinedTeachersError.set(null);

    this.bookingsService.bookingsList().subscribe({
      next: (bookings: BookingDetail[]) => {
        const participatedBookings = bookings
          .filter((item) => item.student?.id === currentUser.id)
          .filter((item) => item.status !== 'cancelled');

        const uniqueTeacherMap = participatedBookings.reduce<Record<number, Teacher>>((acc, item) => {
          if (item.teacher?.id) {
            acc[item.teacher.id] = item.teacher;
          }
          return acc;
        }, {});

        this.joinedTeachers.set(Object.values(uniqueTeacherMap));
        this.joinedTeachersLoading.set(false);
      },
      error: (err: { message?: string }) => {
        this.joinedTeachersError.set('Failed to load joined tutors: ' + (err?.message ?? 'Unknown error'));
        this.joinedTeachers.set([]);
        this.joinedTeachersLoading.set(false);
      },
    });
  }
}
