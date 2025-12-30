import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Student, StudentsService, Teacher, TeachersService } from '../../api';

@Component({
  selector: 'app-user-info',
  imports: [CommonModule, MatIconModule],
  templateUrl: './user-info.html',
  styleUrl: './user-info.scss',
})
export class UserInfo implements OnInit {
  private studentService = inject(StudentsService);
  private teacherService = inject(TeachersService);

  student = signal<Student>({} as Student);
  teacher = signal<Teacher>({} as Teacher);

  user = {
    id: 0,
    role: ''
  };

  usName = '';

  ngOnInit(): void {
      this.user = JSON.parse(sessionStorage.getItem('user') || '{}');
      this.getUserInfo();
  }

  getUserInfo() {
    if (this.user.role === 'student') {
      this.studentService.studentsRetrieve(this.user.id).subscribe({
        next: (res) => {
          this.student.set(res);
          this.usName = res.name; 
          let role = this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1);
          this.user.role = role;
          console.log(this.student());
        },
        error: (err) => {
          console.error('Failed to fetch student info: ' + err.message);
        }
      })
    } else if (this.user.role === 'teacher' || this.user.role == 'tutor') {
      this.teacherService.teachersRetrieve(this.user.id).subscribe({
        next: (res) => {
          this.usName = res.name;
          this.teacher.set(res);
          let role = this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1);
          this.user.role = role;
          console.log(this.teacher());
        },
        error: (err) => {
          console.error('Failed to fetch teacher info: ' + err.message);
        }
      })
    }
  }

  logout() {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      sessionStorage.removeItem('user');
      window.location.reload();
    }
  }
}
