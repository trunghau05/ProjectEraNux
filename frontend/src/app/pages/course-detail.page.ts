import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClassDetail, ClassStatusEnum, ClassesService, SessionDetail, Subject, SubjectsService } from '../apis';
import { SessionListStore } from '../stores/session.store';
import { SttService } from '../services/stt.service';
import { UserService } from '../services/user.service';

interface SessionViewModel {
  session: SessionDetail;
  label: string;
  index: number;
  expanded: boolean;
  summaryLoading: boolean;
  summaryText: string | null;
  summaryError: string | null;
}

@Component({
  selector: 'app-course-detail-page',
  imports: [CommonModule, FormsModule, MatIconModule],
  styles: `
    .detail-page { width: 100%; height: 100vh; padding: 30px; box-sizing: border-box; overflow: auto; scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
    .detail-page::-webkit-scrollbar { width: 10px; height: 10px; }
    .detail-page::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .detail-page::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }

    .detail-header { padding: 0 0 16px; display: flex; align-items: center; gap: 14px; }
    .detail-title-group { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .detail-title { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .detail-subtitle { font-size: 11px; color: #9a9ab0; }
    .create-assignment-btn { padding: 7px 14px; border-radius: 8px; border: none; background: #6b46c1; color: white; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.2s; flex-shrink: 0; display: flex; align-items: center; gap: 4px; }
    .create-assignment-btn:hover { background: #553c9a; }
    .create-assignment-btn mat-icon { font-size: 16px; width: 16px; height: 16px; line-height: 16px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(9, 9, 18, 0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .modal-box { width: min(100%, 650px); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 34px rgba(0,0,0,0.2); }
    .modal-inner { width: 100%; box-sizing: border-box; background: #fff; padding: 26px; display: flex; flex-direction: column; gap: 10px; }
    .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
    .modal-header h4 { margin: 0; font-size: 18px; color: #1a1a2e; }
    .modal-close-btn { flex-shrink: 0; width: 28px; height: 28px; border: none; background: transparent; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9a9ab0; transition: background 0.15s, color 0.15s; padding: 0; margin-top: -2px; }
    .modal-close-btn:hover { background: #f1f0f8; color: #1a1a2e; }
    .modal-form-row { display: flex; flex-direction: column; gap: 10px; }
    .modal-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
    .modal-form-column { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .modal-form-column-right { height: 100%; }
    .modal-label { font-size: 11px; font-weight: 600; color: #4a4a4a; margin-bottom: 4px; }
    .modal-field { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e6eef7; border-radius: 6px; outline: none; font-size: 12px; font-family: inherit; resize: vertical; }
    .modal-select-field { appearance: none; -webkit-appearance: none; -moz-appearance: none; padding-right: 38px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%236b7280' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 8 4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 14px; }
    input[type="datetime-local"].modal-field { height: 39px; padding-top: 0; padding-bottom: 0; }
    .modal-field:focus { border-color: #6b46c1; }
    .modal-pdf-block { display: flex; flex-direction: column; flex: 1; }
    .modal-pdf-picker { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1.5px dashed #c4b5fd; border-radius: 10px; background: #faf7ff; cursor: pointer; transition: border-color 0.2s, background 0.2s; min-height: 100px; }
    .modal-pdf-picker:hover { border-color: #6b46c1; background: #f3eeff; }
    .modal-pdf-picker.drag-over { border-color: #6b46c1; background: #ede9fe; }
    .modal-pdf-picker input[type="file"] { display: none; }
    .pdf-upload-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
    .pdf-upload-text { font-size: 12px; font-weight: 600; color: #3d3060; margin-top: 2px; }
    .pdf-or-divider { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 140px; margin: 2px 0; }
    .pdf-or-divider span { font-size: 10px; color: #9ca3af; font-weight: 500; white-space: nowrap; }
    .pdf-or-divider::before, .pdf-or-divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
    .pdf-browse-btn { padding: 6px 18px; border: 1.5px solid #6b46c1; border-radius: 6px; background: transparent; color: #6b46c1; font-size: 11px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .pdf-browse-btn:hover { background: #ede9fe; }
    .modal-helper { font-size: 11px; color: #6a6a6a; }
    .modal-helper.error { color: #bb295f; font-weight: 500; }
    .modal-buttons { display: flex; gap: 8px; margin-top: 2px; }
    .modal-primary { flex: 1; background: #6b46c1; color: #fff; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .modal-primary:hover:not(:disabled) { background: #553c9a; }
    .modal-primary:disabled { background: #c4b5fd; cursor: not-allowed; }
    .modal-secondary { flex: 1; background: #edf0fa; color: #4a4a4a; border: none; border-radius: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .detail-body { display: flex; flex-direction: column; gap: 10px; }
    .detail-body::-webkit-scrollbar { width: 6px; }
    .detail-body::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 6px; }

    .state-box { margin-top: 4px; padding: 12px 16px; border-radius: 8px; background: #fafafa; border: 1px solid #ececec; display: flex; flex-direction: column; gap: 4px; }
    .state-title { font-size: 12px; font-weight: 500; color: #5a5a6e; }
    .state-text { font-size: 11px; color: #9a9ab0; }

    .session-item {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #ede9f8;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
    }
    .session-item:hover { border-color: #d5c8f4; }
    .session-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; user-select: none; }
    .session-number { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
    .session-meta { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .session-label { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .session-time { font-size: 10px; color: #9a9ab0; }
    .session-date-chip { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; color: #111827; background: #e5e7eb; white-space: nowrap; }
    .session-status { padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: 600; color: white; }
    .status-upcoming { background: #6b46c1; }
    .status-ongoing { background: #d97706; }
    .status-finished { background: #2563eb; }
    .status-cancelled { background: #dc2626; }
    .session-chevron { font-size: 12px; color: #000000; transition: transform 0.25s; flex-shrink: 0; }
    .session-chevron.expanded { transform: rotate(180deg); }

    .session-body { overflow: hidden; transition: max-height 0.35s ease; max-height: 0; }
    .session-body.open { max-height: 900px; }
    .session-body-inner { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 14px; border-top: 1px solid #f1f0f8; padding-top: 14px; }

    .video-section { display: flex; flex-direction: column; gap: 8px; }
    .section-label { font-size: 11px; font-weight: 600; color: #6b46c1; text-transform: uppercase; letter-spacing: 0.04em; }
    .video-frame { width: 100%; aspect-ratio: 16/9; border-radius: 10px; border: none; background: #1a1a2e; }
    .no-video { padding: 10px 14px; border-radius: 8px; background: #fafafa; border: 1px solid #ececec; font-size: 11px; color: #9a9ab0; }

    .summary-section { display: flex; flex-direction: column; gap: 8px; }
    .summary-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .summary-btn { padding: 6px 14px; border-radius: 8px; border: none; background: #6b46c1; color: white; font-size: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .summary-btn:hover { background: #553c9a; }
    .summary-btn:disabled { background: #c4b5fd; cursor: not-allowed; }
    .summary-loading { font-size: 11px; color: #9a9ab0; font-style: italic; }
    .summary-error { font-size: 11px; color: #dc2626; }
    .summary-text { font-size: 12px; line-height: 1.7; color: #374151; background: #f9f7ff; padding: 14px; border-radius: 10px; border-left: 3px solid #6b46c1; white-space: pre-wrap; word-break: break-word; }

    @media (max-width: 768px) {
      .detail-page { padding: 20px; }
      .detail-header { align-items: flex-start; flex-wrap: wrap; }
      .detail-title-group { min-width: 100%; }
      .modal-form-grid { grid-template-columns: 1fr; }
    }

    .info-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e6eef7; background: #fff; color: #6b46c1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, border-color 0.15s; flex-shrink: 0; }
    .info-icon-btn:hover { background: #f1f0f8; border-color: #d5c8f4; }
    .info-icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }

    .class-info-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 14px; border-radius: 10px; background: #faf7ff; border: 1px solid #ede9f8; }
    .class-info-summary-item { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .class-info-summary-label { font-size: 11px; font-weight: 600; color: #9a9ab0; text-transform: uppercase; letter-spacing: 0.04em; }
    .class-info-summary-value { font-size: 13px; color: #1a1a2e; word-break: break-word; }
    .class-info-divider { height: 1px; background: #f1f0f8; }
    .modal-helper.success { color: #059669; font-weight: 500; }

    @media (max-width: 768px) {
      .class-info-summary { grid-template-columns: 1fr; }
    }
  `,
  template: `
    <div class="detail-page">
      <div class="detail-header">
        <div class="detail-title-group">
          <span class="detail-title">{{ headerTitle() }}</span>
          <span class="detail-subtitle">{{ headerSubtitle() }}</span>
        </div>
        @if (canCreateAssignment()) {
          <button class="create-assignment-btn" (click)="openCreateAssignment()"><mat-icon>add</mat-icon> Create assignment</button>
        }
        @if (detailType() === 'class' && classId()) {
          <button class="info-icon-btn" (click)="openClassInfoModal()" title="Class info">
            <mat-icon>info_outline</mat-icon>
          </button>
        }
      </div>

      <div class="detail-body">
        @if (loading()) {
          <div class="state-box">
            <span class="state-title">Loading sessions</span>
            <span class="state-text">Please wait a moment...</span>
          </div>
        } @else if (errorMsg()) {
          <div class="state-box">
            <span class="state-title">Unable to load data</span>
            <span class="state-text">{{ errorMsg() }}</span>
          </div>
        } @else if (sessions().length === 0) {
          <div class="state-box">
            <span class="state-title">No sessions yet</span>
            <span class="state-text">Sessions will appear here once they are created.</span>
          </div>
        } @else {
          @for (vm of sessions(); track vm.session.id) {
            <div class="session-item">
              <div class="session-header" (click)="toggleSession(vm)">
                <div class="session-number">{{ vm.index }}</div>
                <div class="session-meta">
                  <span class="session-label">{{ vm.label }}</span>
                  <span class="session-time">{{ formatStatus(vm.session.status) }}</span>
                </div>
                <span class="session-date-chip">{{ formatRange(vm.session.start_at, vm.session.end_at) }}</span>
                <span class="session-chevron" [class.expanded]="vm.expanded">▼</span>
              </div>

              <div class="session-body" [class.open]="vm.expanded">
                @if (vm.expanded) {
                  <div class="session-body-inner">
                    <div class="video-section">
                      <span class="section-label">Session recording</span>
                      @if (vm.session.recording_url) {
                        <iframe
                          class="video-frame"
                          [src]="getVideoUrl(vm.session.recording_url)"
                          allowfullscreen
                          allow="autoplay; encrypted-media">
                        </iframe>
                      } @else {
                        <div class="no-video">No recording available for this session</div>
                      }
                    </div>

                    <div class="summary-section">
                      <span class="section-label">Session summary</span>
                      @if (!vm.summaryText && !vm.summaryLoading && !vm.summaryError) {
                        <div class="summary-actions">
                          <button class="summary-btn" (click)="loadSummary(vm)" [disabled]="!vm.session.recording_url">
                            Load summary
                          </button>
                          @if (!vm.session.recording_url) {
                            <span class="summary-loading">A recording is required to generate a summary</span>
                          }
                        </div>
                      }
                      @if (vm.summaryLoading) {
                        <span class="summary-loading">Processing audio, please wait...</span>
                      }
                      @if (vm.summaryError) {
                        <span class="summary-error">{{ vm.summaryError }}</span>
                        <div class="summary-actions">
                          <button class="summary-btn" (click)="loadSummary(vm)">Retry</button>
                        </div>
                      }
                      @if (vm.summaryText) {
                        <div class="summary-text">{{ vm.summaryText }}</div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>

    @if (showClassInfoModal()) {
      <div class="modal-overlay" (click)="closeClassInfoModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-inner">
            <div class="modal-header">
              <h4>Class info</h4>
              <button type="button" class="modal-close-btn" (click)="closeClassInfoModal()" aria-label="Close">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">close</mat-icon>
              </button>
            </div>

            @if (classInfoLoading()) {
              <div class="modal-helper">Loading class info...</div>
            } @else if (classInfoLoadError()) {
              <div class="modal-helper error">{{ classInfoLoadError() }}</div>
            } @else if (classDetail()) {
              <form class="modal-form-row" (ngSubmit)="submitClassInfo()" #classInfoForm="ngForm">
                <div class="modal-form-grid">
                  <div class="modal-form-column">
                    <div>
                      <div class="modal-label">Subject</div>
                      <select class="modal-field modal-select-field" [(ngModel)]="editSubjectId" name="editSubjectId" [disabled]="subjectsLoading() || (classDetail()!.enrolled_students >= 1)" required>
                        <option value="" disabled>Select a subject</option>
                        @for (subject of availableSubjects(); track subject.id) {
                          <option [value]="subject.id">{{ subject.name }}</option>
                        }
                      </select>
                      @if (classDetail()!.enrolled_students >= 1) {
                        <div class="modal-helper">Subject cannot be changed while students are enrolled.</div>
                      }
                    </div>
                  </div>

                  <div class="modal-form-column">
                    <div>
                      <div class="modal-label">Status</div>
                      <select class="modal-field modal-select-field" [(ngModel)]="editStatus" name="editStatus">
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="complete">Complete</option>
                        <option value="full">Full</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <div class="modal-label">Level</div>
                  <input class="modal-field" type="text" [(ngModel)]="editLevel" name="editLevel" placeholder="e.g. Beginner, A1, Grade 10" />
                </div>

                <div class="modal-form-grid">
                  <div class="modal-form-column">
                    <div>
                      <div class="modal-label">Enrolled students</div>
                      <input class="modal-field" type="number" [ngModel]="classDetail()!.enrolled_students" name="enrolledStudentsReadonly" disabled />
                    </div>
                  </div>

                  <div class="modal-form-column">
                    <div>
                      <div class="modal-label">Max students</div>
                      <input class="modal-field" type="number" [(ngModel)]="editMaxStudents" name="editMaxStudents" [min]="classDetail()!.enrolled_students" placeholder="e.g. 30" />
                    </div>
                  </div>
                </div>

                <div>
                  <div class="modal-label">Description</div>
                  <textarea class="modal-field" rows="4" [(ngModel)]="editDescription" name="editDescription" placeholder="Class description (optional)"></textarea>
                </div>

                @if (subjectsLoading()) {
                  <div class="modal-helper">Loading subjects...</div>
                }
                @if (isMaxStudentsInvalid()) {
                  <div class="modal-helper error">Max students cannot be smaller than enrolled students.</div>
                }

                @if (classInfoSaveError()) {
                  <div class="modal-helper error">{{ classInfoSaveError() }}</div>
                }
                @if (classInfoSaveSuccess()) {
                  <div class="modal-helper success">Class updated successfully.</div>
                }

                @if (canCreateAssignment()) {
                  <div class="modal-buttons">
                    <button type="button" class="modal-secondary" [disabled]="classInfoSaving()" (click)="closeClassInfoModal()">Cancel</button>
                    <button type="submit" class="modal-primary" [disabled]="classInfoSaving() || !classInfoForm.form.valid || isMaxStudentsInvalid() || subjectsLoading()">
                      @if (classInfoSaving()) {
                        <div class="spinner"></div>
                      } @else {
                        Save changes
                      }
                    </button>
                  </div>
                }
              </form>
            }
          </div>
        </div>
      </div>
    }

    @if (showAssignmentModal()) {
      <div class="modal-overlay" (click)="closeAssignmentModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-inner">
            <div class="modal-header">
              <h4>New assignment</h4>
              <button type="button" class="modal-close-btn" (click)="closeAssignmentModal()" aria-label="Close">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">close</mat-icon>
              </button>
            </div>
            <form class="modal-form-row" (ngSubmit)="submitAssignment()" #assignForm="ngForm">
              <div class="modal-form-grid">
                <div class="modal-form-column">
                  <div>
                    <div class="modal-label">Title <span style="color:#dc2626">*</span></div>
                    <input
                      class="modal-field"
                      type="text"
                      [(ngModel)]="assignmentTitle"
                      name="assignmentTitle"
                      placeholder="Enter assignment title"
                      required />
                  </div>

                  <div>
                    <div class="modal-label">Description</div>
                    <textarea
                      class="modal-field"
                      rows="3"
                      [(ngModel)]="assignmentDescription"
                      name="assignmentDescription"
                      placeholder="Describe the assignment (optional)"></textarea>
                  </div>

                  <div>
                    <div class="modal-label">Session <span style="color:#dc2626">*</span></div>
                    <select
                      class="modal-field modal-select-field"
                      [(ngModel)]="assignmentSessionId"
                      name="assignmentSessionId"
                      [disabled]="sessions().length === 0"
                      required>
                      <option value="" disabled>Select a session</option>
                      @for (vm of sessions(); track vm.session.id) {
                        <option [value]="vm.session.id">{{ getAssignmentSessionLabel(vm) }}</option>
                      }
                    </select>
                    @if (sessions().length === 0) {
                      <div class="modal-helper error">No session available to attach this assignment.</div>
                    }
                  </div>
                </div>

                <div class="modal-form-column modal-form-column-right">
                  <div>
                    <div class="modal-label">Due date <span style="color:#dc2626">*</span></div>
                    <input
                      class="modal-field"
                      type="datetime-local"
                      [(ngModel)]="assignmentDueDate"
                      name="assignmentDueDate"
                      required />
                  </div>

                  <div class="modal-pdf-block">
                    <div class="modal-label">PDF file</div>
                    <div class="modal-pdf-picker"
                      [class.drag-over]="pdfDragOver"
                      (click)="pdfFileInput.click()"
                      (dragover)="$event.preventDefault(); pdfDragOver = true"
                      (dragleave)="pdfDragOver = false"
                      (drop)="onPdfDrop($event)">
                      <input
                        #pdfFileInput
                        type="file"
                        accept="application/pdf,.pdf"
                        name="assignmentPdf"
                        (change)="onAssignmentPdfSelected($event)" />
                      <div class="pdf-upload-icon">
                        <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="36" height="36" rx="8" fill="#ede9fe"/>
                          <path d="M18 22V14M18 14L15 17M18 14L21 17" stroke="#6b46c1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M12 26h12" stroke="#6b46c1" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                      </div>
                      @if (assignmentPdfName) {
                        <div class="pdf-upload-text">{{ assignmentPdfName }}</div>
                      } @else {
                        <div class="pdf-upload-text">Drag your file to start uploading</div>
                        <div class="pdf-or-divider"><span>OR</span></div>
                        <button type="button" class="pdf-browse-btn" (click)="$event.stopPropagation(); pdfFileInput.click()">PDF file</button>
                      }
                    </div>
                  </div>
                </div>
              </div>

              @if (assignmentError()) {
                <div class="modal-helper error">{{ assignmentError() }}</div>
              }

              <div class="modal-buttons">
                <button type="button" class="modal-secondary" [disabled]="assignmentLoading()" (click)="closeAssignmentModal()">Cancel</button>
                <button type="submit" class="modal-primary" [disabled]="assignmentLoading() || !assignForm.form.valid">
                  @if (assignmentLoading()) {
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
export class CourseDetailPage implements OnInit {
  private sessionStore = inject(SessionListStore);
  private sttService = inject(SttService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private classesService = inject(ClassesService);
  private subjectsService = inject(SubjectsService);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly sessions = signal<SessionViewModel[]>([]);

  readonly detailType = signal<'booking' | 'class'>('booking');
  readonly teacherId = signal<number | null>(null);
  readonly classId = signal<number | null>(null);
  readonly studentId = signal<number | null>(null);

  readonly headerTeacherName = signal<string>('');
  readonly headerClassName = signal<string>('');
  readonly headerStudentName = signal<string>('');

  ngOnInit(): void {
    // Kick off the session list load only if the store hasn't loaded yet
    if (this.sessionStore.sessions().length === 0 && !this.sessionStore.isLoading()) {
      this.sessionStore.loadSessionList();
    }

    // Rebuild the displayed sessions whenever the query params change
    this.route.queryParamMap.subscribe((params) => {
      this.detailType.set(params.get('type') === 'class' ? 'class' : 'booking');
      this.teacherId.set(this.toInt(params.get('teacherId')));
      this.classId.set(this.toInt(params.get('classId')));
      this.studentId.set(this.toInt(params.get('studentId')));

      this.headerTeacherName.set(params.get('teacherName') ?? '');
      this.headerClassName.set(params.get('className') ?? '');
      this.headerStudentName.set(params.get('studentName') ?? '');

      this.buildSessions();
    });
  }

  headerTitle(): string {
    // For booking type, prefer teacher name then student name; fallback to generic label
    if (this.detailType() === 'booking') {
      if (this.headerTeacherName()) {
        return this.headerTeacherName();
      }
      if (this.headerStudentName()) {
        return this.headerStudentName();
      }
      return 'Booking detail';
    }

    return this.headerClassName() || 'Class detail';
  }

  headerSubtitle(): string {
    // Describe the kind of history shown based on type and which party was matched
    if (this.detailType() === 'booking') {
      if (this.teacherId()) {
        return '1-on-1 session history';
      }
      if (this.studentId()) {
        return 'Student booking session history';
      }
      return 'Session history';
    }

    if (this.headerTeacherName()) {
      return `Teacher: ${this.headerTeacherName()}`;
    }
    return 'Class session history';
  }

  headerInitial(): string {
    // Return the first character of the title as an avatar initial
    const title = this.headerTitle();
    return title.charAt(0).toUpperCase();
  }

  canCreateAssignment(): boolean {
    // Only teachers and tutors are allowed to create assignments
    const role = this.userService.user().role;
    return role === 'teacher' || role === 'tutor';
  }

  // ---- Class info modal ----
  readonly showClassInfoModal = signal(false);
  readonly classInfoLoading = signal(false);
  readonly classInfoLoadError = signal<string | null>(null);
  readonly classDetail = signal<ClassDetail | null>(null);
  readonly classInfoSaving = signal(false);
  readonly classInfoSaveError = signal<string | null>(null);
  readonly classInfoSaveSuccess = signal(false);
  readonly availableSubjects = signal<Subject[]>([]);
  readonly subjectsLoading = signal(false);

  editSubjectId = '';
  editLevel = '';
  editMaxStudents: number | null = null;
  editStatus: ClassStatusEnum = ClassStatusEnum.Open;
  editDescription = '';

  openClassInfoModal(): void {
    const id = this.classId();
    if (!id) return;
    this.showClassInfoModal.set(true);
    this.classInfoLoadError.set(null);
    this.classInfoSaveError.set(null);
    this.classInfoSaveSuccess.set(false);
    // Ensure the subject dropdown has data before the modal renders
    this.loadSubjectsIfNeeded();

    // Reuse the already-loaded class detail if available; otherwise fetch from the API
    if (this.classDetail()?.id === id) {
      this.populateEditFields(this.classDetail()!);
      return;
    }

    this.classInfoLoading.set(true);
    this.classesService.classesRetrieve(id).subscribe({
      next: (detail) => {
        this.classDetail.set(detail);
        this.populateEditFields(detail);
        this.classInfoLoading.set(false);
      },
      error: (err: { message?: string }) => {
        this.classInfoLoadError.set('Failed to load class info: ' + (err?.message ?? 'Unknown error'));
        this.classInfoLoading.set(false);
      },
    });
  }

  closeClassInfoModal(): void {
    // Block close while a save request is still in progress
    if (this.classInfoSaving()) return;
    this.showClassInfoModal.set(false);
  }

  submitClassInfo(): void {
    const id = this.classId();
    if (!id) return;
    // Validate that max_students is not below the current enrollment count
    if (this.isMaxStudentsInvalid()) {
      this.classInfoSaveError.set('Max students cannot be smaller than enrolled students.');
      return;
    }
    this.classInfoSaving.set(true);
    this.classInfoSaveError.set(null);
    this.classInfoSaveSuccess.set(false);

    this.classesService.classesPartialUpdate(id, {
      subject: this.editSubjectId ? Number(this.editSubjectId) : undefined,
      level: this.editLevel || undefined,
      max_students: this.editMaxStudents ?? undefined,
      status: this.editStatus,
      description: this.editDescription || undefined,
    }).subscribe({
      next: (updated) => {
        const prev = this.classDetail()!;
        // Resolve the full subject object from the local list to avoid a secondary API call
        const selectedSubject = this.availableSubjects().find(
          (subject) => subject.id.toString() === this.editSubjectId,
        );
        // Merge the server response into the local class detail signal
        this.classDetail.set({
          ...prev,
          subject: selectedSubject ?? prev.subject,
          level: updated.level,
          max_students: updated.max_students,
          description: updated.description,
          status: updated.status,
        });
        this.classInfoSaving.set(false);
        this.classInfoSaveSuccess.set(true);
      },
      error: (err: { message?: string }) => {
        this.classInfoSaveError.set('Failed to save: ' + (err?.message ?? 'Unknown error'));
        this.classInfoSaving.set(false);
      },
    });
  }

  private populateEditFields(detail: ClassDetail): void {
    // Mirror the server-side class detail into the edit form fields
    this.editSubjectId = detail.subject.id.toString();
    this.editLevel = detail.level ?? '';
    this.editMaxStudents = detail.max_students ?? null;
    this.editStatus = (detail.status as ClassStatusEnum) ?? ClassStatusEnum.Open;
    this.editDescription = detail.description ?? '';
  }

  private loadSubjectsIfNeeded(): void {
    // Skip the API call if subjects are already cached or a request is in progress
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
        this.classInfoLoadError.set('Failed to load subjects: ' + (err?.message ?? 'Unknown error'));
        this.availableSubjects.set([]);
        this.subjectsLoading.set(false);
      },
    });
  }

  isMaxStudentsInvalid(): boolean {
    // New max cannot be below the number of students already enrolled
    const enrolledStudents = this.classDetail()?.enrolled_students ?? 0;
    return this.editMaxStudents !== null && this.editMaxStudents < enrolledStudents;
  }

  readonly showAssignmentModal = signal(false);
  readonly assignmentLoading = signal(false);
  readonly assignmentError = signal<string | null>(null);
  assignmentTitle = '';
  assignmentDescription = '';
  assignmentSessionId = '';
  assignmentDueDate = '';
  assignmentPdfFile: File | null = null;
  assignmentPdfName = '';
  pdfDragOver = false;

  openCreateAssignment(): void {
    // Reset all form fields before showing the modal
    this.assignmentTitle = '';
    this.assignmentDescription = '';
    // Default the session dropdown to the first available session
    this.assignmentSessionId = this.sessions()[0]?.session.id?.toString() ?? '';
    this.assignmentDueDate = '';
    this.assignmentPdfFile = null;
    this.assignmentPdfName = '';
    this.assignmentError.set(null);
    this.showAssignmentModal.set(true);
  }

  closeAssignmentModal(): void {
    // Block close while the assignment is being submitted
    if (this.assignmentLoading()) return;
    this.showAssignmentModal.set(false);
  }

  onAssignmentPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.assignmentPdfFile = null;
      this.assignmentPdfName = '';
      return;
    }

    // Reject non-PDF files by MIME type and extension
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.assignmentPdfFile = null;
      this.assignmentPdfName = '';
      this.assignmentError.set('Only PDF files are allowed.');
      input.value = '';
      return;
    }

    this.assignmentError.set(null);
    this.assignmentPdfFile = file;
    this.assignmentPdfName = file.name;
  }

  onPdfDrop(event: DragEvent): void {
    event.preventDefault();
    this.pdfDragOver = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file) return;
    // Validate the dropped file type before accepting it
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.assignmentError.set('Only PDF files are allowed.');
      return;
    }
    this.assignmentError.set(null);
    this.assignmentPdfFile = file;
    this.assignmentPdfName = file.name;
  }

  submitAssignment(): void {
    if (!this.assignmentTitle.trim() || !this.assignmentDueDate || !this.assignmentSessionId) return;
    this.assignmentLoading.set(true);
    this.assignmentError.set(null);

    const selectedSession = this.sessions().find(
      (item) => item.session.id.toString() === this.assignmentSessionId,
    );

    // TODO: call API to create assignment
    console.log('Create assignment:', {
      title: this.assignmentTitle,
      description: this.assignmentDescription,
      sessionId: Number(this.assignmentSessionId),
      sessionLabel: selectedSession ? this.getAssignmentSessionLabel(selectedSession) : null,
      dueDate: this.assignmentDueDate,
      pdfFileName: this.assignmentPdfFile?.name ?? null,
      target: this.headerTitle(),
    });

    // Simulate success — replace with real API call
    setTimeout(() => {
      this.assignmentLoading.set(false);
      this.showAssignmentModal.set(false);
    }, 600);
  }

  toggleSession(vm: SessionViewModel): void {
    // Toggle the expanded state of the clicked session card; leave all others unchanged
    const updated = this.sessions().map((item) =>
      item.session.id === vm.session.id ? { ...item, expanded: !item.expanded } : item,
    );
    this.sessions.set(updated);
  }

  loadSummary(vm: SessionViewModel): void {
    // Fetch the AI-generated transcript summary for a session recording
    const audioUrl = vm.session.recording_audio_url;
    if (!audioUrl) return;

    this.updateSession(vm.session.id, { summaryLoading: true, summaryError: null });

    this.sttService.transcribeSummary(audioUrl).subscribe({
      next: (res) => {
        this.updateSession(vm.session.id, { summaryLoading: false, summaryText: res.summary });
      },
      error: (err: { message?: string }) => {
        this.updateSession(vm.session.id, {
          summaryLoading: false,
          summaryError: 'Failed to load summary: ' + (err?.message ?? 'Unknown error'),
        });
      },
    });
  }

  getVideoUrl(url: string): SafeResourceUrl {
    // Extract the YouTube video ID and return a safe embed URL; fall back to the raw URL
    const apiKey = 'AIzaSyBtuf_EaTWWlAbySX4SOt0eRXjVnaRmq0A';
    const ytMatch = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${ytMatch[1]}?key=${apiKey}`,
      );
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  formatRange(start: string, end: string): string {
    const fmt = (v: string) =>
      new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(v));
    return `${fmt(start)} – ${fmt(end)}`;
  }

  formatStatus(status?: string): string {
    const map: Record<string, string> = {
      upcoming: 'Upcoming',
      ongoing: 'Ongoing',
      finished: 'Finished',
      cancelled: 'Cancelled',
    };
    return map[status ?? ''] ?? (status ?? 'Unknown');
  }

  statusClass(status?: string): string {
    return `status-${status ?? 'upcoming'}`;
  }

  getAssignmentSessionLabel(vm: SessionViewModel): string {
    return `${vm.label} - ${this.formatRange(vm.session.start_at, vm.session.end_at)}`;
  }

  private buildSessions(): void {
    // If the store is still loading, poll at 50ms intervals until it finishes
    if (this.sessionStore.isLoading()) {
      this.loading.set(true);
      this.errorMsg.set(null);

      const interval = setInterval(() => {
        if (!this.sessionStore.isLoading()) {
          clearInterval(interval);
          this.deriveAndSetSessions();
        }
      }, 50);
      return;
    }

    this.deriveAndSetSessions();
  }

  private deriveAndSetSessions(): void {
    // Surface any store-level error before attempting to build the list
    const storeError = this.sessionStore.errorMessage();
    if (storeError) {
      this.errorMsg.set(storeError);
      this.loading.set(false);
      return;
    }

    const relevant = this.filterRelevant(this.sessionStore.sessions());
    // Sort chronologically so session numbering matches temporal order
    const sorted = [...relevant].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );

    // Wrap each session in a view model with display metadata
    this.sessions.set(
      sorted.map((s, i) => ({
        session: s,
        label: `Session ${i + 1}`,
        index: i + 1,
        expanded: false,
        summaryLoading: false,
        summaryText: null,
        summaryError: null,
      })),
    );
    this.loading.set(false);
  }

  private filterRelevant(sessions: SessionDetail[]): SessionDetail[] {
    if (this.detailType() === 'booking') {
      return sessions.filter((s) => {
        // Booking sessions do not belong to a class
        if (s.class_obj) {
          return false;
        }
        // Optionally filter to a specific teacher or student
        if (this.teacherId() && s.teacher?.id !== this.teacherId()) {
          return false;
        }
        if (this.studentId() && s.student?.id !== this.studentId()) {
          return false;
        }
        return true;
      });
    }

    const classId = this.classId();
    if (!classId) {
      return [];
    }

    // Class-type: only include sessions belonging to the specified class
    return sessions.filter((s) => {
      const isClassMatched = ((s.class_obj as ClassDetail | null)?.id ?? null) === classId;
      if (!isClassMatched) {
        return false;
      }
      if (this.studentId() && s.student?.id !== this.studentId()) {
        return false;
      }
      return true;
    });
  }

  private updateSession(id: number, patch: Partial<SessionViewModel>): void {
    // Immutably update a single session view model by ID
    this.sessions.set(this.sessions().map((vm) => (vm.session.id === id ? { ...vm, ...patch } : vm)));
  }

  private toInt(value: string | null): number | null {
    // Parse a nullable string to an integer; return null for missing or non-numeric input
    if (!value) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
