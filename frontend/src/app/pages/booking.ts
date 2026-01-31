import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { Search } from '../components/shared/search/search';
import { BookingDetail, BookingsService, Teacher, TeachersService } from '../apis';

@Component({
  selector: 'app-booking',
  imports: [CommonModule, FormsModule, Search],
  styles: `
    .booking-container { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .title { font-size: 14px; font-weight: 500; height: 25px; }
    .toolbar { width: 100%; flex-wrap: wrap; }
    .filter-select { background: white; color: black; padding: 10px 30px 10px 15px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.12); cursor: pointer; font-size: 11px; font-weight: 500; outline: none; transition: all 0.3s; min-width: 100px; flex: 0 0 auto; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }
    app-search { flex: 1; min-width: 420px; }
    .booking-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 30px; }
    .booking-card { background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; }
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
    .booking-detail-label { font-size: 11px; color: #acacacff; }
    .booking-detail-value { font-size: 11px; font-weight: 500; }
    .booking-button { color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
    .booking-button:hover { opacity: 0.9; }
    .btn-active { background-color: #6b46c1; }
    .btn-pending { background-color: #7e72bdff; }
    .btn-completed { background-color: #3432c0ff; }
    .btn-cancelled { background-color: #bb295fff; }
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

      @if (user().role === 'student') {
        <div class="toolbar mt-20 flex-cen gap-20">
          <app-search placeholder="Search bookings..."></app-search>
          
          <select class="filter-select" [(ngModel)]="filterStatus" (change)="onFilterChange()">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select class="filter-select" [(ngModel)]="filterSubject" (change)="onFilterChange()">
            <option value="all">All Subjects</option>
            <option value="mathematics">Mathematics</option>
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="biology">Biology</option>
            <option value="english">English</option>
            <option value="history">History</option>
          </select>

          <select class="filter-select" [(ngModel)]="filterTeacher" (change)="onFilterChange()">
            <option value="all">All Teachers</option>
            <option value="teacher">Teachers</option>
            <option value="tutor">Tutors</option>
          </select>

          <select class="filter-select" [(ngModel)]="filterDate" (change)="onFilterChange()">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
          </select>
        </div>

        <div class="booking-grid">
          <!-- Active Booking 1 -->
          <div class="booking-card">
            <div class="booking-card-header">
              <img src="default-avatar.jpg" alt="avatar" class="booking-avatar">
              <div class="booking-info">
                <span class="booking-name">Nguyễn Văn Minh</span>
                <p class="booking-role">Teacher</p>
              </div>
              <div class="booking-badge badge-active">
                <span>Active</span>
              </div>
            </div>
            <div class="booking-divider"></div>
            <div class="booking-details">
              <div class="booking-detail-row">
                <span class="booking-detail-label">Subject:</span>
                <span class="booking-detail-value">Mathematics</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Session:</span>
                <span class="booking-detail-value">2h/week</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Next class:</span>
                <span class="booking-detail-value">Today 3PM</span>
              </div>
            </div>
            <button class="booking-button btn-active">View Details</button>
          </div>

          <!-- Pending Booking 1 -->
          <div class="booking-card">
            <div class="booking-card-header">
              <img src="default-avatar.jpg" alt="avatar" class="booking-avatar">
              <div class="booking-info">
                <span class="booking-name">Trần Thị Hương</span>
                <p class="booking-role">Tutor</p>
              </div>
              <div class="booking-badge badge-pending">
                <span>Pending</span>
              </div>
            </div>
            <div class="booking-divider"></div>
            <div class="booking-details">
              <div class="booking-detail-row">
                <span class="booking-detail-label">Subject:</span>
                <span class="booking-detail-value">Physics</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Session:</span>
                <span class="booking-detail-value">1.5h/week</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Start date:</span>
                <span class="booking-detail-value">Jan 20, 2026</span>
              </div>
            </div>
            <button class="booking-button btn-pending">View Details</button>
          </div>

          <!-- Completed Booking -->
          <div class="booking-card">
            <div class="booking-card-header">
              <img src="default-avatar.jpg" alt="avatar" class="booking-avatar">
              <div class="booking-info">
                <span class="booking-name">Lê Văn Hải</span>
                <p class="booking-role">Teacher</p>
              </div>
              <div class="booking-badge badge-completed">
                <span>Completed</span>
              </div>
            </div>
            <div class="booking-divider"></div>
            <div class="booking-details">
              <div class="booking-detail-row">
                <span class="booking-detail-label">Subject:</span>
                <span class="booking-detail-value">Chemistry</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Session:</span>
                <span class="booking-detail-value">2h/week</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Ended:</span>
                <span class="booking-detail-value">Dec 31, 2025</span>
              </div>
            </div>
            <button class="booking-button btn-completed">Ended</button>
          </div>

          <!-- Active Booking 2 -->
          <div class="booking-card">
            <div class="booking-card-header">
              <img src="default-avatar.jpg" alt="avatar" class="booking-avatar">
              <div class="booking-info">
                <span class="booking-name">Phạm Văn Long</span>
                <p class="booking-role">Teacher</p>
              </div>
              <div class="booking-badge badge-active">
                <span>Active</span>
              </div>
            </div>
            <div class="booking-divider"></div>
            <div class="booking-details">
              <div class="booking-detail-row">
                <span class="booking-detail-label">Subject:</span>
                <span class="booking-detail-value">Biology</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Session:</span>
                <span class="booking-detail-value">1.5h/week</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Next class:</span>
                <span class="booking-detail-value">Tomorrow 10AM</span>
              </div>
            </div>
            <button class="booking-button btn-active">View Details</button>
          </div>

          <!-- Cancelled Booking -->
          <div class="booking-card">
            <div class="booking-card-header">
              <img src="default-avatar.jpg" alt="avatar" class="booking-avatar">
              <div class="booking-info">
                <span class="booking-name">Hoàng Thị Mai</span>
                <p class="booking-role">Tutor</p>
              </div>
              <div class="booking-badge badge-cancelled">
                <span>Cancelled</span>
              </div>
            </div>
            <div class="booking-divider"></div>
            <div class="booking-details">
              <div class="booking-detail-row">
                <span class="booking-detail-label">Subject:</span>
                <span class="booking-detail-value">English</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Session:</span>
                <span class="booking-detail-value">1h/week</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Cancelled:</span>
                <span class="booking-detail-value">Jan 10, 2026</span>
              </div>
            </div>
            <button class="booking-button btn-cancelled">Cancelled</button>
          </div>

          <!-- Pending Booking 2 -->
          <div class="booking-card">
            <div class="booking-card-header">
              <img src="default-avatar.jpg" alt="avatar" class="booking-avatar">
              <div class="booking-info">
                <span class="booking-name">Đặng Văn Tuấn</span>
                <p class="booking-role">Teacher</p>
              </div>
              <div class="booking-badge badge-pending">
                <span>Pending</span>
              </div>
            </div>
            <div class="booking-divider"></div>
            <div class="booking-details">
              <div class="booking-detail-row">
                <span class="booking-detail-label">Subject:</span>
                <span class="booking-detail-value">History</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Session:</span>
                <span class="booking-detail-value">2h/week</span>
              </div>
              <div class="booking-detail-row">
                <span class="booking-detail-label">Start date:</span>
                <span class="booking-detail-value">Feb 1, 2026</span>
              </div>
            </div>
            <button class="booking-button btn-pending">View Details</button>
          </div>
        </div>
      }
    </div>  
  `, 
})
export class Booking implements OnInit{
  private userService = inject(UserService);
  private bookingService = inject(BookingsService);
  private teacherService = inject(TeachersService);

  bookings = signal<BookingDetail[]>([]);
  tutors = signal<Teacher[]>([]);
  
  user = this.userService.user;
  
  filterStatus: string = 'all';
  filterSubject: string = 'all';
  filterTeacher: string = 'all';
  filterDate: string = 'all';

  ngOnInit(): void {
    this.bookingList();
    this.tutorList();
  }

  bookingList() {
    this.bookingService.bookingsList().subscribe({
      next: (res) => {
        this.bookings.set(res);
      },
      error: (err) => {
        console.error('Error fetching bookings:', err);
      }
    });
  }

  tutorList() {
    this.teacherService.teachersTutorsList().subscribe({
      next: (res) => {
        this.tutors.set(res);
      },
      error: (err) => {
        console.error('Error fetching tutors:', err);
      }
    });  
  }

  onFilterChange() {
    console.log('Filters changed:', {
      status: this.filterStatus,
      subject: this.filterSubject,
      teacher: this.filterTeacher,
      date: this.filterDate
    });
  }
}
