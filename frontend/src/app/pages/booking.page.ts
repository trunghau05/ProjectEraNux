import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Search } from '../components/shared/search/search.component';
import { BookedTimeSlot, Booking as BookingPayload, BookingDetail, BookingStatusEnum, BookingsService, Room as RoomPayload, RoomsService, SessionDetail, SessionsService, Teacher, TimeSlot, TimeSlotsService, TutorBookedStudent } from '../apis';
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
    .booking-list.tutor-list { gap: 35px; }
    .booking-list.tutor-list .booking-card {
      flex: 0 0 calc((100% - 105px) / 4);
      max-width: calc((100% - 105px) / 4);
      min-width: 0;
      padding: 13px;
      gap: 10px;
    }
    .booking-list.tutor-list .booking-card-header { gap: 10px; }
    .booking-list.tutor-list .booking-avatar { width: 44px; height: 44px; }
    .booking-list.tutor-list .booking-info { gap: 3px; }
    .booking-list.tutor-list .booking-name { font-size: 11px; }
    .booking-list.tutor-list .booking-role { font-size: 9px; }
    .booking-list.tutor-list .booking-badge { padding: 3px 7px; }
    .booking-list.tutor-list .booking-badge span { font-size: 8px; }
    .booking-list.tutor-list .booking-detail-label,
    .booking-list.tutor-list .booking-detail-value { font-size: 10px; }
    .booking-list.tutor-list .booking-button { padding: 7px; font-size: 10px; }
    .booking-list.tutor-list .booking-button.icon-only {
      width: 30px;
      height: 30px;
      min-width: 30px;
      min-height: 30px;
      flex-basis: 30px;
    }
    .booking-list.tutor-list .booking-button.icon-only mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
      line-height: 14px;
    }
    .booking-list.booked-student-list .booking-card {
      padding: 13px;
      gap: 10px;
    }
    .booking-list.booked-student-list .booking-card-header { gap: 10px; }
    .booking-list.booked-student-list .booking-avatar { width: 44px; height: 44px; }
    .booking-list.booked-student-list .booking-info { gap: 3px; }
    .booking-list.booked-student-list .booking-name { font-size: 11px; }
    .booking-list.booked-student-list .booking-role { font-size: 9px; }
    .booking-list.booked-student-list .booking-badge { padding: 3px 7px; }
    .booking-list.booked-student-list .booking-badge span { font-size: 8px; }
    .booking-list.booked-student-list .booking-details { gap: 7px; }
    .booking-list.booked-student-list .booking-detail-label,
    .booking-list.booked-student-list .booking-detail-value { font-size: 10px; }
    .booking-list.booked-student-list .booking-button { padding: 7px; font-size: 10px; }
    .booking-list.booked-student-list .slot-item { padding: 8px; }
    .booking-list.booked-student-list .slot-time { font-size: 9px; }
    .booking-list.booked-student-list .slot-status { font-size: 8px; }
    .booking-list.booked-student-list .slot-action-button { padding: 5px 8px; font-size: 9px; }
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
      -webkit-line-clamp: 1;
      line-clamp: 1;
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
    .booking-empty { margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: #fafafa; border: 1px solid #ececec; display: flex; flex-direction: column; gap: 4px; }
    .booking-empty-title { font-size: 12px; font-weight: 500; color: #5a5a6e; }
    .booking-empty-text { font-size: 11px; color: #9a9ab0; }
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
    .slot-modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
    .slot-modal-header h4 { margin: 0; font-size: 18px; }
    .slot-modal-close-btn { flex-shrink: 0; width: 28px; height: 28px; border: none; background: transparent; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9a9ab0; transition: background 0.15s, color 0.15s; padding: 0; margin-top: -2px; }
    .slot-modal-close-btn:hover { background: #f1f0f8; color: #1a1a2e; }
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
      .booking-list.tutor-list .booking-card {
        flex-basis: calc((100% - 70px) / 3);
        max-width: calc((100% - 70px) / 3);
      }
    }
    @media (max-width: 900px) {
      .booking-list .booking-card { max-width: calc(50% - 10px); }
      .booking-list.tutor-list .booking-card {
        flex-basis: calc((100% - 35px) / 2);
        max-width: calc((100% - 35px) / 2);
      }
    }
    @media (max-width: 768px) {
      .booking-container { padding: 20px; }
      app-search { min-width: 100%; }
      .filter-select { width: 100%; }
      .toolbar-spacer { margin-left: 0; width: 100%; }
      .toolbar-add { width: 100%; justify-content: center; }
      .booking-list .booking-card { max-width: 100%; min-width: 100%; }
      .booking-list.tutor-list .booking-card {
        flex-basis: 100%;
        max-width: 100%;
      }
      .slot-auth-right { width: 100%; }
      .slot-presets { grid-template-columns: 1fr; }
    }
    .booking-container::-webkit-scrollbar { width: 10px; height: 10px; }
    .booking-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .booking-container::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
    .booking-container::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(9, 9, 18, 0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .modal-box { width: min(100%, 500px); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 34px rgba(0,0,0,0.2); max-height: 90vh; display: flex; flex-direction: column; }
    .modal-inner { width: 100%; box-sizing: border-box; background: #fff; padding: 26px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
    .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2px; }
    .modal-header h4 { margin: 0; font-size: 18px; color: #1a1a2e; }
    .modal-close-btn { flex-shrink: 0; width: 28px; height: 28px; border: none; background: transparent; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9a9ab0; transition: background 0.15s, color 0.15s; padding: 0; margin-top: -2px; }
    .modal-close-btn:hover { background: #f1f0f8; color: #1a1a2e; }
    .modal-tutor-row { display: flex; align-items: center; gap: 10px; padding: 12px; background: #fafafa; border-radius: 10px; border: 1px solid #ede9f8; }
    .modal-tutor-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .modal-tutor-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .modal-tutor-name { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .modal-tutor-role { font-size: 11px; color: #9a9ab0; }
    .modal-section-label { font-size: 11px; font-weight: 700; color: #6b46c1; text-transform: uppercase; letter-spacing: 0.04em; }
    .modal-slot-list { display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; scrollbar-color: #c4b5fd #f1f1f1; }
    .modal-slot-list::-webkit-scrollbar { width: 6px; }
    .modal-slot-list::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 6px; }
    .modal-slot-list::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 6px; border: 1px solid transparent; background-clip: padding-box; }
    .modal-slot-list::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
    .modal-slot-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #e6eef7; background: #fff; cursor: pointer; transition: border-color 0.15s, background 0.15s; user-select: none; }
    .modal-slot-item:hover:not(.pending) { border-color: #c4b5fd; background: #faf7ff; }
    .modal-slot-item.selected { border-color: #6b46c1; }
    .modal-slot-item.pending { opacity: 0.65; cursor: default; }
    .modal-slot-checkbox { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #d1d5db; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: border-color 0.15s, background 0.15s; }
    .modal-slot-item.selected .modal-slot-checkbox { border-color: #6b46c1; background: #6b46c1; }
    .modal-slot-item.pending .modal-slot-checkbox { border-color: #7e72bd; background: #7e72bd; }
    .modal-slot-check-icon { color: white; font-size: 12px; width: 12px; height: 12px; line-height: 12px; }
    .modal-slot-time { flex: 1; font-size: 11px; font-weight: 500; color: #3f2e7e; }
    .modal-slot-pending-label { font-size: 9px; font-weight: 600; color: #7e72bd; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    .modal-summary { font-size: 11px; color: #6a6a6a; }
    .modal-summary strong { color: #6b46c1; }
    .modal-helper { font-size: 11px; color: #6a6a6a; }
    .modal-buttons { display: flex; gap: 8px; margin-top: 2px; }
    .modal-primary { flex: 1; background: #6b46c1; color: #fff; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .modal-primary:hover:not(:disabled) { background: #553c9a; }
    .modal-primary:disabled { background: #c4b5fd; cursor: not-allowed; }
    .modal-secondary { flex: 1; background: #edf0fa; color: #4a4a4a; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .modal-reject { flex: 1; background: #fee2e2; color: #b91c1c; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .modal-reject:hover:not(:disabled) { background: #fecaca; }
    .modal-reject:disabled { background: #fef2f2; color: #f87171; cursor: not-allowed; }
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
              <div class="slot-modal-header">
                <h4>New tutor slot</h4>
                <button type="button" class="slot-modal-close-btn" (click)="closeCreateSlotForm()" aria-label="Close">
                  <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">close</mat-icon>
                </button>
              </div>
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
          <div class="booking-list tutor-list">
            @for (tutor of getFilteredTutors(); track trackTutor($index, tutor)) {
              <div class="booking-card">
                <div class="booking-card-header">
                  <img [src]="tutor.img || 'default-avatar.jpg'" alt="avatar" class="booking-avatar">
                  <div class="booking-info">
                    <span class="booking-name">{{ tutor.name }}</span>
                    <p class="booking-role">{{ formatRoleLabel(tutor.role) }}</p>
                  </div>
                  <div class="booking-badge badge-active">
                    <span>{{ formatTutorBadge(tutor.rating) }}</span>
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
                  <div class="booking-detail-row bio">
                    <span class="booking-detail-label">Bio:</span>
                    <span class="booking-detail-value bio-text">{{ tutor.bio || 'No bio yet' }}</span>
                  </div>
                </div>

                <button class="booking-button btn-active" (click)="openBookingModal(tutor)">
                  Book
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
          <div class="booking-list booked-student-list">
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
                <button class="booking-button" [ngClass]="getButtonClass(getLatestSlot(item.time_slots)?.booking_status)" (click)="openStudentSlotsModal(item)">
                  View booked slots
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

    @if (bookingModalTutor) {
      <div class="modal-overlay" (click)="closeBookingModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-inner">
            <div class="modal-header">
              <h4>Book a session</h4>
              <button type="button" class="modal-close-btn" (click)="closeBookingModal()" aria-label="Close">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">close</mat-icon>
              </button>
            </div>

            <div class="modal-tutor-row">
              <img [src]="bookingModalTutor.img || 'default-avatar.jpg'" alt="avatar" class="modal-tutor-avatar">
              <div class="modal-tutor-info">
                <span class="modal-tutor-name">{{ bookingModalTutor.name }}</span>
                <span class="modal-tutor-role">{{ formatRoleLabel(bookingModalTutor.role) }} &bull; {{ formatTutorBadge(bookingModalTutor.rating) }}</span>
              </div>
              <div class="booking-badge badge-active">
                <span>{{ formatTutorBadge(bookingModalTutor.rating) }}</span>
              </div>
            </div>

            <div class="modal-section-label">Available time slots</div>

            @if (isTutorSlotsLoading(bookingModalTutor.id)) {
              <div class="modal-helper">Loading available slots...</div>
            } @else if (getAvailableSlotsByTutor(bookingModalTutor.id).length === 0) {
              <div class="modal-helper">No available time slots for this tutor.</div>
            } @else {
              <div class="modal-slot-list">
                @for (slot of getAvailableSlotsByTutor(bookingModalTutor.id); track slot.id) {
                  <div
                    class="modal-slot-item"
                    [class.selected]="isSlotSelected(slot.id) || (isSlotPending(slot.id) && !slotsToCancel.has(slot.id))"
                    [class.pending]="isSlotPending(slot.id) && !slotsToCancel.has(slot.id)"
                    (click)="toggleSlotSelection(slot.id)">
                    <div class="modal-slot-checkbox">
                      @if (isSlotSelected(slot.id) || (isSlotPending(slot.id) && !slotsToCancel.has(slot.id))) {
                        <mat-icon class="modal-slot-check-icon">check</mat-icon>
                      }
                    </div>
                    <span class="modal-slot-time"
                      [style.text-decoration]="slotsToCancel.has(slot.id) ? 'line-through' : 'none'"
                      [style.color]="slotsToCancel.has(slot.id) ? '#9a9ab0' : ''">{{ formatSlotRange(slot.start_at, slot.end_at) }}</span>
                    @if (isSlotPending(slot.id) && !slotsToCancel.has(slot.id)) {
                      <span class="modal-slot-pending-label">Pending</span>
                    }
                    @if (slotsToCancel.has(slot.id)) {
                      <span class="modal-slot-pending-label" style="color:#b91c1c;border-color:#fecaca;background:#fef9f9">Will cancel</span>
                    }
                  </div>
                }
              </div>

              <div class="modal-summary">
                @if (getTotalChangeCount() === 0) {
                  Select one or more time slots to book or untick pending slots to cancel them.
                } @else if (selectedSlotIds.size > 0 && slotsToCancel.size > 0) {
                  <strong>{{ selectedSlotIds.size }}</strong> slot{{ selectedSlotIds.size > 1 ? 's' : '' }} to book, <strong>{{ slotsToCancel.size }}</strong> to cancel.
                } @else if (slotsToCancel.size > 0) {
                  <strong>{{ slotsToCancel.size }}</strong> pending request{{ slotsToCancel.size > 1 ? 's' : '' }} will be cancelled.
                } @else {
                  <strong>{{ selectedSlotIds.size }}</strong> slot{{ selectedSlotIds.size > 1 ? 's' : '' }} selected.
                }
              </div>
            }

            <div class="modal-buttons">
              <button type="button" class="modal-secondary" [disabled]="actionLoading()" (click)="closeBookingModal()">Cancel</button>
              <button
                type="button"
                class="modal-primary"
                [disabled]="actionLoading() || getTotalChangeCount() === 0"
                (click)="submitBulkBooking()">
                @if (actionLoading()) {
                  <div class="spinner"></div>
                } @else {
                  @if (slotsToCancel.size > 0) {
                    Save changes
                  } @else {
                    Book {{ selectedSlotIds.size }} slot{{ selectedSlotIds.size > 1 ? 's' : '' }}
                  }
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (studentSlotsModalItem) {
      <div class="modal-overlay" (click)="closeStudentSlotsModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-inner">
            <div class="modal-header">
              <h4>Booked slots</h4>
              <button type="button" class="modal-close-btn" (click)="closeStudentSlotsModal()" aria-label="Close">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">close</mat-icon>
              </button>
            </div>

            <div class="modal-tutor-row">
              <img [src]="studentSlotsModalItem.student.img || 'default-avatar.jpg'" alt="avatar" class="modal-tutor-avatar">
              <div class="modal-tutor-info">
                <span class="modal-tutor-name">{{ studentSlotsModalItem.student.name }}</span>
                <span class="modal-tutor-role">{{ studentSlotsModalItem.student.email }}</span>
              </div>
              <div class="booking-badge" [ngClass]="getStudentBadgeClass(studentSlotsModalItem)">
                <span>{{ formatStatusLabel(getLatestSlot(studentSlotsModalItem.time_slots)?.booking_status) }}</span>
              </div>
            </div>

            <div class="modal-section-label">Time slots ({{ studentSlotsModalItem.time_slots.length }})</div>

            <div class="modal-slot-list">
              @for (slot of studentSlotsModalItem.time_slots; track trackSlot($index, slot)) {
                <div
                  class="modal-slot-item"
                  [class.selected]="slot.booking_status === 'pending' && isTutorSlotSelected(slot.booking_id)"
                  [style.cursor]="slot.booking_status === 'pending' ? 'pointer' : 'default'"
                  (click)="slot.booking_status === 'pending' ? toggleTutorSlotSelection(slot.booking_id) : null">
                  <div class="modal-slot-checkbox"
                    [style.border-color]="slot.booking_status === 'pending' ? (isTutorSlotSelected(slot.booking_id) ? '#6b46c1' : '#c4b5fd') : (slot.booking_status === 'confirmed' || slot.booking_status === 'booked' ? '#6b46c1' : '#d1d5db')"
                    [style.background]="(slot.booking_status === 'pending' && isTutorSlotSelected(slot.booking_id)) || slot.booking_status === 'confirmed' || slot.booking_status === 'booked' ? '#6b46c1' : '#fff'">
                    @if ((slot.booking_status === 'pending' && isTutorSlotSelected(slot.booking_id)) || slot.booking_status === 'confirmed' || slot.booking_status === 'booked') {
                      <mat-icon class="modal-slot-check-icon">check</mat-icon>
                    }
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; gap:2px; min-width:0">
                    <span class="modal-slot-time">{{ formatDateTime(slot.start_at) }}</span>
                    <span class="slot-status" [ngClass]="getSlotStatusClass(slot.booking_status)" style="font-size:9px">{{ formatStatusLabel(slot.booking_status) }}</span>
                  </div>
                </div>
              }
            </div>

            <div class="modal-summary">
              @if (getSelectedTutorSlotCount() === 0) {
                Select pending slots to confirm or reject.
              } @else {
                <strong>{{ getSelectedTutorSlotCount() }}</strong> slot{{ getSelectedTutorSlotCount() > 1 ? 's' : '' }} selected.
              }
            </div>

            <div class="modal-buttons">
              <button type="button" class="modal-secondary" [disabled]="actionLoading()" (click)="closeStudentSlotsModal()">Close</button>
              <button type="button" class="modal-reject" [disabled]="actionLoading() || getSelectedTutorSlotCount() === 0" (click)="submitBulkTutorAction('reject')">
                @if (actionLoading()) { <div class="spinner"></div> } @else { Reject }
              </button>
              <button type="button" class="modal-primary" [disabled]="actionLoading() || getSelectedTutorSlotCount() === 0" (click)="submitBulkTutorAction('confirm')">
                @if (actionLoading()) { <div class="spinner"></div> } @else { Confirm }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `, 
})
export class Booking implements OnInit{
  private bookingStore = inject(BookingStore);
  private bookingsService = inject(BookingsService);
  private sessionsService = inject(SessionsService);
  private roomsService = inject(RoomsService);
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
  slotsToCancel = new Set<number>();
  bookingModalTutor: Teacher | null = null;
  selectedSlotIds = new Set<number>();
  studentSlotsModalItem: TutorBookedStudent | null = null;
  selectedTutorBookingIds = new Set<number>();

  ngOnInit(): void {
    // Load booking data for the current user role on page init
    this.bookingStore.loadBookingData();
  }

  isStudentRole(): boolean {
    // Check if the current user is a student
    return this.user().role === 'student';
  }

  isTutorRole(): boolean {
    // Check if the current user is a tutor
    return this.user().role === 'tutor';
  }

  onSearchChange(value: string) {
    // Update the search term (trimmed, lowercase) for filtering
    this.searchValue = value.trim().toLowerCase();
  }

  getFilteredTutors(): Teacher[] {
    // Filter the tutor list by search text, role, and rating
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
    // Filter booked-student records by search text, slot status and slot date; also filter each student's slot list
    return this.bookedStudents().filter((item) => {
      const matchesSearch = !this.searchValue || [item.student.name, item.student.email, item.student.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(this.searchValue));
      const matchingSlots = item.time_slots.filter((slot) => this.matchesSlotStatus(slot) && this.matchesSlotDate(slot));

      return matchesSearch && matchingSlots.length > 0;
    }).map((item) => ({
      ...item,
      // Replace the full slot list with only the slots that passed the filters
      time_slots: item.time_slots.filter((slot) => this.matchesSlotStatus(slot) && this.matchesSlotDate(slot)),
    }));
  }

  getStudentBadgeClass(item: TutorBookedStudent): string {
    // Use the latest slot's booking status to determine the badge color
    const latestSlot = this.getLatestSlot(item.time_slots);
    const status = latestSlot?.booking_status || 'pending';
    return this.getStatusBadgeClass(status);
  }

  getStatusBadgeClass(status?: string): string {
    // Map a booking status to its CSS badge class
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
    // Map a booking status to its CSS button class
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
    // Map a slot booking status to its inline CSS class for the status label
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
    // Return the most recently scheduled slot (sorted by descending start time)
    return [...timeSlots].sort((left, right) => new Date(right.start_at).getTime() - new Date(left.start_at).getTime())[0];
  }

  getNextSlot(timeSlots: BookedTimeSlot[]): BookedTimeSlot | undefined {
    // Return the nearest upcoming slot (start time >= now, sorted ascending)
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

  formatTutorBadge(rating?: string | null): string {
    return rating || 'N/A';
  }

  formatRoleLabel(role?: string): string {
    if (!role) {
      return 'Tutor';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  formatStatusLabel(status?: string): string {
    // Capitalize the status string for display; fallback to 'Completed' for missing status
    if (!status) {
      return 'Completed';
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getSlotSummary(item: TutorBookedStudent): string {
    // Show the next upcoming slot if available; otherwise fall back to the most recent past slot
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
    // Collapse the panel if already open; otherwise open it and refresh available slots
    if (this.expandedTutorId === tutorId) {
      this.expandedTutorId = null;
      return;
    }

    this.expandedTutorId = tutorId;
    this.bookingStore.loadAvailableSlotsByTutor(tutorId, true);
  }

  isTutorExpanded(tutorId: number): boolean {
    // Check whether this tutor's details panel is currently open
    return this.expandedTutorId === tutorId;
  }

  isTutorSlotsLoading(tutorId: number): boolean {
    // Check whether slots for this tutor are still being fetched
    return !!this.slotsLoadingByTutor()[tutorId];
  }

  getAvailableSlotsByTutor(tutorId: number): TimeSlot[] {
    // Return the cached available slots for a tutor (empty array if not loaded yet)
    return this.availableSlotsByTutor()[tutorId] || [];
  }

  toggleSlotBooking(teacherId: number, timeSlotId: number): void {
    // Toggle: cancel the pending request if one exists, otherwise create a new one
    if (this.isSlotPending(timeSlotId)) {
      this.cancelPendingBooking(teacherId, timeSlotId);
      return;
    }

    this.createPendingBooking(teacherId, timeSlotId);
  }

  isSlotPending(slotId: number): boolean {
    // True when a pending booking request has been sent for this slot
    return !!this.pendingSlotBookingIds[slotId];
  }

  confirmBooking(bookingId: number, timeSlotId: number, event?: Event): void {
    // Prevent event bubbling, close the action panel, then confirm the booking
    event?.stopPropagation();
    this.activeTutorPendingBookingId = null;
    this.confirmBookingRequest(bookingId, timeSlotId);
  }

  rejectBooking(bookingId: number, event?: Event): void {
    // Prevent event bubbling, close the action panel, then reject the booking
    event?.stopPropagation();
    this.activeTutorPendingBookingId = null;
    this.rejectBookingRequest(bookingId);
  }

  toggleTutorPendingActions(slot: BookedTimeSlot): void {
    // Only pending slots have inline confirm/reject actions; ignore others
    if (slot.booking_status !== 'pending') {
      this.activeTutorPendingBookingId = null;
      return;
    }

    // Toggle the action row for this slot
    this.activeTutorPendingBookingId = this.activeTutorPendingBookingId === slot.booking_id
      ? null
      : slot.booking_id;
  }

  isTutorPendingActionOpen(slot: BookedTimeSlot): boolean {
    // Check whether the inline action row is currently visible for this slot
    return this.activeTutorPendingBookingId === slot.booking_id;
  }

  toggleBookedSlots(studentId: number): void {
    // Expand or collapse a student's booked slot list; clear pending action on collapse
    const isExpanded = this.expandedBookedStudentId === studentId;
    this.expandedBookedStudentId = isExpanded ? null : studentId;
    if (isExpanded) {
      this.activeTutorPendingBookingId = null;
    }
  }

  isBookedSlotsExpanded(studentId: number): boolean {
    // Check whether this student's booked slot list is currently visible
    return this.expandedBookedStudentId === studentId;
  }

  openBookingModal(tutor: Teacher): void {
    this.bookingModalTutor = tutor;
    this.selectedSlotIds = new Set<number>();
    this.slotsToCancel = new Set<number>();
    // Pre-populate pendingSlotBookingIds from backend so pending state survives page reloads
    this.bookingsService.bookingsList().subscribe({
      next: (bookings) => {
        bookings
          .filter((b) => b.teacher?.id === tutor.id && b.status === BookingStatusEnum.Pending)
          .forEach((b) => {
            if (b.time_slot?.id && b.id) {
              this.pendingSlotBookingIds[b.time_slot.id] = b.id;
            }
          });
      },
    });
    this.bookingStore.loadAvailableSlotsByTutor(tutor.id, true);
  }

  openStudentSlotsModal(item: TutorBookedStudent): void {
    this.studentSlotsModalItem = item;
    this.selectedTutorBookingIds = new Set<number>();
    this.activeTutorPendingBookingId = null;
  }

  closeStudentSlotsModal(): void {
    if (this.actionLoading()) return;
    this.studentSlotsModalItem = null;
    this.selectedTutorBookingIds = new Set<number>();
    this.activeTutorPendingBookingId = null;
  }

  toggleTutorSlotSelection(bookingId: number): void {
    const next = new Set(this.selectedTutorBookingIds);
    if (next.has(bookingId)) {
      next.delete(bookingId);
    } else {
      next.add(bookingId);
    }
    this.selectedTutorBookingIds = next;
  }

  isTutorSlotSelected(bookingId: number): boolean {
    return this.selectedTutorBookingIds.has(bookingId);
  }

  getSelectedTutorSlotCount(): number {
    return this.selectedTutorBookingIds.size;
  }

  submitBulkTutorAction(action: 'confirm' | 'reject'): void {
    if (!this.studentSlotsModalItem || this.selectedTutorBookingIds.size === 0) return;
    const bookingIds = Array.from(this.selectedTutorBookingIds);
    this.actionLoading.set(true);
    this.clearMessages();

    if (action === 'reject') {
      const requests = bookingIds.map((id) =>
        this.bookingsService.bookingsPartialUpdate(id, { status: BookingStatusEnum.Cancelled }),
      );
      forkJoin(requests).subscribe({
        next: () => {
          this.setSuccessMessage(`${bookingIds.length} booking${bookingIds.length > 1 ? 's' : ''} rejected.`);
          this.actionLoading.set(false);
          this.selectedTutorBookingIds = new Set<number>();
          this.studentSlotsModalItem = null;
          this.bookingStore.loadBookingData();
        },
        error: (err: any) => {
          this.setErrorMessage('Failed to reject bookings: ' + err.message);
          this.actionLoading.set(false);
        },
      });
    } else {
      const requests = bookingIds.map((id) =>
        this.bookingsService.bookingsConfirmCreate(id).pipe(
          switchMap((booking) => this.ensureRoomForConfirmedBooking(booking)),
        ),
      );
      forkJoin(requests).subscribe({
        next: () => {
          this.setSuccessMessage(`${bookingIds.length} booking${bookingIds.length > 1 ? 's' : ''} confirmed.`);
          this.actionLoading.set(false);
          this.selectedTutorBookingIds = new Set<number>();
          this.studentSlotsModalItem = null;
          this.bookingStore.loadBookingData();
        },
        error: (err: any) => {
          this.setErrorMessage('Failed to confirm bookings: ' + err.message);
          this.actionLoading.set(false);
        },
      });
    }
  }

  confirmBookingInModal(bookingId: number, timeSlotId: number, event?: Event): void {
    event?.stopPropagation();
    this.activeTutorPendingBookingId = null;
    // Optimistically update the slot status in the modal item so UI reflects immediately
    if (this.studentSlotsModalItem) {
      this.studentSlotsModalItem = {
        ...this.studentSlotsModalItem,
        time_slots: this.studentSlotsModalItem.time_slots.map((s) =>
          s.booking_id === bookingId ? { ...s, booking_status: 'confirmed' } : s,
        ),
      };
    }
    this.confirmBookingRequest(bookingId, timeSlotId);
  }

  closeBookingModal(): void {
    if (this.actionLoading()) return;
    this.bookingModalTutor = null;
    this.selectedSlotIds = new Set<number>();
    this.slotsToCancel = new Set<number>();
  }

  toggleSlotSelection(slotId: number): void {
    if (this.isSlotPending(slotId)) {
      const next = new Set(this.slotsToCancel);
      if (next.has(slotId)) { next.delete(slotId); } else { next.add(slotId); }
      this.slotsToCancel = next;
      return;
    }
    const next = new Set(this.selectedSlotIds);
    if (next.has(slotId)) {
      next.delete(slotId);
    } else {
      next.add(slotId);
    }
    this.selectedSlotIds = next;
  }

  cancelPendingBookingFromModal(slotId: number): void {
    const tutor = this.bookingModalTutor;
    if (!tutor) return;
    const bookingId = this.pendingSlotBookingIds[slotId];
    if (!bookingId) return;
    this.actionLoading.set(true);
    this.clearMessages();
    this.bookingsService.bookingsDestroy(bookingId).subscribe({
      next: () => {
        delete this.pendingSlotBookingIds[slotId];
        this.slotsToCancel = new Set(Array.from(this.slotsToCancel).filter(id => id !== slotId));
        this.setSuccessMessage('Booking request cancelled.');
        this.bookingStore.loadAvailableSlotsByTutor(tutor.id, true);
        this.actionLoading.set(false);
      },
      error: (err: any) => {
        this.setErrorMessage('Failed to cancel booking request: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  getTotalChangeCount(): number {
    return this.selectedSlotIds.size + this.slotsToCancel.size;
  }

  isSlotSelected(slotId: number): boolean {
    return this.selectedSlotIds.has(slotId);
  }

  getSelectedSlotCount(): number {
    return this.selectedSlotIds.size;
  }

  submitBulkBooking(): void {
    const tutor = this.bookingModalTutor;
    const currentUser = this.user();
    if (!tutor || !currentUser?.id || currentUser.role !== 'student') return;

    if (this.getTotalChangeCount() === 0) return;

    this.actionLoading.set(true);
    this.clearMessages();

    const cancelSlotIds = Array.from(this.slotsToCancel);
    const newSlotIds = Array.from(this.selectedSlotIds);

    const cancelRequests = cancelSlotIds.map((slotId) => {
      const bookingId = this.pendingSlotBookingIds[slotId];
      return this.bookingsService.bookingsDestroy(bookingId).pipe(
        map(() => ({ type: 'cancel' as const, slotId })),
      );
    });

    const bookRequests = newSlotIds.map((timeSlotId) =>
      this.bookingsService.bookingsCreate({
        teacher: tutor.id,
        time_slot: timeSlotId,
        student: currentUser.id,
        status: BookingStatusEnum.Pending,
      } as unknown as BookingPayload).pipe(
        map((createdBooking) => ({ type: 'book' as const, timeSlotId, bookingId: createdBooking?.id })),
      ),
    );

    forkJoin([...cancelRequests, ...bookRequests]).subscribe({
      next: (results) => {
        results.forEach((r) => {
          if (r.type === 'cancel') {
            delete this.pendingSlotBookingIds[r.slotId];
          } else if (r.bookingId) {
            this.pendingSlotBookingIds[r.timeSlotId] = r.bookingId;
          }
        });
        const booked = results.filter(r => r.type === 'book').length;
        const cancelled = results.filter(r => r.type === 'cancel').length;
        const parts: string[] = [];
        if (booked > 0) parts.push(`${booked} request${booked > 1 ? 's' : ''} sent`);
        if (cancelled > 0) parts.push(`${cancelled} request${cancelled > 1 ? 's' : ''} cancelled`);
        this.setSuccessMessage(parts.join(', ') + '.');
        this.bookingStore.loadAvailableSlotsByTutor(tutor.id, true);
        this.actionLoading.set(false);
        this.closeBookingModal();
      },
      error: (err) => {
        this.setErrorMessage('Failed to apply booking changes: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  openCreateSlotForm(): void {
    // Show the create-slot modal
    this.showCreateSlotForm = true;
  }

  closeCreateSlotForm(): void {
    // Block close while an action is in progress; otherwise hide and reset form fields
    if (this.actionLoading()) {
      return;
    }

    this.showCreateSlotForm = false;
    this.newSlotStartAt = '';
    this.newSlotEndAt = '';
  }

  get minStartAt(): string {
    // The earliest allowed start time is the current moment
    return this.toDateTimeLocalValue(new Date());
  }

  get minEndAt(): string {
    // End time must be at or after the chosen start time (or current time if start not set)
    return this.newSlotStartAt || this.minStartAt;
  }

  get isSlotRangeInvalid(): boolean {
    // Validation: end must be strictly after start
    if (!this.newSlotStartAt || !this.newSlotEndAt) {
      return false;
    }

    return new Date(this.newSlotEndAt).getTime() <= new Date(this.newSlotStartAt).getTime();
  }

  get slotDurationText(): string {
    // Compute a human-readable duration string (e.g., '1h 30m') from the selected range
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
    // Calculate an end time by adding `minutes` to the current start time (or now if unset)
    const baseStart = this.newSlotStartAt ? new Date(this.newSlotStartAt) : new Date();
    if (!this.newSlotStartAt) {
      this.newSlotStartAt = this.toDateTimeLocalValue(baseStart);
    }

    const end = new Date(baseStart.getTime() + minutes * 60000);
    this.newSlotEndAt = this.toDateTimeLocalValue(end);
  }

  submitCreateSlot(): void {
    // Submit the slot creation form and close the modal on success
    this.createTutorTimeSlot(() => {
      this.closeCreateSlotForm();
    });
  }

  private createPendingBooking(teacherId: number, timeSlotId: number): void {
    const currentUser = this.user();
    // Guard: only authenticated students can create a booking request
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
          // Track the booking ID locally so we can cancel it later
          this.pendingSlotBookingIds[timeSlotId] = bookingId;
        }
        this.setSuccessMessage('Booking request sent, waiting for tutor confirmation.');
        // Reload slots for this tutor to reflect the now-taken slot
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
    // Guard: only the student who created the request can cancel it
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
        // Remove the local tracking entry so the slot appears available again
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
    // Guard: only tutors can confirm bookings
    if (this.user().role !== 'tutor') {
      this.setErrorMessage('Only tutors can confirm bookings.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    // Confirm the booking then ensure a WebRTC room exists for the resulting session
    this.bookingsService.bookingsConfirmCreate(bookingId).pipe(
      switchMap((booking) => this.ensureRoomForConfirmedBooking(booking)),
    ).subscribe({
      next: () => {
        this.setSuccessMessage('Booking confirmed, session created, and room is ready.');
        this.actionLoading.set(false);
        this.bookingStore.loadBookingData();
      },
      error: (err: any) => {
        this.setErrorMessage('Failed to confirm booking: ' + err.message);
        this.actionLoading.set(false);
      },
    });
  }

  private ensureRoomForConfirmedBooking(booking: BookingDetail) {
    return this.findTutorSessionForBooking(booking).pipe(
      switchMap((session) => {
        if (!session?.id) {
          throw new Error('Confirmed session could not be found.');
        }

        return this.roomsService.roomsBySessionRetrieve(session.id).pipe(
          // Room already exists — continue
          map(() => session),
          catchError((error) => {
            // Only create a new room if the existing one was not found (404)
            if (error?.status !== 404) {
              throw error;
            }

            return this.roomsService.roomsCreate({
              session: session.id,
              room_code: this.buildRoomCode(booking.teacher?.name),
            } as RoomPayload).pipe(map(() => session));
          }),
        );
      }),
    );
  }

  private findTutorSessionForBooking(booking: BookingDetail) {
    const tutorId = booking.teacher?.id;
    const studentId = booking.student?.id;
    const timeSlotId = booking.time_slot?.id;

    if (!tutorId || !studentId || !timeSlotId) {
      throw new Error('Missing booking data required to create a room.');
    }

    return this.sessionsService.sessionsByTutorList(tutorId).pipe(
      map((sessions) => {
        // Prefer an exact match on student + time slot
        const matchedSession = sessions.find((session) =>
          session.student?.id === studentId && session.time_slot?.id === timeSlotId,
        );

        if (matchedSession) {
          return matchedSession;
        }

        // Fall back to the latest session for this student with the tutor
        return [...sessions]
          .filter((session) => session.student?.id === studentId)
          .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0] ?? null;
      }),
      switchMap((session) => session ? of(session) : this.fetchSessionByStudentFallback(studentId, tutorId, timeSlotId)),
    );
  }

  private fetchSessionByStudentFallback(studentId: number, tutorId: number, timeSlotId: number) {
    // Secondary lookup: search from the student's side when tutor-side search failed
    return this.sessionsService.sessionsByStudentList(studentId).pipe(
      map((sessions) => {
        const matchedSession = sessions.find((session) =>
          session.teacher?.id === tutorId && session.time_slot?.id === timeSlotId,
        );

        if (!matchedSession) {
          throw new Error('Confirmed session could not be found.');
        }

        return matchedSession;
      }),
    );
  }

  private buildRoomCode(tutorName?: string): string {
    // Slugify the tutor's name and append a 6-character random suffix
    const normalizedTutorName = (tutorName ?? 'tutor')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tutor';

    const randomSuffix = Array.from({ length: 6 }, () => {
      const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
      return characters.charAt(Math.floor(Math.random() * characters.length));
    }).join('');

    return `${normalizedTutorName}-${randomSuffix}`;
  }

  private rejectBookingRequest(bookingId: number): void {
    // Guard: only tutors can reject bookings
    if (this.user().role !== 'tutor') {
      this.setErrorMessage('Only tutors can reject bookings.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    // Set the booking status to CANCELLED via a partial update
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
    // Guard: only authenticated tutors may create time slots
    if (!currentUser?.id || currentUser.role !== 'tutor') {
      this.setErrorMessage('Only tutors can create time slots.');
      return;
    }

    if (!this.newSlotStartAt || !this.newSlotEndAt) {
      this.setErrorMessage('Please select start and end time.');
      return;
    }

    // Validate that end time is strictly after start time
    const startTime = new Date(this.newSlotStartAt).getTime();
    const endTime = new Date(this.newSlotEndAt).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      this.setErrorMessage('End time must be later than start time.');
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();

    // Convert local datetime-local strings to ISO 8601 before sending to the API
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
    // Convert a Date to the YYYY-MM-DDTHH:MM format required by <input type="datetime-local">
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
    // Numeric comparison to determine if a tutor's rating satisfies the selected filter
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
    // Match a slot against the active status filter
    return this.filterStatus === 'all' || slot.booking_status === this.filterStatus;
  }

  private matchesSlotDate(slot: BookedTimeSlot): boolean {
    // Match a slot against the active date-range filter
    if (this.filterDate === 'all') {
      return true;
    }

    const slotDate = new Date(slot.start_at);
    const now = new Date();

    if (this.filterDate === 'today') {
      return slotDate.toDateString() === now.toDateString();
    }

    if (this.filterDate === 'this-week') {
      // Compute Sunday-to-Saturday week boundaries
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
