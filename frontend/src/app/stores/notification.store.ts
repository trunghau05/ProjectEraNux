import { Injectable, computed, inject, signal } from '@angular/core';
import { NotificationsService } from '../apis/api/notifications.service';
import { Notification as ApiNotification } from '../apis/model/notification';
import { UserService } from '../services/user.service';

export type Notification = {
  id: number;
  role: string;
  student_id: number | null;
  teacher_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private notificationsService = inject(NotificationsService);
  private userService = inject(UserService);

  private readonly _notifications = signal<Notification[]>([]);
  readonly isLoading = signal<boolean>(false);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() =>
    this._notifications().filter((n) => !n.is_read).length,
  );

  private toStoreNotification(notification: ApiNotification): Notification {
    return {
      id: notification.id,
      role: String(notification.role),
      student_id: notification.student_id,
      teacher_id: notification.teacher_id,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read ?? false,
      created_at: notification.created_at,
    };
  }

  loadNotifications(): void {
    const user = this.userService.user();
    if (!user?.id || !user?.role) return;

    this.isLoading.set(true);
    this.notificationsService.notificationsList(user.role, user.id).subscribe({
      next: (data) => {
        this._notifications.set(data.map((item) => this.toStoreNotification(item)));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  markAsRead(id: number): void {
    this.notificationsService.notificationsPartialUpdate(id, { is_read: true }).subscribe({
      next: (updated) => {
        const mappedNotification = this.toStoreNotification(updated);
        this._notifications.update((items) =>
          items.map((n) => (n.id === id ? mappedNotification : n)),
        );
      },
    });
  }

  markAllRead(): void {
    const user = this.userService.user();
    if (!user?.id || !user?.role) return;

    this.notificationsService
      .notificationsMarkAllReadCreate({} as ApiNotification, user.role, user.id)
      .subscribe({
      next: () => {
        this._notifications.update((items) =>
          items.map((n) => ({ ...n, is_read: true })),
        );
      },
    });
  }
}
