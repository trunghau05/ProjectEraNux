import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { StudentsService, TeachersService } from '../apis';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  template: `
    <div class="auth-container">
      <style>
        .auth-container{padding:48px 16px; background:#f5f7fb; display:flex; justify-content:center}
        .auth-box{width:100%; max-width:920px; display:flex; gap:0; align-items:stretch; box-shadow:0 8px 20px rgba(0,0,0,0.06); border-radius:10px; overflow:hidden; height:476px}
        .auth-left{flex:1; min-width:280px; background:linear-gradient(135deg,#6b46c1 0%,#9f7aea 100%); color:#fff; padding:36px; display:flex; flex-direction:column; justify-content:flex-start; gap:8px}
        .auth-left h2{margin:0;font-size:20px}
        .auth-left p{margin:6px 0 0;color:rgba(255,255,255,0.95);font-size:13px}
        .auth-right{width:360px; background:#fff; padding:28px; display:flex; flex-direction:column; gap:12px; overflow-y:auto}
        .auth-right h3{margin:0 0 6px;font-size:18px;color:#222}
        .form-row{display:flex; flex-direction:column; gap:10px}
        .field{padding:10px 12px; border:1px solid #e6eef7; border-radius:6px; outline:none; font-size:12px}
        .primary{background:#6b46c1;color:#fff;border:none;padding:10px 12px;border-radius:6px;font-weight:600;cursor:pointer}
        .muted{color:#666;font-size:12px;text-align:center}
        .role-row{display:flex; gap:8px; align-items:center; font-size:12px;}
        .password-wrapper{position:relative; display:flex; align-items:center; flex:1; min-width:0}
        .password-wrapper input{flex:1; padding-right:40px; min-width:0}
        .eye-icon{position:absolute; right:12px; cursor:pointer; color:#999; user-select:none; font-size:15px; width:15px; height:15px}
        .spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .img {flex:1; display:flex; justify-content:center; align-items:flex-end; margin-top:12px}
        .img img {max-width:100%; height:auto;}
        @media(max-width:760px){
          .auth-box{flex-direction:column; height:auto}
          .auth-right{width:100%}
        }
      </style>

      <div class="auth-box">
        <div class="auth-left">
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:40px;height:40px;transform:rotate(90deg);font-family:fantasy;border-radius:8px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-weight:700">EN</div>
            <div style="font-weight:700">EraNux</div>
          </div>
          <h2>Teach or learn — your choice</h2>
          <p>Sign up to create classes, find tutors, or enroll in courses. Manage your schedule and track progress.</p>
          <div class="img">
            <img src="form-art.png" alt="">
          </div>
        </div>

        <div class="auth-right">
          <h3>Create your EraNux account</h3>
          <form (ngSubmit)="onSubmit()" #registerForm="ngForm" class="form-row">
            <input [(ngModel)]="fullName" name="fullName" type="text" placeholder="Full name" required class="field" />
            <input [(ngModel)]="email" name="email" type="email" placeholder="Email address" required class="field" />

            <div style="display:flex; gap:8px;">
              <div class="password-wrapper">
                <input [(ngModel)]="password" name="password" [type]="showPassword ? 'text' : 'password'" placeholder="Password" required class="field" />
                <mat-icon class="eye-icon" (click)="showPassword = !showPassword">{{ showPassword ? 'visibility' : 'visibility_off' }}</mat-icon>
              </div>
              <div class="password-wrapper">
                <input [(ngModel)]="confirmPassword" name="confirmPassword" [type]="showConfirmPassword ? 'text' : 'password'" placeholder="Confirm password" required class="field" />
                <mat-icon class="eye-icon" (click)="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? 'visibility' : 'visibility_off' }}</mat-icon>
              </div>
            </div>

            <div class="role-row">
              <div style="white-space:nowrap; width:58px">Role:</div>
              <label style="display:inline-flex; align-items:center; gap:8px; margin-right:8px;">
                <input type="radio" [(ngModel)]="role" name="role" value="student" /> Student
              </label>
              <label style="display:inline-flex; align-items:center; gap:8px; margin-right:8px;">
                <input type="radio" [(ngModel)]="role" name="role" value="teacher" /> Teacher
              </label>
              <label style="display:inline-flex; align-items:center; gap:8px;">
                <input type="radio" [(ngModel)]="role" name="role" value="tutor" /> Tutor
              </label>
            </div>

            @if (role === 'student') {
              <div style="display:flex; flex-direction:column; gap:8px;">
                <input [(ngModel)]="level" name="level" type="text" placeholder="Level (e.g. Grade/Level)" class="field" />
                <input [(ngModel)]="birth" name="birth" type="date" placeholder="Birth date" class="field" />
                <input [(ngModel)]="phone" name="phone" type="tel" placeholder="Phone" class="field" />
              </div>
            }

            @if (role === 'teacher' || role === 'tutor') {
              <div style="display:flex; flex-direction:column; gap:8px;">
                <input [(ngModel)]="bio" name="bio" type="text" placeholder="Short bio / qualifications" class="field" />
                <input [(ngModel)]="birth" name="birthTeacher" type="date" placeholder="Birth date" class="field" />
                <input [(ngModel)]="phone" name="phoneTeacher" type="tel" placeholder="Phone" class="field" />
              </div>
            }

            <button type="submit" [disabled]="isLoading" class="primary" style="display:flex;align-items:center;justify-content:center;gap:8px">
              @if (isLoading) {
                <div class="spinner"></div>
              } @else {
                Register
              }
            </button>
          </form>

          <div class="muted">Already have an account? <a routerLink="/login" style="color:#6b46c1; text-decoration:none;">Log in</a></div>
        </div>
      </div>
    </div>
  `,
})
export class Register {
  private teacherService = inject(TeachersService);
  private studentService = inject(StudentsService);
  private router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  role: 'student' | 'teacher' | 'tutor' | '' = 'student';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  birth: string | null = null;
  level = '';
  phone = '';

  bio = '';

  onSubmit() {
    if (!this.fullName || !this.email || !this.password || !this.confirmPassword || !this.role) {
      alert('Please fill all required fields and select a role');
      return;
    }
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (this.role === 'student') {
      if (!this.birth || !this.level || !this.phone) {
        alert('Please provide birth date, level and phone for students');
        return;
      }
    }

    if (this.role === 'teacher' || this.role === 'tutor') {
      if (!this.bio || !this.birth || !this.phone) {
        alert('Please provide a short bio, birth date and phone for teachers/tutors');
        return;
      }
    }

    this.isLoading = true;

    const payload: any = {
      name: this.fullName,
      email: this.email,
      password: this.password,
      role: this.role,
    };

    if (this.role === 'student') {
      payload.birth = this.birth;
      payload.level = this.level;
      payload.phone = this.phone;
    } else {
      payload.bio = this.bio;
      payload.birth = this.birth;
      payload.phone = this.phone;
      payload.label = this.role; 
    }

    if (this.role === 'student') {
      this.studentService.studentsCreate(payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          alert('Registration successful! Please log in.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading = false;
          alert('Registration failed: ' + err.message);
        }
      })
    } else {
      this.teacherService.teachersCreate(payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          alert('Registration successful! Please log in.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading = false;
          alert('Registration failed: ' + err.message);
        }
      });
    }
  }
}

