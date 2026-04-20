import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  durationMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);
  private nextId = 1;

  success(message: string, durationMs = 4000): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 5000): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = 4000): void {
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs = 4500): void {
    this.show(message, 'warning', durationMs);
  }

  show(message: string, type: ToastType = 'info', durationMs = 4000): void {
    const normalizedMessage = message?.trim();
    if (!normalizedMessage) {
      return;
    }

    const id = this.nextId++;
    this.toasts.update((current) => [...current, { id, message: normalizedMessage, type, durationMs }]);
  }

  dismiss(id: number): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}
