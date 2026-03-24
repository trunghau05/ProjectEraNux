import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UserStore } from '../../../stores/user.store';

@Component({
  selector: 'app-user-info',
  imports: [CommonModule, MatIconModule],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss',
})
export class UserInfo implements OnInit {
  readonly userStore = inject(UserStore);

  ngOnInit(): void {
    this.userStore.loadUserInfo();
  }

  logout() {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      sessionStorage.removeItem('user');
      window.location.reload();
    }
  }
}
