import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UserStore } from '../../../stores/user.store';

type UserNotification = {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

@Component({
  selector: 'app-user-info',
  imports: [CommonModule, MatIconModule],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss',
})
export class UserInfo implements OnInit {
  readonly userStore = inject(UserStore);
  readonly expandedNotificationIds = signal<number[]>([]);
  readonly notifications = signal<UserNotification[]>([
    {
      id: 1,
      title: 'Session reminder',
      message: 'You have a Math session at 3:00 PM today.',
      time: '5m ago',
      read: false,
    },
    {
      id: 2,
      title: 'Booking update',
      message: 'Your Physics class booking has been confirmed.',
      time: '1h ago',
      read: false,
    },
    {
      id: 3,
      title: 'Class material',
      message: 'New documents were uploaded for Chemistry.',
      time: 'Yesterday',
      read: true,
    },
  ]);

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

  markAsRead(id: number): void {
    this.notifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  isExpanded(id: number): boolean {
    return this.expandedNotificationIds().includes(id);
  }

  onNotificationClick(id: number): void {
    this.markAsRead(id);
    this.expandedNotificationIds.update((ids) =>
      ids.includes(id) ? ids.filter((existingId) => existingId !== id) : [...ids, id],
    );
  }

  clearAllNotifications(): void {
    this.notifications.set([]);
    this.expandedNotificationIds.set([]);
  }
}
