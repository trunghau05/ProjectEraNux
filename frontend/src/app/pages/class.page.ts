import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Search } from '../components/shared/search/search.component';
import { ClassDetail, ClassesService } from '../apis';
import { ClassListStore } from '../stores/class.store';
import { ToastService } from '../services/toast.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-class',
  imports: [CommonModule, FormsModule, Search, MatIconModule],
  styles: `
    .class-container { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .title { font-size: 14px; font-weight: 500; height: 25px; }
    .toolbar { width: 100%; flex-wrap: wrap; }
    .filter-select { background: white; color: black; padding: 10px 30px 10px 15px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.12); cursor: pointer; font-size: 11px; font-weight: 500; outline: none; transition: all 0.3s; min-width: 100px; flex: 0 0 auto; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }
    app-search { flex: 1; min-width: 420px; }
    .class-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 30px; }
    .class-card { background-color: white; border-radius: 10px; padding: 13px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; }
    .class-card-header { display: flex; align-items: center; gap: 10px; }
    .class-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: white; flex-shrink: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
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
    .class-button { color: white; border: none; border-radius: 5px; padding: 7px; font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
    .class-button:hover { opacity: 0.9; }
    .class-button:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-open { background-color: #6b46c1; }
    .btn-full { background-color: #2f855a; }
    .btn-closed { background-color: #718096; }
    .btn-complete { background-color: #3432c0ff; }
    .class-empty { margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: #fafafa; border: 1px solid #ececec; display: flex; flex-direction: column; gap: 4px; }
    .class-empty-title { font-size: 12px; font-weight: 500; color: #5a5a6e; }
    .class-empty-text { font-size: 11px; color: #9a9ab0; }
    .class-container::-webkit-scrollbar { width: 10px; height: 10px; }
    .class-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .class-container::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
    .class-container::-webkit-scrollbar-button { display: none; width: 0; height: 0; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(9, 9, 18, 0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .modal-box { width: min(100%, 460px); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 34px rgba(0,0,0,0.2); }
    .modal-inner { width: 100%; box-sizing: border-box; background: #fff; padding: 26px; display: flex; flex-direction: column; gap: 10px; }
    .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
    .modal-header h4 { margin: 0; font-size: 18px; color: #1a1a2e; }
    .modal-close-btn { flex-shrink: 0; width: 28px; height: 28px; border: none; background: transparent; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9a9ab0; transition: background 0.15s, color 0.15s; padding: 0; margin-top: -2px; }
    .modal-close-btn:hover { background: #f1f0f8; color: #1a1a2e; }
    .modal-detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f1f1; }
    .modal-detail-row:last-of-type { border: none; }
    .modal-detail-label { font-size: 11px; color: #acacacff; }
    .modal-detail-value { font-size: 11px; font-weight: 500; }
    .modal-helper { font-size: 11px; color: #6a6a6a; }
    .modal-helper.error { color: #bb295f; font-weight: 500; }
    .modal-buttons { display: flex; gap: 8px; margin-top: 4px; }
    .modal-primary { flex: 1; background: #6b46c1; color: #fff; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .modal-primary:disabled { background: #c4b5fd; cursor: not-allowed; }
    .modal-secondary { flex: 1; background: #edf0fa; color: #4a4a4a; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 1200px) {
      .class-list { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 900px) {
      .class-list { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .class-container { padding: 20px; }
      app-search { min-width: 100%; }
      .filter-select { width: 100%; }
      .class-list { grid-template-columns: 1fr; }
    }
  `,
  template: `
    <div class="class-container" (scroll)="onScroll($event)">
      <div class="title d-flex items-cen">
        <span>Classes</span>
      </div>

      <div class="toolbar mt-20 flex-cen gap-20">
        <app-search
          placeholder="Search classes..."
          (searchChange)="onSearchChange($event)">
        </app-search>

        <select class="filter-select" [(ngModel)]="filterStatus">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="full">Full</option>
          <option value="closed">Closed</option>
          <option value="complete">Complete</option>
        </select>

        <select class="filter-select" [(ngModel)]="filterSubject">
          <option value="all">All Subjects</option>
          @for (subjectName of subjectOptions; track subjectName) {
            <option [value]="subjectName">{{ toTitleCase(subjectName) }}</option>
          }
        </select>
      </div>

      @if (isLoading()) {
        <div class="class-empty">
          <span class="class-empty-title">Loading class data</span>
          <span class="class-empty-text">The class list will appear as soon as data is ready.</span>
        </div>
      } @else if (errorMessage()) {
        <div class="class-empty">
          <span class="class-empty-title">Unable to load classes</span>
          <span class="class-empty-text">{{ errorMessage() }}</span>
        </div>
      } @else if (filteredClasses.length > 0) {
        <div class="class-list">
          @for (item of filteredClasses; track item.id) {
            <div class="class-card">
              <div class="class-card-header">
                <div class="class-icon">{{ getInitial(item) }}</div>
                <div class="class-info">
                  <span class="class-name">{{ item.subject.name || 'Unknown Subject' }}</span>
                  <p class="class-teacher">{{ item.teacher.name || 'Unknown Teacher' }}</p>
                </div>
                <div class="class-badge" [ngClass]="getStatusBadgeClass(item.status)">
                  <span>{{ formatStatus(item.status) }}</span>
                </div>
              </div>
              <div class="class-divider"></div>
              <div class="class-details">
                <div class="class-detail-row">
                  <span class="class-detail-label">Level:</span>
                  <span class="class-detail-value">{{ item.level || '-' }}</span>
                </div>
                <div class="class-detail-row">
                  <span class="class-detail-label">Max students:</span>
                  <span class="class-detail-value">{{ item.max_students || '-' }}</span>
                </div>
                <div class="class-detail-row">
                  <span class="class-detail-label">Registered:</span>
                  <span class="class-detail-value">{{ getEnrolledCount(item.id) }} / {{ item.max_students || '-' }}</span>
                </div>
                <div class="class-detail-row">
                  <span class="class-detail-label">Created at:</span>
                  <span class="class-detail-value">{{ formatDate(item.created_at) }}</span>
                </div>
              </div>
              <button class="class-button" [ngClass]="getStatusButtonClass(item.status)" [disabled]="item.status !== 'open'" (click)="openRegisterModal(item)">
                {{ item.status === 'open' ? 'Register' : 'Closed' }}
              </button>
            </div>
          }
        </div>

        @if (isLoadingMore()) {
          <div class="class-empty">
            <span class="class-empty-text">Loading more classes...</span>
          </div>
        }
      } @else {
        <div class="class-empty">
          <span class="class-empty-title">No classes found</span>
          <span class="class-empty-text">Try changing the search term or filters to see more classes.</span>
        </div>
      }
    </div>

    @if (selectedClass()) {
      <div class="modal-overlay" (click)="closeRegisterModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-inner">
            <div class="modal-header">
              <h4>Register for class</h4>
              <button type="button" class="modal-close-btn" (click)="closeRegisterModal()" aria-label="Close">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">close</mat-icon>
              </button>
            </div>

            <div class="modal-detail-row">
              <span class="modal-detail-label">Subject:</span>
              <span class="modal-detail-value">{{ selectedClass()!.subject.name || '-' }}</span>
            </div>
            <div class="modal-detail-row">
              <span class="modal-detail-label">Teacher:</span>
              <span class="modal-detail-value">{{ selectedClass()!.teacher.name || '-' }}</span>
            </div>
            <div class="modal-detail-row">
              <span class="modal-detail-label">Level:</span>
              <span class="modal-detail-value">{{ selectedClass()!.level || '-' }}</span>
            </div>
            <div class="modal-detail-row">
              <span class="modal-detail-label">Slots remaining:</span>
              <span class="modal-detail-value">{{ (selectedClass()!.max_students || 0) - getEnrolledCount(selectedClass()!.id) }} / {{ selectedClass()!.max_students || '-' }}</span>
            </div>

            @if (registerError()) {
              <div class="modal-helper error">{{ registerError() }}</div>
            } @else {
              <div class="modal-helper">You will be enrolled into this class immediately after confirming.</div>
            }

            <div class="modal-buttons">
              <button type="button" class="modal-secondary" [disabled]="registerLoading()" (click)="closeRegisterModal()">Cancel</button>
              <button type="button" class="modal-primary" [disabled]="registerLoading()" (click)="submitRegister()">
                @if (registerLoading()) {
                  <div class="spinner"></div>
                } @else {
                  Confirm
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class Class implements OnInit {
  private classStore = inject(ClassListStore);
  private classesService = inject(ClassesService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);

  readonly classes = this.classStore.classes;
  readonly isLoading = this.classStore.isLoading;
  readonly isLoadingMore = this.classStore.isLoadingMore;
  readonly errorMessage = this.classStore.errorMessage;
  readonly classEnrollmentCounts = this.classStore.classEnrollmentCounts;

  searchQuery = '';
  filterStatus = 'all';
  filterSubject = 'all';

  readonly selectedClass = signal<ClassDetail | null>(null);
  readonly registerLoading = signal(false);
  readonly registerError = signal('');

  ngOnInit(): void {
    // Load the first page of classes when the component initializes
    this.classStore.loadClassList();
  }

  onSearchChange(value: string): void {
    // Update the search query (trimmed, lowercase) to drive the filtered list
    this.searchQuery = value.trim().toLowerCase();
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    // Trigger loading more classes when the user is near the bottom of the scroll container
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      this.classStore.loadMoreClasses();
    }
  }

  openRegisterModal(item: ClassDetail): void {
    this.registerError.set('');
    this.selectedClass.set(item);
  }

  closeRegisterModal(): void {
    if (this.registerLoading()) return;
    this.selectedClass.set(null);
    this.registerError.set('');
  }

  submitRegister(): void {
    const item = this.selectedClass();
    if (!item) return;
    const studentId = this.userService.getUser().id;
    this.registerLoading.set(true);
    this.registerError.set('');
    this.classesService.classesRegisterStudentCreate(item.id, { student_id: studentId }).subscribe({
      next: (res) => {
        this.registerLoading.set(false);
        this.selectedClass.set(null);
        this.toastService.success(res.message || 'Registered successfully!');
        this.classStore.loadClassList();
      },
      error: (err) => {
        this.registerLoading.set(false);
        const msg = err?.error?.message || err?.error?.detail || 'Registration failed. Please try again.';
        this.registerError.set(msg);
      },
    });
  }

  get filteredClasses(): ClassDetail[] {
    // Apply search text, status, and subject filters simultaneously
    return this.classes().filter((item) => {
      const subjectName = (item.subject?.name || '').toLowerCase();
      const teacherName = (item.teacher?.name || '').toLowerCase();
      const matchesSearch = !this.searchQuery || subjectName.includes(this.searchQuery) || teacherName.includes(this.searchQuery);
      const matchesStatus = this.filterStatus === 'all' || item.status === this.filterStatus;
      const matchesSubject = this.filterSubject === 'all' || subjectName === this.filterSubject;
      return matchesSearch && matchesStatus && matchesSubject;
    });
  }

  get subjectOptions(): string[] {
    // Collect unique lowercase subject names from the full class list for the filter dropdown
    const names = new Set(
      this.classes()
        .map((item) => item.subject?.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => name.toLowerCase())
    );
    return Array.from(names);
  }

  toTitleCase(value: string): string {
    // Capitalize the first letter of each word in the given string
    return value
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getInitial(item: ClassDetail): string {
    // Return the first character of the subject name for use as the avatar initial
    const name = item.subject?.name?.trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  formatStatus(status?: string): string {
    // Capitalize the status string for display (e.g., 'open' → 'Open')
    if (!status) {
      return 'Unknown';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getStatusBadgeClass(status?: string): string {
    // Map a class status to its corresponding CSS badge class
    switch (status) {
      case 'open': return 'badge-open';
      case 'full': return 'badge-full';
      case 'closed': return 'badge-closed';
      case 'complete': return 'badge-complete';
      default: return 'badge-open';
    }
  }

  getStatusButtonClass(status?: string): string {
    // Map a class status to its corresponding CSS button class
    switch (status) {
      case 'open': return 'btn-open';
      case 'full': return 'btn-full';
      case 'closed': return 'btn-closed';
      case 'complete': return 'btn-complete';
      default: return 'btn-open';
    }
  }

  getEnrolledCount(classId: number): number {
    // Look up the pre-computed enrollment count for a class from the store's enrollment map
    return this.classEnrollmentCounts()[classId] || 0;
  }

  formatDate(rawDate: string): string {
    // Parse and format a date string; return '-' for missing or invalid dates
    if (!rawDate) {
      return '-';
    }
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN');
  }
}