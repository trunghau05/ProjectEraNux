import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NotificationStore } from '../../../stores/notification.store';
import { UserStore } from '../../../stores/user.store';

@Component({
  selector: 'app-user-info',
  imports: [CommonModule, MatIconModule],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss',
})
export class UserInfo implements OnInit {
  readonly userStore = inject(UserStore);
  readonly notificationStore = inject(NotificationStore);
  readonly expandedNotificationIds = signal<number[]>([]);
  readonly notifications = this.notificationStore.notifications;
  readonly unreadCount = this.notificationStore.unreadCount;

  ngOnInit(): void {
    // Fetch the current user's profile from the store on component init
    this.userStore.loadUserInfo();
    this.notificationStore.loadNotifications();
  }

  logout() {
    // Ask for confirmation before clearing the session and forcing a full page reload
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      sessionStorage.removeItem('user');
      window.location.reload();
    }
  }

  markAsRead(id: number): void {
    this.notificationStore.markAsRead(id);
  }

  isExpanded(id: number): boolean {
    // Check whether the notification detail panel is currently open
    return this.expandedNotificationIds().includes(id);
  }

  onNotificationClick(id: number): void {
    // Mark as read first, then toggle the expanded state
    this.markAsRead(id);
    this.expandedNotificationIds.update((ids) =>
      ids.includes(id) ? ids.filter((existingId) => existingId !== id) : [...ids, id],
    );
  }

  clearAllNotifications(): void {
    this.notificationStore.markAllRead();
    this.expandedNotificationIds.set([]);
  }
}
