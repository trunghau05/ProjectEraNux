import { inject, Injectable, signal } from '@angular/core';
import { BookingsService, Teacher, TeachersService, TimeSlot, TutorBookedStudent } from '../apis';
import { UserService } from '../services/user.service';
import { TimeSlotService } from '../services/time-slot.service';

@Injectable({
  providedIn: 'root',
})
export class BookingStore {
  private bookingsService = inject(BookingsService);
  private teachersService = inject(TeachersService);
  private userService = inject(UserService);
  private timeSlotService = inject(TimeSlotService);

  readonly user = this.userService.user;
  readonly tutors = signal<Teacher[]>([]);
  readonly bookedStudents = signal<TutorBookedStudent[]>([]);
  readonly availableSlotsByTutor = signal<Record<number, TimeSlot[]>>({});
  readonly slotsLoadingByTutor = signal<Record<number, boolean>>({});
  readonly actionLoading = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  private messageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  loadBookingData(): void {
    this.userService.loadUser();
    const currentUser = this.user();

    if (!currentUser?.id || !currentUser?.role) {
      this.tutors.set([]);
      this.bookedStudents.set([]);
      return;
    }

    this.isLoading.set(true);
    this.clearMessages();

    if (currentUser.role === 'student') {
      this.teachersService.teachersTutorsList().subscribe({
        next: (res) => {
          this.tutors.set(res);
          this.bookedStudents.set([]);
          this.availableSlotsByTutor.set({});
          this.slotsLoadingByTutor.set({});
          this.isLoading.set(false);
        },
        error: (err) => {
          this.setErrorMessage('Failed to fetch tutors: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (currentUser.role === 'tutor') {
      this.bookingsService.bookingsTutorStudentsList(currentUser.id).subscribe({
        next: (res) => {
          this.bookedStudents.set(res);
          this.tutors.set([]);
          this.availableSlotsByTutor.set({});
          this.slotsLoadingByTutor.set({});
          this.isLoading.set(false);
        },
        error: (err) => {
          this.setErrorMessage('Failed to fetch students who booked: ' + err.message);
          this.isLoading.set(false);
        },
      });
      return;
    }

    this.tutors.set([]);
    this.bookedStudents.set([]);
    this.availableSlotsByTutor.set({});
    this.slotsLoadingByTutor.set({});
    this.isLoading.set(false);
  }

  loadAvailableSlotsByTutor(teacherId: number, force = false): void {
    const currentSlots = this.availableSlotsByTutor()[teacherId];
    if (!force && currentSlots) {
      return;
    }

    this.setTutorSlotLoading(teacherId, true);
    this.clearMessages();

    this.timeSlotService.getAvailableByTeacher(teacherId).subscribe({
      next: (slots) => {
        this.availableSlotsByTutor.update((state) => ({
          ...state,
          [teacherId]: slots,
        }));
        this.setTutorSlotLoading(teacherId, false);
      },
      error: (err) => {
        this.setErrorMessage('Failed to fetch available time slots: ' + err.message);
        this.setTutorSlotLoading(teacherId, false);
      },
    });
  }

  private setSuccessMessage(message: string, timeoutMs = 4000): void {
    this.successMessage.set(message);
    this.errorMessage.set(null);
    this.startMessageTimeout(timeoutMs);
  }

  private setErrorMessage(message: string, timeoutMs = 5000): void {
    this.errorMessage.set(message);
    this.successMessage.set(null);
    this.startMessageTimeout(timeoutMs);
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.clearMessageTimeout();
  }

  private startMessageTimeout(timeoutMs: number): void {
    this.clearMessageTimeout();
    this.messageTimeoutId = setTimeout(() => {
      this.successMessage.set(null);
      this.errorMessage.set(null);
      this.messageTimeoutId = null;
    }, timeoutMs);
  }

  private clearMessageTimeout(): void {
    if (!this.messageTimeoutId) {
      return;
    }

    clearTimeout(this.messageTimeoutId);
    this.messageTimeoutId = null;
  }

  private setTutorSlotLoading(teacherId: number, isLoading: boolean): void {
    this.slotsLoadingByTutor.update((state) => ({
      ...state,
      [teacherId]: isLoading,
    }));
  }
}