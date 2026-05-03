import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClassDetail, SessionDetail } from '../../../apis';
import { Router } from '@angular/router';

@Component({
  selector: 'app-class-board',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './class-board.component.html',
  styleUrls: ['./class-board.component.scss']
})
export class ClassBoardComponent {
  @Input() classes: ClassDetail[] = [];
  @Input() sessions: SessionDetail[] = [];
  @Input() role = '';

  private router = inject(Router);

  getClassProgressPercent(classId: number): number {
    const classSessions = this.sessions.filter(
      (session) => session.class_obj?.id === classId && session.status !== 'cancelled',
    );

    // No sessions means no measurable progress yet
    if (classSessions.length === 0) {
      return 0;
    }

    const now = Date.now();
    const completedSessions = classSessions.filter((session) => {
      if (session.status === 'finished') {
        return true;
      }

      return new Date(session.end_at).getTime() <= now;
    }).length;

    return Math.round((completedSessions / classSessions.length) * 100);
  }

  getClassProgressLabel(classId: number): string {
    const classSessions = this.sessions.filter(
      (session) => session.class_obj?.id === classId && session.status !== 'cancelled',
    );

    if (classSessions.length === 0) {
      return '0/0';
    }

    const now = Date.now();
    const completedSessions = classSessions.filter((session) => {
      if (session.status === 'finished') {
        return true;
      }

      return new Date(session.end_at).getTime() <= now;
    }).length;

    return `${completedSessions}/${classSessions.length}`;
  }

  getClassSecondaryText(classItem: ClassDetail): string {
    if (this.role === 'teacher') {
      return `${classItem.enrolled_students ?? 0} students`;
    }
    
    if (this.role === 'student') {
      return classItem.teacher?.name ?? '';
    }

    return '';
  }

  getProgressColor(percent: number): string {
    if (percent < 33) {
      return '#d32f2f'; // Red for low progress
    } else if (percent < 67) {
      return '#4CAF50'; // Green for medium progress
    } else {
      return '#9c27b0'; // Purple for high progress
    }
  }

  navigateToClass() {
    // Send the user to the full class listing page
    this.router.navigate(['/class']);
  }
}
