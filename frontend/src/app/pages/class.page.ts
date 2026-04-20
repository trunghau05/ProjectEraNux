import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Search } from '../components/shared/search/search.component';
import { ClassDetail } from '../apis';
import { ClassListStore } from '../stores/class.store';

@Component({
  selector: 'app-class',
  imports: [CommonModule, FormsModule, Search],
  styles: `
    .class-container { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .title { font-size: 14px; font-weight: 500; height: 25px; }
    .toolbar { width: 100%; flex-wrap: wrap; }
    .filter-select { background: white; color: black; padding: 10px 30px 10px 15px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.12); cursor: pointer; font-size: 11px; font-weight: 500; outline: none; transition: all 0.3s; min-width: 100px; flex: 0 0 auto; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }
    app-search { flex: 1; min-width: 420px; }
    .class-list { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 30px; align-items: flex-start; }
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
    .class-button { color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; transition: all 0.3s ease; }
    .class-button:hover { opacity: 0.9; }
    .class-button:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-open { background-color: #6b46c1; }
    .btn-full { background-color: #2f855a; }
    .btn-closed { background-color: #718096; }
    .btn-complete { background-color: #3432c0ff; }
    .state-message { font-size: 12px; color: #6b7280; }
    .error-message { font-size: 12px; color: #c53030; }
    .class-empty { margin-top: 20px; padding: 24px; border-radius: 12px; background: white; display: flex; flex-direction: column; gap: 8px; }
    .class-empty-title { font-size: 13px; font-weight: 600; }
    .class-empty-text { font-size: 11px; color: #7a7a7a; }
    .class-container::-webkit-scrollbar { width: 10px; height: 10px; }
    .class-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .class-container::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
    .class-container::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
    @media (max-width: 1200px) {
      .class-card { max-width: calc(33.333% - 14px); }
    }
    @media (max-width: 900px) {
      .class-card { max-width: calc(50% - 10px); }
    }
    @media (max-width: 768px) {
      .class-container { padding: 20px; }
      app-search { min-width: 100%; }
      .filter-select { width: 100%; }
      .class-card { max-width: 100%; min-width: 100%; }
    }
  `,
  template: `
    <div class="class-container" (scroll)="onScroll($event)">
      <div class="title d-flex items-cen">
        <span>Classes</span>
      </div>

      <div class="toolbar mt-20 flex-cen gap-20">
        <app-search placeholder="Search classes..."></app-search>
        
        <select class="filter-select" [(ngModel)]="filterStatus" (change)="onFilterChange()">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="full">Full</option>
          <option value="closed">Closed</option>
          <option value="complete">Complete</option>
        </select>

        <select class="filter-select" [(ngModel)]="filterSubject" (change)="onFilterChange()">
          <option value="all">All Subjects</option>
          <option *ngFor="let subjectName of subjectOptions" [value]="subjectName">{{ toTitleCase(subjectName) }}</option>
        </select>
      </div>

      <div *ngIf="isLoading()" class="class-empty">
        <span class="class-empty-title">Loading class data</span>
        <span class="class-empty-text">The class list will appear as soon as data is ready.</span>
      </div>

      <div *ngIf="!isLoading() && errorMessage()" class="class-empty">
        <span class="class-empty-title">Unable to load classes</span>
        <span class="class-empty-text error-message">{{ errorMessage() }}</span>
      </div>

      <div class="class-list" *ngIf="!isLoading() && !errorMessage() && filteredClasses.length > 0">
        <div class="class-card" *ngFor="let classItem of filteredClasses; trackBy: trackByClassId">
          <div class="class-card-header">
            <div class="class-icon icon-default">{{ getInitial(classItem) }}</div>
            <div class="class-info">
              <span class="class-name">{{ classItem.subject.name || 'Unknown Subject' }}</span>
              <p class="class-teacher">{{ classItem.teacher.name || 'Unknown Teacher' }}</p>
            </div>
            <div class="class-badge" [ngClass]="getStatusClass(classItem.status)">
              <span>{{ getStatusText(classItem.status) }}</span>
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
              <span class="class-detail-value">{{ getEnrolledStudents(classItem.id) }} / {{ classItem.max_students || '-' }}</span>
            </div>
            <div class="class-detail-row">
              <span class="class-detail-label">Created at:</span>
              <span class="class-detail-value">{{ formatDate(classItem.created_at) }}</span>
            </div>
          </div>
          <button class="class-button" [ngClass]="getStatusButtonClass(classItem.status)" [disabled]="isActionDisabled(classItem.status)">
            {{ getActionButtonText(classItem.status) }}
          </button>
        </div>
      </div>

      <div *ngIf="!isLoading() && isLoadingMore()" class="class-empty">
        <span class="class-empty-text state-message">Loading more classes...</span>
      </div>

      <div *ngIf="!isLoading() && !filteredClasses.length && !errorMessage()" class="class-empty">
        <span class="class-empty-title">No classes found</span>
        <span class="class-empty-text">Try changing filters or continue scrolling to load additional classes.</span>
      </div>
    </div>  
  `,
})
export class Class implements OnInit {
  private classStore = inject(ClassListStore);

  readonly classes = this.classStore.classes;
  readonly isLoading = this.classStore.isLoading;
  readonly isLoadingMore = this.classStore.isLoadingMore;
  readonly errorMessage = this.classStore.errorMessage;
  readonly classEnrollmentCounts = this.classStore.classEnrollmentCounts;

  filterStatus = 'all';
  filterSubject = 'all';

  ngOnInit(): void {
    this.classStore.loadClassList();
  }

  get totalClasses(): number {
    return this.classStore.total();
  }

  get filteredClasses(): ClassDetail[] {
    return this.classes().filter((item) => {
      const status = item.status ?? '';
      const subjectName = (item.subject?.name ?? '').toLowerCase();
      const statusMatched = this.filterStatus === 'all' || status === this.filterStatus;
      const subjectMatched = this.filterSubject === 'all' || subjectName === this.filterSubject;
      return statusMatched && subjectMatched;
    });
  }

  get subjectOptions(): string[] {
    const names = new Set(
      this.classes()
        .map((item) => item.subject?.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => name.toLowerCase())
    );
    return Array.from(names);
  }

  toTitleCase(value: string): string {
    return value
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 120;

    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      this.classStore.loadMoreClasses();
    }
  }

  onFilterChange(): void {
    // Keep function for template bindings and future filter side-effects.
  }

  trackByClassId(_: number, classItem: ClassDetail): number {
    return classItem.id;
  }

  getInitial(classItem: ClassDetail): string {
    const subjectName = classItem.subject?.name?.trim();
    if (!subjectName) {
      return '?';
    }
    return subjectName.charAt(0).toUpperCase();
  }

  getStatusClass(status?: string): string {
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

  getStatusText(status?: string): string {
    if (!status) {
      return 'Unknown';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getStatusButtonClass(status?: string): string {
    switch (status) {
      case 'open':
        return 'btn-open';
      case 'full':
        return 'btn-full';
      case 'closed':
        return 'btn-closed';
      case 'complete':
        return 'btn-complete';
      default:
        return 'btn-open';
    }
  }

  getActionButtonText(status?: string): string {
    if (status === 'open') {
      return 'Register';
    }
    return 'Closed';
  }

  isActionDisabled(status?: string): boolean {
    return status !== 'open';
  }

  getEnrolledStudents(classId: number): number {
    return this.classEnrollmentCounts()[classId] ?? 0;
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
}