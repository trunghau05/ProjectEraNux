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
    // Convenience method: show a green success toast
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 5000): void {
    // Convenience method: show a red error toast with a slightly longer default duration
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = 4000): void {
    // Convenience method: show a blue informational toast
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs = 4500): void {
    // Convenience method: show an amber warning toast
    this.show(message, 'warning', durationMs);
  }

  show(message: string, type: ToastType = 'info', durationMs = 4000): void {
    // Trim whitespace; silently ignore blank messages
    const normalizedMessage = message?.trim();
    if (!normalizedMessage) {
      return;
    }

    // Append a new toast entry with a unique auto-incremented ID
    const id = this.nextId++;
    this.toasts.update((current) => [...current, { id, message: normalizedMessage, type, durationMs }]);
  }

  dismiss(id: number): void {
    // Remove the toast matching the given ID from the signal queue
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}
