import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { BookedTimeSlot, BookingDetail, BookingsService, ClassDetail, ClassesService, Subject, SubjectsService, Teacher, TutorBookedStudent } from '../apis';
import { Search } from '../components/shared/search/search.component';
import { ToastService } from '../services/toast.service';
import { UserService } from '../services/user.service';
import { BookingStore } from '../stores/booking.store';
import { ClassListStore } from '../stores/class.store';

@Component({
  selector: 'app-course',
  imports: [CommonModule, FormsModule, Search, MatIconModule],
  styles: `
    .course-container { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .title { font-size: 14px; font-weight: 500; height: 25px; }
    .toolbar { width: 100%; flex-wrap: wrap; }
    app-search { flex: 1; min-width: 420px; }
    .filter-select { background: white; color: black; padding: 10px 30px 10px 15px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.12); cursor: pointer; font-size: 11px; font-weight: 500; outline: none; transition: all 0.3s; min-width: 120px; flex: 0 0 auto; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }
    .toolbar-add { background:#6b46c1; color:#fff; border:none; border-radius:10px; padding:10px 14px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; }
    .toolbar-add mat-icon { width:16px; height:16px; font-size:16px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(9, 9, 18, 0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .modal-box { width: min(100%, 520px); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 34px rgba(0,0,0,0.2); }
    .modal-inner { width: 100%; box-sizing: border-box; background: #fff; padding: 26px; display: flex; flex-direction: column; gap: 10px; }
    .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
    .modal-header h4 { margin: 0; font-size: 18px; color: #1a1a2e; }
    .modal-close-btn { flex-shrink: 0; width: 28px; height: 28px; border: none; background: transparent; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9a9ab0; transition: background 0.15s, color 0.15s; padding: 0; margin-top: -2px; }
    .modal-close-btn:hover { background: #f1f0f8; color: #1a1a2e; }
    .modal-form-row { display: flex; flex-direction: column; gap: 10px; }
    .modal-label { font-size: 11px; font-weight: 600; color: #4a4a4a; margin-bottom: 4px; }
    .modal-field { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e6eef7; border-radius: 6px; outline: none; font-size: 12px; font-family: inherit; }
    .modal-field:focus { border-color: #6b46c1; }
    .modal-select-field { appearance: none; -webkit-appearance: none; -moz-appearance: none; padding-right: 38px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%236b7280' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 8 4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 14px; }
    .modal-helper { font-size: 11px; color: #6a6a6a; }
    .modal-helper.error { color: #bb295f; font-weight: 500; }
    .modal-buttons { display: flex; gap: 8px; margin-top: 2px; }
    .modal-primary { flex: 1; background: #6b46c1; color: #fff; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .modal-primary:disabled { background: #c4b5fd; cursor: not-allowed; }
    .modal-secondary { flex: 1; background: #edf0fa; color: #4a4a4a; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .section { margin-top: 20px; }
    .section-title { font-size: 12px; font-weight: 600; margin-bottom: 12px; }

    .booking-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; align-items: flex-start; }
    .booking-card { background-color: white; border-radius: 10px; padding: 13px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; align-self: flex-start; }
    .booking-card-header { display: flex; align-items: center; gap: 10px; }
    .booking-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
    .booking-info { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .booking-name { font-size: 11px; font-weight: 500; }
    .booking-role { font-size: 9px; color: #acacacff; margin: 0; }
    .booking-badge { padding: 3px 7px; border-radius: 4px; display: flex; align-items: center; }
    .booking-badge span { font-size: 8px; color: white; font-weight: 500; }
    .badge-active { background-color: #6b46c1; }
    .badge-pending { background-color: #7e72bdff; }
    .badge-completed { background-color: #3432c0ff; }
    .badge-cancelled { background-color: #bb295fff; }
    .booking-divider { border-bottom: 1px solid #f1f1f1; }
    .booking-details { display: flex; flex-direction: column; gap: 7px; }
    .booking-detail-row { display: flex; justify-content: space-between; }
    .booking-detail-row.bio { align-items: flex-start; gap: 8px; }
    .booking-detail-label { font-size: 10px; color: #acacacff; }
    .booking-detail-value { font-size: 10px; font-weight: 500; }
    .booking-detail-value.bio-text { text-align: right; max-width: 72%; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; word-break: break-word; }

    .class-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; align-items: flex-start; }
    .class-card { background-color: white; border-radius: 10px; padding: 13px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; align-self: flex-start; }
    .class-card-header { display: flex; align-items: center; gap: 10px; }
    .class-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: white; }
    .icon-default { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .class-info { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .class-name { font-size: 11px; font-weight: 500; }
    .class-teacher { font-size: 9px; color: #acacacff; margin: 0; }
    .class-badge { padding: 3px 7px; border-radius: 4px; display: flex; align-items: center; }
    .class-badge span { font-size: 8px; color: white; font-weight: 500; }
    .badge-open { background-color: #6b46c1; }
    .badge-full { background-color: #2f855a; }
    .badge-closed { background-color: #718096; }
    .badge-complete { background-color: #3432c0ff; }
    .class-divider { border-bottom: 1px solid #f1f1f1; }
    .class-details { display: flex; flex-direction: column; gap: 7px; }
    .class-detail-row { display: flex; justify-content: space-between; }
    .class-detail-label { font-size: 10px; color: #acacacff; }
    .class-detail-value { font-size: 10px; font-weight: 500; }

    .state-box { margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: #fafafa; border: 1px solid #ececec; display: flex; flex-direction: column; gap: 4px; }
    .state-title { font-size: 12px; font-weight: 500; color: #5a5a6e; }
    .state-text { font-size: 11px; color: #9a9ab0; }

    .course-container::-webkit-scrollbar { width: 10px; height: 10px; }
    .course-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .course-container::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
    .course-container::-webkit-scrollbar-button { display: none; width: 0; height: 0; }

    @media (max-width: 1200px) {
      .booking-list { grid-template-columns: repeat(3, 1fr); }
      .class-list { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 900px) {
      .booking-list { grid-template-columns: repeat(2, 1fr); }
      .class-list { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .course-container { padding: 20px; }
      app-search { min-width: 100%; }
      .filter-select { width: 100%; }
      .toolbar-add { width: 100%; justify-content: center; }
      .booking-list { grid-template-columns: 1fr; }
      .class-list { grid-template-columns: 1fr; }
      .modal-inner { width: 100%; }
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

        @if (isTeacherRole()) {
          <button class="toolbar-add" (click)="openCreateClassModal()">
            <mat-icon>add</mat-icon>
            Create class
          </button>
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
          <div class="section-title">Your students</div>

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

    @if (showCreateClassModal()) {
      <div class="modal-overlay" (click)="closeCreateClassModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-inner">
            <div class="modal-header">
              <h4>Create class</h4>
              <button type="button" class="modal-close-btn" (click)="closeCreateClassModal()" aria-label="Close">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">close</mat-icon>
              </button>
            </div>

            <form class="modal-form-row" (ngSubmit)="submitCreateClass()" #createClassForm="ngForm">
              <div>
                <div class="modal-label">Subject <span style="color:#dc2626">*</span></div>
                <select
                  class="modal-field modal-select-field"
                  [(ngModel)]="newClassSubjectId"
                  name="newClassSubjectId"
                  [disabled]="subjectsLoading()"
                  required>
                  <option value="" disabled>Select a subject</option>
                  @for (subject of availableSubjects(); track subject.id) {
                    <option [value]="subject.id">{{ subject.name }}</option>
                  }
                </select>
              </div>

              <div>
                <div class="modal-label">Level</div>
                <input
                  class="modal-field"
                  type="text"
                  [(ngModel)]="newClassLevel"
                  name="newClassLevel"
                  placeholder="e.g. Beginner" />
              </div>

              <div>
                <div class="modal-label">Max students <span style="color:#dc2626">*</span></div>
                <input
                  class="modal-field"
                  type="number"
                  [(ngModel)]="newClassMaxStudents"
                  name="newClassMaxStudents"
                  min="1"
                  required />
              </div>

              <div>
                <div class="modal-label">Description</div>
                <textarea
                  class="modal-field"
                  rows="3"
                  [(ngModel)]="newClassDescription"
                  name="newClassDescription"
                  placeholder="Describe this class (optional)"></textarea>
              </div>

              @if (createClassError()) {
                <div class="modal-helper error">{{ createClassError() }}</div>
              } @else if (subjectsLoading()) {
                <div class="modal-helper">Loading subjects...</div>
              } @else {
                <div class="modal-helper">This class will be created under your teacher account.</div>
              }

              <div class="modal-buttons">
                <button type="button" class="modal-secondary" [disabled]="createClassLoading()" (click)="closeCreateClassModal()">Cancel</button>
                <button type="submit" class="modal-primary" [disabled]="createClassLoading() || !createClassForm.form.valid || subjectsLoading()">
                  @if (createClassLoading()) {
                    <div class="spinner"></div>
                  } @else {
                    Create
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
})
export class Course implements OnInit {
  private bookingStore = inject(BookingStore);
  private classStore = inject(ClassListStore);
  private userService = inject(UserService);
  private bookingsService = inject(BookingsService);
  private classesService = inject(ClassesService);
  private subjectsService = inject(SubjectsService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  readonly user = this.userService.user;
  readonly bookedStudents = this.bookingStore.bookedStudents;
  readonly classes = this.classStore.classes;
  readonly enrolledClasses = this.classStore.enrolledClasses;
  readonly teacherClasses = this.classStore.teacherClasses;

  readonly bookingLoading = this.bookingStore.isLoading;
  readonly classLoading = this.classStore.isLoading;
  readonly bookingError = this.bookingStore.errorMessage;
  readonly classError = this.classStore.errorMessage;
  readonly joinedTeachers = signal<Teacher[]>([]);
  readonly joinedTeachersLoading = signal<boolean>(false);
  readonly joinedTeachersError = signal<string | null>(null);
  readonly showCreateClassModal = signal<boolean>(false);
  readonly createClassLoading = signal<boolean>(false);
  readonly createClassError = signal<string | null>(null);
  readonly availableSubjects = signal<Subject[]>([]);
  readonly subjectsLoading = signal<boolean>(false);

  searchValue = '';
  studentContentFilter = 'all';
  newClassSubjectId = '';
  newClassLevel = '';
  newClassMaxStudents = 30;
  newClassDescription = '';

  ngOnInit(): void {
    // Each role has a different data source; load accordingly
    if (this.isStudentRole()) {
      this.loadStudentJoinedTeachers();
      this.classStore.loadClassList();
      return;
    }

    if (this.isTutorRole()) {
      // Tutors see booked students, not classes
      this.bookingStore.loadBookingData();
      return;
    }

    if (this.isTeacherRole()) {
      this.classStore.loadClassList();
    }
  }

  onSearchChange(value: string): void {
    // Normalize and store the search term to drive filtered computed lists
    this.searchValue = value.trim().toLowerCase();
  }

  openBookingDetail(teacher: Teacher): void {
    // Navigate to the detail page showing booking history with a specific teacher
    this.router.navigate(['/course/detail'], {
      queryParams: {
        type: 'booking',
        teacherId: teacher.id,
        teacherName: teacher.name,
      },
    });
  }

  openTutorStudentDetail(item: TutorBookedStudent): void {
    // Navigate to the detail page showing session history with a specific student (tutor view)
    this.router.navigate(['/course/detail'], {
      queryParams: {
        type: 'booking',
        studentId: item.student.id,
        studentName: item.student.name,
      },
    });
  }

  openClassDetail(classItem: ClassDetail): void {
    // Navigate to the class detail page with route params pre-filled
    this.router.navigate(['/course/detail'], {
      queryParams: {
        type: 'class',
        classId: classItem.id,
        className: classItem.subject?.name,
        teacherName: classItem.teacher?.name,
      },
    });
  }

  openCreateClassModal(): void {
    // Clear stale errors, show the modal, and lazy-load the subject list
    this.createClassError.set(null);
    this.showCreateClassModal.set(true);
    this.loadSubjectsIfNeeded();
  }

  closeCreateClassModal(): void {
    // Block close while a create request is in flight
    if (this.createClassLoading()) {
      return;
    }

    this.showCreateClassModal.set(false);
    this.createClassError.set(null);
    this.resetCreateClassForm();
  }

  submitCreateClass(): void {
    // Guard: only teachers can create classes
    if (!this.isTeacherRole()) {
      return;
    }

    const currentUser = this.user();
    const subjectId = Number(this.newClassSubjectId);
    const maxStudents = Number(this.newClassMaxStudents);

    // Validate required fields before sending the request
    if (!currentUser?.id || !subjectId || !maxStudents || maxStudents < 1) {
      this.createClassError.set('Please complete all required fields with valid values.');
      return;
    }

    this.createClassLoading.set(true);
    this.createClassError.set(null);

    const payload = {
      subject: subjectId,
      teacher: currentUser.id,
      level: this.newClassLevel.trim(),
      max_students: maxStudents,
      description: this.newClassDescription.trim(),
      status: 'open',
    } as any;

    this.classesService.classesCreate(payload).subscribe({
      next: () => {
        this.createClassLoading.set(false);
        this.showCreateClassModal.set(false);
        this.resetCreateClassForm();
        // Refresh the class list to include the newly created class
        this.classStore.loadClassList();
        this.toastService.success('Class created successfully.');
      },
      error: (err: { message?: string; error?: { detail?: string } }) => {
        const detail = err?.error?.detail;
        this.createClassError.set(detail || ('Failed to create class: ' + (err?.message ?? 'Unknown error')));
        this.createClassLoading.set(false);
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
    // Return the loading flag for the data source relevant to the current role
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
    // Surface the relevant error message for the current role's data source
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
    // The bookings section is visible when the filter is 'all' or explicitly 'bookings'
    return this.studentContentFilter === 'all' || this.studentContentFilter === 'bookings';
  }

  showStudentClassesSection(): boolean {
    // The classes section is visible when the filter is 'all' or explicitly 'classes'
    return this.studentContentFilter === 'all' || this.studentContentFilter === 'classes';
  }

  get filteredStudentBookings(): Teacher[] {
    // Filter the student's joined teachers by search text
    return this.joinedTeachers().filter((item) => this.matchesText([item.name, item.email, item.phone, item.role, item.bio ?? undefined]));
  }

  get filteredStudentClasses(): ClassDetail[] {
    // Filter enrolled classes by search text
    return this.enrolledClasses().filter((item) => this.matchesText([item.subject?.name, item.teacher?.name, item.level, item.status]));
  }

  get filteredTutorStudents(): TutorBookedStudent[] {
    // Filter the tutor's booked students by search text
    return this.bookedStudents().filter((item) => this.matchesText([item.student.name, item.student.email, item.student.phone]));
  }

  get filteredTeacherClasses(): ClassDetail[] {
    // Filter the teacher's own classes by search text
    return this.teacherClasses().filter((item) => this.matchesText([item.subject?.name, item.teacher?.name, item.level, item.status]));
  }

  getClassInitial(classItem: ClassDetail): string {
    // Return the first letter of the subject name as an avatar initial
    const subject = classItem.subject?.name?.trim();
    if (!subject) {
      return '?';
    }

    return subject.charAt(0).toUpperCase();
  }

  getClassBadgeClass(status?: string): string {
    // Map a class status to its badge CSS class
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
    // Map a booking status to its badge CSS class
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
    // Sort descending by start time and return the first element (most recent slot)
    return [...timeSlots].sort((left, right) => new Date(right.start_at).getTime() - new Date(left.start_at).getTime())[0];
  }

  getNearestSlotLabel(timeSlots: BookedTimeSlot[]): string {
    // Find the soonest future slot and return a formatted date-time label
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
    // Return true when no search term is set, or when any field contains the search term
    if (!this.searchValue) {
      return true;
    }

    return values
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(this.searchValue));
  }

  private resetCreateClassForm(): void {
    // Clear all create-class form fields to their default values
    this.newClassSubjectId = '';
    this.newClassLevel = '';
    this.newClassMaxStudents = 30;
    this.newClassDescription = '';
  }

  private loadSubjectsIfNeeded(): void {
    // Skip the API call if subjects are already loaded or currently loading
    if (this.availableSubjects().length > 0 || this.subjectsLoading()) {
      return;
    }

    this.subjectsLoading.set(true);
    this.subjectsService.subjectsList().subscribe({
      next: (subjects) => {
        this.availableSubjects.set(subjects ?? []);
        this.subjectsLoading.set(false);
      },
      error: (err: { message?: string }) => {
        this.createClassError.set('Failed to load subjects: ' + (err?.message ?? 'Unknown error'));
        this.availableSubjects.set([]);
        this.subjectsLoading.set(false);
      },
    });
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
        // Only include non-cancelled bookings that belong to this student
        const participatedBookings = bookings
          .filter((item) => item.student?.id === currentUser.id)
          .filter((item) => item.status !== 'cancelled');

        // Deduplicate teachers by ID, keeping the first encountered entry
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
