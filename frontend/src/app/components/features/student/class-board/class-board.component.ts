import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ClassDetail } from '../../../../apis';

@Component({
  selector: 'app-student-class-board',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBar],
  templateUrl: './class-board.component.html',
  styleUrls: ['./class-board.component.scss']
})
export class StudentClassBoardComponent {
  @Input() classes: ClassDetail[] = [];
  @Input() currentValue = 30;
  @Input() maxValue = 100;

  get progressPercent(): number {
    if (this.maxValue <= 0) {
      return 0;
    }

    return (this.currentValue / this.maxValue) * 100;
  }
}
