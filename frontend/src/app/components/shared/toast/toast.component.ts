import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ToastItem, ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="toast-host" aria-live="polite" aria-atomic="true">
      @for (toast of toasts(); track toast.id) {
        <div class="toast-item" [ngClass]="{ leaving: isLeaving(toast.id) }">
          <div class="toast-icon">
            <mat-icon>{{ getIcon(toast.type) }}</mat-icon>
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button
            class="toast-close"
            type="button"
            (click)="dismiss(toast.id)"
            aria-label="Dismiss notification">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-host {
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 1200;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(92vw, 360px);
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 6px;
      padding: 10px 12px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
      color: #1f2937;
      background: #ffffff;
      animation: toast-slide-in 180ms ease-out;
    }

    .toast-item.leaving {
      animation: toast-slide-out 180ms ease-in forwards;
    }

    .toast-icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
      color: #4b5563;
      display: block;
    }

    .toast-message {
      font-size: 12px;
      font-weight: 500;
      line-height: 1.35;
      word-break: break-word;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .toast-close {
      border: none;
      background: transparent;
      padding: 0;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #6b7280;
    }

    .toast-close mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      line-height: 16px;
    }

    @keyframes toast-slide-in {
      from {
        opacity: 0;
        transform: translateX(-24px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes toast-slide-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(-24px);
      }
    }

    @media (max-width: 768px) {
      .toast-host {
        left: 12px;
        right: 12px;
        bottom: 12px;
        width: auto;
      }
    }
  `,
})
export class ToastComponent {
  private toastService = inject(ToastService);
  private autoCloseTimerIds = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly exitDurationMs = 180;

  readonly toasts = this.toastService.toasts;
  readonly leavingIds = signal<Record<number, true>>({});

  constructor() {
    effect(() => {
      const currentToasts = this.toasts();
      const activeIds = new Set(currentToasts.map((toast) => toast.id));

      for (const [id, timerId] of this.autoCloseTimerIds.entries()) {
        if (!activeIds.has(id)) {
          clearTimeout(timerId);
          this.autoCloseTimerIds.delete(id);
        }
      }

      for (const toast of currentToasts) {
        if (toast.durationMs > 0 && !this.autoCloseTimerIds.has(toast.id)) {
          const timerId = setTimeout(() => {
            this.dismiss(toast.id);
          }, toast.durationMs);
          this.autoCloseTimerIds.set(toast.id, timerId);
        }
      }
    });
  }

  dismiss(id: number): void {
    if (this.leavingIds()[id]) {
      return;
    }

    const existingTimer = this.autoCloseTimerIds.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.autoCloseTimerIds.delete(id);
    }

    this.leavingIds.update((state) => ({ ...state, [id]: true }));

    setTimeout(() => {
      const nextState = { ...this.leavingIds() };
      delete nextState[id];
      this.leavingIds.set(nextState);
      this.toastService.dismiss(id);
    }, this.exitDurationMs);
  }

  isLeaving(id: number): boolean {
    return Boolean(this.leavingIds()[id]);
  }

  getIcon(type: ToastItem['type']): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }
}
