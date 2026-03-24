import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LoginService } from '../apis';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  template: `
    <div class="auth-container">
      <style>
        .auth-container{padding:48px 16px; background:#f5f7fb; display:flex; justify-content:center}
        .auth-box{width:100%; max-width:920px; display:flex; gap:0; align-items:stretch; box-shadow:0 8px 20px rgba(0,0,0,0.06); border-radius:10px; overflow:hidden; height:476px}
        .auth-left{flex:1; min-width:280px; background:linear-gradient(135deg,#6b46c1 0%,#9f7aea 100%); color:#fff; padding:36px; display:flex; flex-direction:column; justify-content:flex-start; gap:8px}
        .auth-left h2{margin:0;font-size:20px}
        .auth-left p{margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px}
        .auth-right{width:360px; background:#fff; padding:28px; display:flex; justify-content:center; flex-direction:column; gap:12px; overflow-y:auto}
        .auth-right h3{margin:0 0 6px;font-size:18px;color:#222}
        .form-row{display:flex; flex-direction:column; gap:10px}
        .field{padding:10px 12px; border:1px solid #e6eef7; border-radius:6px; outline:none; font-size:12px}
        .actions{display:flex; justify-content:space-between; align-items:center; font-size:12px}
        .primary{background:#6b46c1;color:#fff;border:none;padding:10px 12px;border-radius:6px;font-weight:600;cursor:pointer}
        .socials{display:flex; gap:8px; justify-content:center}
        .socials button{padding:8px 12px; border:1px solid #e3e8ef; border-radius:6px; background:#fff; cursor:pointer}
        .muted{color:#666;font-size:12px;text-align:center}
        .password-wrapper{position:relative; display:flex; align-items:center}
        .password-wrapper input{flex:1; padding-right:40px}
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
          <h2>Continue your learning journey</h2>
          <p>Join live classes, track progress, and learn from experienced teachers and tutors.</p>
          <div class="img">
            <img src="form-art.png" alt="">
          </div>
        </div>

        <div class="auth-right">
          <h3>Sign in to EraNux</h3>
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="form-row">
            <input [(ngModel)]="email" name="email" type="email" placeholder="Email address" required class="field" />
            <div class="password-wrapper">
              <input [(ngModel)]="password" name="password" [type]="showPassword ? 'text' : 'password'" placeholder="Password" required class="field" />
              <mat-icon class="eye-icon" (click)="showPassword = !showPassword">{{ showPassword ? 'visibility' : 'visibility_off' }}</mat-icon>
            </div>
            
            <button type="submit" [disabled]="isLoading" class="primary" style="display:flex;align-items:center;justify-content:center;gap:8px">
              @if (isLoading) {
                <div class="spinner"></div>
              } @else {
                Log in
              }
            </button>
            
            <div class="actions">
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" [(ngModel)]="remember" name="remember" style="width:16px; height:16px;" />
                Remember me
              </label>
              <a routerLink="/forgot" style="color:#6b46c1; text-decoration:none; font-size:12px">Forgot password?</a>
            </div>
          </form>

          <div class="muted">Or sign in with</div>
          <div class="socials">
            <button>Google</button>
            <button>Facebook</button>
            <button>GitHub</button>
          </div>

          <div class="muted">Don't have an account? <a routerLink="/register" style="color:#6b46c1; text-decoration:none;">Register now</a></div>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private router = inject(Router);
  private loginService = inject(LoginService);

  email = '';
  password = '';
  remember = false;
  isLoading = false;
  showPassword = false;

  onSubmit() {
    this.isLoading = true;
    
    const payload = {
      email: this.email,
      password: this.password,
    };

    this.loginService.loginCreate(payload).subscribe({
      next: (res) => {
        sessionStorage.setItem('user', JSON.stringify(res));        
        this.isLoading = false;
        alert('Login successful!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;        
        alert(err.error.message);
      }
    })
  }
}
