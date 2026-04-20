import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Search } from '../components/shared/search/search.component';
import { BookedTimeSlot, Booking as BookingPayload, BookingStatusEnum, BookingsService, Teacher, TimeSlot, TimeSlotsService, TutorBookedStudent } from '../apis';
import { BookingStore } from '../stores/booking.store';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-booking',
  imports: [CommonModule, FormsModule, Search, MatIconModule],
  styles: `
    .booking-container { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .title { font-size: 14px; font-weight: 500; height: 25px; }
    .toolbar { width: 100%; flex-wrap: wrap; }
    .toolbar-spacer { margin-left: auto; }
    .filter-select { background: white; color: black; padding: 10px 30px 10px 15px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.12); cursor: pointer; font-size: 11px; font-weight: 500; outline: none; transition: all 0.3s; min-width: 100px; flex: 0 0 auto; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }
    .toolbar-add { background:#6b46c1; color:#fff; border:none; border-radius:10px; padding:10px 14px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; }
    .toolbar-add mat-icon { width:16px; height:16px; font-size:16px; }
    app-search { flex: 1; min-width: 420px; }
    .booking-list { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 30px; align-items: flex-start; }
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
    .booking-detail-value.bio-text {
      text-align: right;
      max-width: 72%;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .booking-button { color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
    .booking-button.icon-only { width: 32px; height: 32px; min-width: 32px; min-height: 32px; flex: 0 0 32px; padding: 0; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; }
    .booking-button.icon-only mat-icon { width: 16px; height: 16px; font-size: 16px; line-height: 16px; }
    .booking-button:hover { opacity: 0.9; }
    .btn-active { background-color: #6b46c1; }
    .btn-pending { background-color: #7e72bdff; }
    .btn-completed { background-color: #3432c0ff; }
    .btn-cancelled { background-color: #bb295fff; }
    .booking-empty { margin-top: 30px; padding: 24px; border-radius: 12px; background: white; display: flex; flex-direction: column; gap: 8px; }
    .booking-empty-title { font-size: 13px; font-weight: 600; }
    .booking-empty-text { font-size: 11px; color: #7a7a7a; }
    .slot-list { display: flex; flex-direction: column; gap: 8px; }
    .slot-item { background: #f7f5ff; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .slot-item.clickable { cursor: pointer; }
    .slot-time { font-size: 10px; font-weight: 500; color: #3f2e7e; }
    .slot-status { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .slot-status.active { color: #6b46c1; }
    .slot-status.pending { color: #7e72bdff; }
    .slot-status.cancelled { color: #bb295fff; }
    .slot-status.completed { color: #3432c0ff; }
    .slot-actions { display: flex; gap: 8px; margin-top: 6px; justify-content: flex-end; }
    .slot-action-button { border: none; border-radius: 6px; padding: 6px 10px; font-size: 10px; font-weight: 600; cursor: pointer; color: white; }
    .slot-action-button.reject { background-color: #bb295fff; }
    .slot-action-button.confirm { background-color: #6b46c1; }
    .slot-modal-overlay { position: fixed; inset: 0; background: rgba(9, 9, 18, 0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .slot-auth-box { width: min(100%, 420px); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 34px rgba(0, 0, 0, 0.2); }
    .slot-auth-right { width: 100%; box-sizing: border-box; background: #fff; padding: 26px; display: flex; flex-direction: column; gap: 10px; }
    .slot-auth-right h4 { margin: 0 0 6px; font-size: 18px; }
    .slot-form-row { display: flex; flex-direction: column; gap: 10px; }
    .slot-label { font-size: 11px; font-weight: 600; color: #4a4a4a; margin-bottom: 4px; }
    .slot-field { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e6eef7; border-radius: 6px; outline: none; font-size: 12px; }
    .slot-presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .slot-preset-button { flex: 1; border: 1px solid #dfd7ff; border-radius: 6px; background: #f7f5ff; color: #5a3cae; padding: 8px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .slot-buttons { display: flex; gap: 8px; margin-top: 2px; }
    .slot-primary { flex: 1; background: #6b46c1; color: #fff; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .slot-secondary { flex: 1; background: #edf0fa; color: #4a4a4a; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .slot-helper { font-size: 11px; color: #6a6a6a; }
    .slot-helper.error { color: #bb295f; font-weight: 500; }
    .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; margin:0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 1200px) {
      .booking-list .booking-card { max-width: calc(33.333% - 14px); }
    }
    @media (max-width: 900px) {
      .booking-list .booking-card { max-width: calc(50% - 10px); }
    }
    @media (max-width: 768px) {
      .booking-container { padding: 20px; }
      app-search { min-width: 100%; }
      .filter-select { width: 100%; }
      .toolbar-spacer { margin-left: 0; width: 100%; }
      .toolbar-add { width: 100%; justify-content: center; }
      .booking-list .booking-card { max-width: 100%; min-width: 100%; }
      .slot-auth-right { width: 100%; }
      .slot-presets { grid-template-columns: 1fr; }
    }
    .booking-container::-webkit-scrollbar { width: 10px; height: 10px; }
    .booking-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .booking-container::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
    .booking-container::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
  `,
  template: `
    <div class="booking-container">
      <div class="title d-flex items-cen">
        <span>Booking</span>
      </div>

      <div class="toolbar mt-20 flex-cen gap-20">
        <app-search
          placeholder="Search bookings..."
          (searchChange)="onSearchChange($event)">
        </app-search>

        @if (isStudentRole()) {
          <select class="filter-select" [(ngModel)]="filterTeacherRole">
            <option value="all">All roles</option>
            <option value="tutor">Tutor</option>
            <option value="teacher">Teacher</option>
          </select>

          <select class="filter-select" [(ngModel)]="filterRating">
            <option value="all">All ratings</option>
            <option value="4-plus">4.0 and up</option>
            <option value="3-plus">3.0 and up</option>
            <option value="unrated">Unrated</option>
          </select>
        }

        @if (isTutorRole()) {
          <select class="filter-select" [(ngModel)]="filterStatus">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select class="filter-select" [(ngModel)]="filterDate">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="this-week">This week</option>
            <option value="this-month">This month</option>
            <option value="upcoming">Upcoming</option>
          </select>

          <button class="toolbar-add" (click)="openCreateSlotForm()">
            <mat-icon>add</mat-icon>
            Add time slot
          </button>
        }
      </div>

      @if (isTutorRole() && showCreateSlotForm) {
        <div class="slot-modal-overlay" (click)="closeCreateSlotForm()">
          <div class="slot-auth-box" (click)="$event.stopPropagation()">
            <div class="slot-auth-right">
              <h4>New tutor slot</h4>
              <form class="slot-form-row" (ngSubmit)="submitCreateSlot()" #slotForm="ngForm">
                <div>
                  <div class="slot-label">Start time</div>
                  <input
                    class="slot-field"
                    type="datetime-local"
                    [(ngModel)]="newSlotStartAt"
                    [min]="minStartAt"
                    name="newSlotStartAt"
                    required />
                </div>

                <div>
                  <div class="slot-label">End time</div>
                  <input
                    class="slot-field"
                    type="datetime-local"
                    [(ngModel)]="newSlotEndAt"
                    [min]="minEndAt"
                    name="newSlotEndAt"
                    required />
                </div>

                <div class="slot-label">Quick duration</div>
                <div class="slot-presets">
                  <button type="button" class="slot-preset-button" [disabled]="actionLoading()" (click)="setEndByDuration(30)">30 min</button>
                  <button type="button" class="slot-preset-button" [disabled]="actionLoading()" (click)="setEndByDuration(45)">45 min</button>
                  <button type="button" class="slot-preset-button" [disabled]="actionLoading()" (click)="setEndByDuration(60)">60 min</button>
                </div>

                @if (isSlotRangeInvalid) {
                  <div class="slot-helper error">End time must be later than start time.</div>
                } @else if (slotDurationText) {
                  <div class="slot-helper">Duration: {{ slotDurationText }}. Time zone follows your browser local time.</div>
                } @else {
                  <div class="slot-helper">Time zone follows your browser local time.</div>
                }

                <div class="slot-buttons">
                  <button type="button" class="slot-secondary" [disabled]="actionLoading()" (click)="closeCreateSlotForm()">Cancel</button>
                  <button type="submit" class="slot-primary" [disabled]="actionLoading() || !slotForm.form.valid || isSlotRangeInvalid">
                    @if (actionLoading()) {
                      <div class="spinner"></div>
                    } @else {
                      Create slot
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      @if (isLoading()) {
        <div class="booking-empty">
          <span class="booking-empty-title">Loading booking data</span>
          <span class="booking-empty-text">The list will update as soon as the API returns data.</span>
        </div>
      } @else if (errorMessage()) {
        <div class="booking-empty">
          <span class="booking-empty-title">Unable to load data</span>
          <span class="booking-empty-text">{{ errorMessage() }}</span>
        </div>
      } @else if (isStudentRole()) {
        @if (getFilteredTutors().length > 0) {
          <div class="booking-list">
            @for (tutor of getFilteredTutors(); track trackTutor($index, tutor)) {
              <div class="booking-card">
                <div class="booking-card-header">
                  <img [src]="tutor.img || 'default-avatar.jpg'" alt="avatar" class="booking-avatar">
                  <div class="booking-info">
                    <span class="booking-name">{{ tutor.name }}</span>
                    <p class="booking-role">{{ formatRoleLabel(tutor.role) }}</p>
                  </div>
                  <div class="booking-badge" [ngClass]="getTutorBadgeClass(tutor.role)">
                    <span>{{ formatRoleLabel(tutor.role) }}</span>
                  </div>
                </div>
                <div class="booking-divider"></div>
                <div class="booking-details">
                  <div class="booking-detail-row">
                    <span class="booking-detail-label">Email:</span>
                    <span class="booking-detail-value">{{ tutor.email }}</span>
                  </div>
                  <div class="booking-detail-row">
                    <span class="booking-detail-label">Phone:</span>
                    <span class="booking-detail-value">{{ tutor.phone || 'Updating' }}</span>
                  </div>
                  <div class="booking-detail-row">
                    <span class="booking-detail-label">Rating:</span>
                    <span class="booking-detail-value">{{ formatRating(tutor.rating) }}</span>
                  </div>
                  <div class="booking-detail-row bio">
                    <span class="booking-detail-label">Bio:</span>
                    <span class="booking-detail-value bio-text">{{ tutor.bio || 'No bio yet' }}</span>
                  </div>
                </div>

                @if (isTutorExpanded(tutor.id)) {
                  @if (isTutorSlotsLoading(tutor.id)) {
                    <div class="slot-list">
                      <div class="slot-item">
                        <span class="slot-time">Loading available slots...</span>
                      </div>
                    </div>
                  } @else if (getAvailableSlotsByTutor(tutor.id).length > 0) {
                    <div class="slot-list">
                      @for (slot of getAvailableSlotsByTutor(tutor.id); track slot.id) {
                        <div class="slot-item">
                          <span class="slot-time">{{ formatSlotRange(slot.start_at, slot.end_at) }}</span>
                          <button
                            class="booking-button icon-only"
                            [ngClass]="isSlotPending(slot.id) ? 'btn-pending' : 'btn-active'"
                            [disabled]="actionLoading()"
                            (click)="toggleSlotBooking(tutor.id, slot.id)"
                            [attr.aria-label]="isSlotPending(slot.id) ? 'Cancel pending booking request' : 'Book slot'"
                            [attr.title]="isSlotPending(slot.id) ? 'Cancel pending booking request' : 'Book slot'">
                            <mat-icon>{{ isSlotPending(slot.id) ? 'hourglass_top' : 'add' }}</mat-icon>
                          </button>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="slot-list">
                      <div class="slot-item">
                        <span class="slot-time">No available time slots.</span>
                      </div>
                    </div>
                  }
                }

                <button class="booking-button btn-active" (click)="toggleTutorDetails(tutor.id)">
                  {{ isTutorExpanded(tutor.id) ? 'Hide Detail' : 'View Detail' }}
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="booking-empty">
            <span class="booking-empty-title">No matching tutors found</span>
            <span class="booking-empty-text">Try changing the search term or filters to see more tutors.</span>
          </div>
        }
      } @else if (isTutorRole()) {
        @if (getFilteredBookedStudents().length > 0) {
          <div class="booking-list">
            @for (item of getFilteredBookedStudents(); track trackStudent($index, item)) {
              <div class="booking-card">
                <div class="booking-card-header">
                  <img [src]="item.student.img || 'default-avatar.jpg'" alt="avatar" class="booking-avatar">
                  <div class="booking-info">
                    <span class="booking-name">{{ item.student.name }}</span>
                    <p class="booking-role">Student</p>
                  </div>
                  <div class="booking-badge" [ngClass]="getStudentBadgeClass(item)">
                    <span>{{ formatStatusLabel(getLatestSlot(item.time_slots)?.booking_status) }}</span>
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
                    <span class="booking-detail-label">Latest slot:</span>
                    <span class="booking-detail-value">{{ getSlotSummary(item) }}</span>
                  </div>
                </div>
                @if (isBookedSlotsExpanded(item.student.id)) {
                  <div class="slot-list">
                    @for (slot of item.time_slots; track trackSlot($index, slot)) {
                      <div class="slot-item" [class.clickable]="slot.booking_status === 'pending'" (click)="toggleTutorPendingActions(slot)">
                        <span class="slot-time">{{ formatDateTime(slot.start_at) }}</span>
                        <div class="flex-cen" style="gap: 8px;">
                          <span class="slot-status" [ngClass]="getSlotStatusClass(slot.booking_status)">
                            {{ formatStatusLabel(slot.booking_status) }}
                          </span>
                        </div>
                      </div>
                      @if (slot.booking_status === 'pending' && isTutorPendingActionOpen(slot)) {
                        <div class="slot-actions">
                          <button class="slot-action-button reject" [disabled]="actionLoading()" (click)="rejectBooking(slot.booking_id, $event)">Reject</button>
                          <button class="slot-action-button confirm" [disabled]="actionLoading()" (click)="confirmBooking(slot.booking_id, slot.id, $event)">Confirm</button>
                        </div>
                      }
                    }
                  </div>
                }
                <button class="booking-button" [ngClass]="getButtonClass(getLatestSlot(item.time_slots)?.booking_status)" (click)="toggleBookedSlots(item.student.id)">
                  {{ isBookedSlotsExpanded(item.student.id) ? 'Hide booked slots' : 'View booked slots' }}
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="booking-empty">
            <span class="booking-empty-title">No students have booked yet</span>
            <span class="booking-empty-text">Students who booked this tutor will appear here together with their booked time slots.</span>
          </div>
        }
      } @else {
        <div class="booking-empty">
          <span class="booking-empty-title">Current role is not supported</span>
          <span class="booking-empty-text">This page currently supports students viewing tutors and tutors viewing booked students.</span>
        </div>
      }
    </div>  
  `, 
})
export class Booking implements OnInit{
  private bookingStore = inject(BookingStore);
  private bookingsService = inject(BookingsService);
  private timeSlotsApi = inject(TimeSlotsService);
  private toastService = inject(ToastService);

  readonly user = this.bookingStore.user;
  readonly tutors = this.bookingStore.tutors;
  readonly bookedStudents = this.bookingStore.bookedStudents;
  readonly isLoading = this.bookingStore.isLoading;
  readonly actionLoading = this.bookingStore.actionLoading;
  readonly errorMessage = this.bookingStore.errorMessage;
  readonly availableSlotsByTutor = this.bookingStore.availableSlotsByTutor;
  readonly slotsLoadingByTutor = this.bookingStore.slotsLoadingByTutor;

  searchValue = '';
  filterStatus = 'all';
  filterRating = 'all';
  filterTeacherRole = 'all';
  filterDate = 'all';
  expandedTutorId: number | null = null;
  expandedBookedStudentId: number | null = null;
  activeTutorPendingBookingId: number | null = null;
  showCreateSlotForm = false;
  newSlotStartAt = '';
  newSlotEndAt = '';
  private pendingSlotBookingIds: Record<number, number> = {};

  ngOnInit(): void {
    this.bookingStore.loadBookingData();
  }

  isStudentRole(): boolean {
    return this.user().role === 'student';
  }

  isTutorRole(): boolean {
    return this.user().role === 'tutor';
  }

  onSearchChange(value: string) {
    this.searchValue = value.trim().toLowerCase();
  }

  getFilteredTutors(): Teacher[] {
    return this.tutors().filter((tutor) => {
      const matchesSearch = !this.searchValue || [tutor.name, tutor.email, tutor.phone, tutor.bio]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(this.searchValue));
      const matchesRole = this.filterTeacherRole === 'all' || tutor.role === this.filterTeacherRole;
      const matchesRating = this.filterRating === 'all' || this.matchesRating(tutor.rating, this.filterRating);

      return matchesSearch && matchesRole && matchesRating;
    });
  }

  getFilteredBookedStudents(): TutorBookedStudent[] {
    return this.bookedStudents().filter((item) => {
      const matchesSearch = !this.searchValue || [item.student.name, item.student.email, item.student.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(this.searchValue));
      const matchingSlots = item.time_slots.filter((slot) => this.matchesSlotStatus(slot) && this.matchesSlotDate(slot));

      return matchesSearch && matchingSlots.length > 0;
    }).map((item) => ({
      ...item,
      time_slots: item.time_slots.filter((slot) => this.matchesSlotStatus(slot) && this.matchesSlotDate(slot)),
    }));
  }

  getTutorBadgeClass(role?: string): string {
    return role === 'teacher' ? 'badge-pending' : 'badge-active';
  }

  getStudentBadgeClass(item: TutorBookedStudent): string {
    const latestSlot = this.getLatestSlot(item.time_slots);
    const status = latestSlot?.booking_status || 'pending';
    return this.getStatusBadgeClass(status);
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'confirmed':
      case 'booked':
        return 'badge-active';
      case 'pending':
        return 'badge-pending';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-completed';
    }
  }

  getButtonClass(status?: string): string {
    switch (status) {
      case 'confirmed':
      case 'booked':
        return 'btn-active';
      case 'pending':
        return 'btn-pending';
      case 'cancelled':
        return 'btn-cancelled';
      default:
        return 'btn-completed';
    }
  }

  getSlotStatusClass(status?: string): string {
    switch (status) {
      case 'confirmed':
      case 'booked':
        return 'active';
      case 'pending':
        return 'pending';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'completed';
    }
  }

  getLatestSlot(timeSlots: BookedTimeSlot[]): BookedTimeSlot | undefined {
    return [...timeSlots].sort((left, right) => new Date(right.start_at).getTime() - new Date(left.start_at).getTime())[0];
  }

  getNextSlot(timeSlots: BookedTimeSlot[]): BookedTimeSlot | undefined {
    const now = Date.now();
    return [...timeSlots]
      .filter((slot) => new Date(slot.start_at).getTime() >= now)
      .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())[0];
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  formatRating(rating?: string | null): string {
    return rating ? `${rating}/5` : 'Not rated';
  }

  formatRoleLabel(role?: string): string {
    if (!role) {
      return 'Tutor';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  formatStatusLabel(status?: string): string {
    if (!status) {
      return 'Completed';
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getSlotSummary(item: TutorBookedStudent): string {
    const nextSlot = this.getNextSlot(item.time_slots);
    if (nextSlot) {
      return this.formatDateTime(nextSlot.start_at);
    }

    const latestSlot = this.getLatestSlot(item.time_slots);
    return latestSlot ? this.formatDateTime(latestSlot.start_at) : 'No schedule yet';
  }

  trackTutor(_: number, tutor: Teacher): number {
    return tutor.id;
  }

  trackStudent(_: number, item: TutorBookedStudent): number {
    return item.student.id;
  }

  trackSlot(_: number, slot: BookedTimeSlot): number {
    return slot.booking_id;
  }

  toggleTutorDetails(tutorId: number): void {
    if (this.expandedTutorId === tutorId) {
      this.expandedTutorId = null;
      return;
    }

    this.expandedTutorId = tutorId;
    this.bookingStore.loadAvailableSlotsByTutor(tutorId, true);
  }

  isTutorExpanded(tutorId: number): boolean {
    return this.expandedTutorId === tutorId;
  }

  isTutorSlotsLoading(tutorId: number): boolean {
    return !!this.slotsLoadingByTutor()[tutorId];
  }

  getAvailableSlotsByTutor(tutorId: number): TimeSlot[] {
    return this.availableSlotsByTutor()[tutorId] || [];
  }

  toggleSlotBooking(teacherId: number, timeSlotId: number): void {
    if (this.isSlotPending(timeSlotId)) {
      this.cancelPendingBooking(teacherId, timeSlotId);
      return;
    }

    this.createPendingBooking(teacherId, timeSlotId);
  }

  isSlotPending(slotId: number): boolean {
    return !!this.pendingSlotBookingIds[slotId];
  }

  confirmBooking(bookingId: number, timeSlotId: number, event?: Event): void {
    event?.stopPropagation();
    this.activeTutorPendingBookingId = null;
    this.confirmBookingRequest(bookingId, timeSlotId);
  }

  rejectBooking(bookingId: number, event?: Event): void {
    event?.stopPropagation();
    this.activeTutorPendingBookingId = null;
    this.rejectBookingRequest(bookingId);
  }

  toggleTutorPendingActions(slot: BookedTimeSlot): void {
    if (slot.booking_status !== 'pending') {
      this.activeTutorPendingBookingId = null;
      return;
    }

    this.activeTutorPendingBookingId = this.activeTutorPendingBookingId === slot.booking_id
      ? null
      : slot.booking_id;
  }

  isTutorPendingActionOpen(slot: BookedTimeSlot): boolean {
    return this.activeTutorPendingBookingId === slot.booking_id;
  }

  toggleBookedSlots(studentId: number): void {
    const isExpanded = this.expandedBookedStudentId === studentId;
    this.expandedBookedStudentId = isExpanded ? null : studentId;
    if (isExpanded) {
      this.activeTutorPendingBookingId = null;
    }
  }

  isBookedSlotsExpanded(studentId: number): boolean {
    return this.expandedBookedStudentId === studentId;
  }

  openCreateSlotForm(): void {
    this.showCreateSlotForm = true;
  }

  closeCreateSlotForm(): void {
    if (this.actionLoading()) {
      return;
    }

    this.showCreateSlotForm = false;
    this.newSlotStartAt = '';
    this.newSlotEndAt = '';
  }

  get minStartAt(): string {
    return this.toDateTimeLocalValue(new Date());
  }

  get minEndAt(): string {
    return this.newSlotStartAt || this.minStartAt;
  }

  get isSlotRangeInvalid(): boolean {
    if (!this.newSlotStartAt || !this.newSlotEndAt) {
      return false;
    }

    return new Date(this.newSlotEndAt).getTime() <= new Date(this.newSlotStartAt).getTime();
  }

  get slotDurationText(): string {
    if (!this.newSlotStartAt || !this.newSlotEndAt || this.isSlotRangeInvalid) {
      return '';
    }

    const diffMs = new Date(this.newSlotEndAt).getTime() - new Date(this.newSlotStartAt).getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  }

  setEndByDuration(minutes: number): void {
    const baseStart = this.newSlotStartAt ? new Date(this.newSlotStartAt) : new Date();
    if (!this.newSlotStartAt) {
      this.newSlotStartAt = this.toDateTimeLocalValue(baseStart);
    }

    const end = new Date(baseStart.getTime() + minutes * 60000);
    this.newSlotEndAt = this.toDateTimeLocalValue(end);
  }

  submitCreateSlot(): void {
    this.createTutorTimeSlot(() => {
      this.closeCreateSlotForm();
    });
  }

  private createPendingBooking(teacherId: number, timeSlotId: number): void {
    const currentUser = this.user();
    if (!currentUser?.id || currentUser.role !== 'student') {
      this.setErrorMessage('Only students can create booking requests.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    this.bookingsService.bookingsCreate({
      teacher: teacherId,
      time_slot: timeSlotId,
      student: currentUser.id,
      status: BookingStatusEnum.Pending,
    } as unknown as BookingPayload).subscribe({
      next: (createdBooking) => {
        const bookingId = createdBooking?.id;
        if (bookingId) {
          this.pendingSlotBookingIds[timeSlotId] = bookingId;
        }
        this.setSuccessMessage('Booking request sent, waiting for tutor confirmation.');
        this.bookingStore.loadAvailableSlotsByTutor(teacherId, true);
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.setErrorMessage('Failed to create booking request: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  private cancelPendingBooking(teacherId: number, timeSlotId: number): void {
    const currentUser = this.user();
    if (!currentUser?.id || currentUser.role !== 'student') {
      this.setErrorMessage('Only students can cancel booking requests.');
      return;
    }

    const bookingId = this.pendingSlotBookingIds[timeSlotId];
    if (!bookingId) {
      this.setErrorMessage('Cannot find pending booking for this slot.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    this.bookingsService.bookingsDestroy(bookingId).subscribe({
      next: () => {
        delete this.pendingSlotBookingIds[timeSlotId];
        this.setSuccessMessage('Pending booking request cancelled.');
        this.bookingStore.loadAvailableSlotsByTutor(teacherId, true);
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.setErrorMessage('Failed to cancel booking request: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  private confirmBookingRequest(bookingId: number, _timeSlotId: number): void {
    if (this.user().role !== 'tutor') {
      this.setErrorMessage('Only tutors can confirm bookings.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    this.bookingsService.bookingsConfirmCreate(bookingId).subscribe({
      next: () => {
        this.setSuccessMessage('Booking confirmed and session created.');
        this.actionLoading.set(false);
        this.bookingStore.loadBookingData();
      },
      error: (err: any) => {
        this.setErrorMessage('Failed to confirm booking: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  private rejectBookingRequest(bookingId: number): void {
    if (this.user().role !== 'tutor') {
      this.setErrorMessage('Only tutors can reject bookings.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    this.bookingsService.bookingsPartialUpdate(bookingId, {
      status: BookingStatusEnum.Cancelled,
    }).subscribe({
      next: () => {
        this.setSuccessMessage('Booking request rejected.');
        this.actionLoading.set(false);
        this.bookingStore.loadBookingData();
      },
      error: (err) => {
        this.setErrorMessage('Failed to reject booking: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  private createTutorTimeSlot(onSuccess?: () => void): void {
    const currentUser = this.user();
    if (!currentUser?.id || currentUser.role !== 'tutor') {
      this.setErrorMessage('Only tutors can create time slots.');
      return;
    }

    if (!this.newSlotStartAt || !this.newSlotEndAt) {
      this.setErrorMessage('Please select start and end time.');
      return;
    }

    const startTime = new Date(this.newSlotStartAt).getTime();
    const endTime = new Date(this.newSlotEndAt).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      this.setErrorMessage('End time must be later than start time.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    this.timeSlotsApi.timeSlotsCreate({
      teacher: currentUser.id,
      start_at: new Date(this.newSlotStartAt).toISOString(),
      end_at: new Date(this.newSlotEndAt).toISOString(),
    } as unknown as TimeSlot).subscribe({
      next: () => {
        this.setSuccessMessage('Time slot created successfully.');
        this.actionLoading.set(false);
        onSuccess?.();
      },
      error: (err) => {
        this.setErrorMessage('Failed to create time slot: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  private setSuccessMessage(message: string, timeoutMs = 4000): void {
    this.toastService.success(message, timeoutMs);
  }

  private setErrorMessage(message: string, timeoutMs = 5000): void {
    this.toastService.error(message, timeoutMs);
  }

  private clearMessages(): void {
    // Keep call sites intact; action feedback is now shown by shared toast.
  }

  private toDateTimeLocalValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatSlotRange(startAt: string, endAt: string): string {
    return `${this.formatDateTime(startAt)} - ${this.formatDateTime(endAt)}`;
  }

  private matchesRating(rating?: string | null, filter?: string): boolean {
    const numericRating = Number(rating || 0);

    switch (filter) {
      case '4-plus':
        return numericRating >= 4;
      case '3-plus':
        return numericRating >= 3;
      case 'unrated':
        return numericRating === 0;
      default:
        return true;
    }
  }

  private matchesSlotStatus(slot: BookedTimeSlot): boolean {
    return this.filterStatus === 'all' || slot.booking_status === this.filterStatus;
  }

  private matchesSlotDate(slot: BookedTimeSlot): boolean {
    if (this.filterDate === 'all') {
      return true;
    }

    const slotDate = new Date(slot.start_at);
    const now = new Date();

    if (this.filterDate === 'today') {
      return slotDate.toDateString() === now.toDateString();
    }

    if (this.filterDate === 'this-week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      return slotDate >= startOfWeek && slotDate < endOfWeek;
    }

    if (this.filterDate === 'this-month') {
      return slotDate.getMonth() === now.getMonth() && slotDate.getFullYear() === now.getFullYear();
    }

    if (this.filterDate === 'upcoming') {
      return slotDate.getTime() >= now.getTime();
    }

    return true;
  }
}
