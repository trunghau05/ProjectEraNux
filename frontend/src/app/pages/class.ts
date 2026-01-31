import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { Search } from '../components/shared/search/search';

@Component({
  selector: 'app-class',
  imports: [CommonModule, FormsModule, Search],
  styles: `
    .class-container { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .title { font-size: 14px; font-weight: 500; height: 25px; }
    .toolbar { width: 100%; flex-wrap: wrap; }
    .filter-select { background: white; color: black; padding: 10px 30px 10px 15px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.12); cursor: pointer; font-size: 11px; font-weight: 500; outline: none; transition: all 0.3s; min-width: 100px; flex: 0 0 auto; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }
    app-search { flex: 1; min-width: 420px; }
    .class-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 30px; }
    .class-card { background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; }
    .class-card-header { display: flex; align-items: center; gap: 12px; }
    .class-icon { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: white; }
    .icon-mathematics { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .icon-physics { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .icon-chemistry { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .icon-biology { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .icon-english { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .icon-history { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }
    .class-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .class-name { font-size: 12px; font-weight: 500; }
    .class-teacher { font-size: 10px; color: #acacacff; margin: 0; }
    .class-badge { padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; }
    .class-badge span { font-size: 9px; color: white; font-weight: 500; }
    .badge-ongoing { background-color: #6b46c1; }
    .badge-upcoming { background-color: #7e72bdff; }
    .badge-completed { background-color: #3432c0ff; }
    .class-divider { border-bottom: 1px solid #f1f1f1; }
    .class-details { display: flex; flex-direction: column; gap: 8px; }
    .class-detail-row { display: flex; justify-content: space-between; }
    .class-detail-label { font-size: 11px; color: #acacacff; }
    .class-detail-value { font-size: 11px; font-weight: 500; }
    .class-button { color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
    .class-button:hover { opacity: 0.9; }
    .btn-ongoing { background-color: #6b46c1; }
    .btn-upcoming { background-color: #7e72bdff; }
    .btn-completed { background-color: #3432c0ff; }
    .class-container::-webkit-scrollbar { width: 10px; height: 10px; }
    .class-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .class-container::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
    .class-container::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
  `,
  template: `
    <div class="class-container">
      <div class="title d-flex items-cen">
        <span>Classes</span>
      </div>

      <div class="toolbar mt-20 flex-cen gap-20">
        <app-search placeholder="Search classes..."></app-search>
        
        <select class="filter-select" [(ngModel)]="filterStatus" (change)="onFilterChange()">
          <option value="all">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
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

        <select class="filter-select" [(ngModel)]="filterTime" (change)="onFilterChange()">
          <option value="all">All Time</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>

        <select class="filter-select" [(ngModel)]="filterDay" (change)="onFilterChange()">
          <option value="all">All Days</option>
          <option value="weekday">Weekdays</option>
          <option value="weekend">Weekends</option>
        </select>
      </div>

      <div class="class-grid">
        <!-- Ongoing Class 1 -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-mathematics">M</div>
            <div class="class-info">
              <span class="class-name">Advanced Mathematics</span>
              <p class="class-teacher">Nguyễn Văn Minh</p>
            </div>
            <div class="class-badge badge-ongoing">
              <span>Ongoing</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Mon, Wed 3PM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">24/30</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Room:</span>
              <span class="class-detail-value">A101</span>
            </div>
          </div>
          <button class="class-button btn-ongoing">View Details</button>
        </div>

        <!-- Upcoming Class 1 -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-physics">P</div>
            <div class="class-info">
              <span class="class-name">Quantum Physics</span>
              <p class="class-teacher">Trần Thị Hương</p>
            </div>
            <div class="class-badge badge-upcoming">
              <span>Upcoming</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Tue, Thu 10AM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">18/25</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Start date:</span>
              <span class="class-detail-value">Feb 1, 2026</span>
            </div>
          </div>
          <button class="class-button btn-upcoming">View Details</button>
        </div>

        <!-- Completed Class -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-chemistry">C</div>
            <div class="class-info">
              <span class="class-name">Organic Chemistry</span>
              <p class="class-teacher">Lê Văn Hải</p>
            </div>
            <div class="class-badge badge-completed">
              <span>Completed</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Mon, Wed 2PM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">28/30</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Ended:</span>
              <span class="class-detail-value">Dec 20, 2025</span>
            </div>
          </div>
          <button class="class-button btn-completed">View Details</button>
        </div>

        <!-- Ongoing Class 2 -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-biology">B</div>
            <div class="class-info">
              <span class="class-name">Cell Biology</span>
              <p class="class-teacher">Phạm Văn Long</p>
            </div>
            <div class="class-badge badge-ongoing">
              <span>Ongoing</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Fri 9AM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">22/25</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Room:</span>
              <span class="class-detail-value">B204</span>
            </div>
          </div>
          <button class="class-button btn-ongoing">View Details</button>
        </div>

        <!-- Upcoming Class 2 -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-english">E</div>
            <div class="class-info">
              <span class="class-name">Business English</span>
              <p class="class-teacher">Hoàng Thị Mai</p>
            </div>
            <div class="class-badge badge-upcoming">
              <span>Upcoming</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Tue, Thu 4PM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">15/20</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Start date:</span>
              <span class="class-detail-value">Jan 28, 2026</span>
            </div>
          </div>
          <button class="class-button btn-upcoming">View Details</button>
        </div>

        <!-- Ongoing Class 3 -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-history">H</div>
            <div class="class-info">
              <span class="class-name">World History</span>
              <p class="class-teacher">Đặng Văn Tuấn</p>
            </div>
            <div class="class-badge badge-ongoing">
              <span>Ongoing</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Wed, Fri 1PM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">30/30</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Room:</span>
              <span class="class-detail-value">C305</span>
            </div>
          </div>
          <button class="class-button btn-ongoing">View Details</button>
        </div>

        <!-- Completed Class 2 -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-mathematics">M</div>
            <div class="class-info">
              <span class="class-name">Calculus I</span>
              <p class="class-teacher">Nguyễn Văn Minh</p>
            </div>
            <div class="class-badge badge-completed">
              <span>Completed</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Mon, Wed 9AM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">26/30</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Ended:</span>
              <span class="class-detail-value">Jan 15, 2026</span>
            </div>
          </div>
          <button class="class-button btn-completed">View Details</button>
        </div>

        <!-- Upcoming Class 3 -->
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-icon icon-physics">P</div>
            <div class="class-info">
              <span class="class-name">Classical Mechanics</span>
              <p class="class-teacher">Trần Thị Hương</p>
            </div>
            <div class="class-badge badge-upcoming">
              <span>Upcoming</span>
            </div>
          </div>
          <div class="class-divider"></div>
          <div class="class-details">
            <div class="class-detail-row">
              <span class="class-detail-label">Schedule:</span>
              <span class="class-detail-value">Mon, Thu 11AM</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Students:</span>
              <span class="class-detail-value">20/25</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Start date:</span>
              <span class="class-detail-value">Feb 5, 2026</span>
            </div>
          </div>
          <button class="class-button btn-upcoming">View Details</button>
        </div>
      </div>
    </div>  
  `,
})
export class Class {
  private userService = inject(UserService);
  
  user = this.userService.user;
  
  filterStatus: string = 'all';
  filterSubject: string = 'all';
  filterTime: string = 'all';
  filterDay: string = 'all';

  onFilterChange() {
    console.log('Filters changed:', {
      status: this.filterStatus,
      subject: this.filterSubject,
      time: this.filterTime,
      day: this.filterDay
    });
  }
}