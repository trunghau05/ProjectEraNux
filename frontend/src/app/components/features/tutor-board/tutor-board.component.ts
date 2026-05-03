import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SessionDetail, TutorBookedStudent } from '../../../apis';

@Component({
  selector: 'app-tutor-board',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './tutor-board.component.html',
  styleUrls: ['./tutor-board.component.scss']
})
export class TutorBoardComponent {
  @Input() bookedStudents: TutorBookedStudent[] = [];
  @Input() sessions: SessionDetail[] = [];

  private router = inject(Router);

  get visibleBookedStudents(): TutorBookedStudent[] {
    return this.bookedStudents.filter((item) =>
      item.time_slots.some((slot) => slot.booking_status === 'confirmed')
    );
  }

  getStudentProgressPercent(studentId: number): number {
    const totalSlots = this.getRegisteredSlotCount(studentId);

    if (totalSlots === 0) {
      return 0;
    }

    const finishedSessions = this.getFinishedSessionCount(studentId);
    return Math.round((finishedSessions / totalSlots) * 100);
  }

  getStudentProgressLabel(studentId: number): string {
    const totalSlots = this.getRegisteredSlotCount(studentId);
    const finishedSessions = this.getFinishedSessionCount(studentId);

    return `${finishedSessions}/${totalSlots}`;
  }

  getProgressColor(percent: number): string {
    if (percent < 33) {
      return '#d32f2f';
    }

    if (percent < 67) {
      return '#4caf50';
    }

    return '#9c27b0';
  }

  navigateToBooking(): void {
    this.router.navigate(['/booking']);
  }

  private getRegisteredSlotCount(studentId: number): number {
    const bookedStudent = this.visibleBookedStudents.find((item) => item.student.id === studentId);

    if (!bookedStudent) {
      return 0;
    }

    return bookedStudent.time_slots.filter((slot) => slot.booking_status === 'confirmed').length;
  }

  private getFinishedSessionCount(studentId: number): number {
    const now = Date.now();

    return this.sessions.filter((session) => {
      const sessionStudentId = (session as SessionDetail & {
        student?: { id?: number } | null;
      }).student?.id;

      if (sessionStudentId !== studentId) {
        return false;
      }

      if (session.status === 'cancelled') {
        return false;
      }

      if (session.status === 'finished') {
        return true;
      }

      return new Date(session.end_at).getTime() <= now;
    }).length;
  }
}
