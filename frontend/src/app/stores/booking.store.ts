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
    // Reload user info from session storage to ensure it's up to date
    this.userService.loadUser();
    const currentUser = this.user();

    // Guard: bail out if user is not authenticated or has no role
    if (!currentUser?.id || !currentUser?.role) {
      this.tutors.set([]);
      this.bookedStudents.set([]);
      return;
    }

    this.isLoading.set(true);
    this.clearMessages();

    if (currentUser.role === 'student') {
      // Students see the list of all available tutors to potentially book
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
      // Tutors see the students who have booked their time slots
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

    // Other roles (e.g., teacher) have no booking page data
    this.tutors.set([]);
    this.bookedStudents.set([]);
    this.availableSlotsByTutor.set({});
    this.slotsLoadingByTutor.set({});
    this.isLoading.set(false);
  }

  loadAvailableSlotsByTutor(teacherId: number, force = false): void {
    const currentSlots = this.availableSlotsByTutor()[teacherId];
    // Skip fetching if slots are already cached and a forced refresh is not requested
    if (!force && currentSlots) {
      return;
    }

    // Show a per-tutor loading indicator while fetching slots
    this.setTutorSlotLoading(teacherId, true);
    this.clearMessages();

    this.timeSlotService.getAvailableByTeacher(teacherId).subscribe({
      next: (slots) => {
        // Merge the fetched slots into the keyed map, replacing any stale data for this tutor
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
    // Show success message and clear any existing error, then auto-dismiss after timeout
    this.successMessage.set(message);
    this.errorMessage.set(null);
    this.startMessageTimeout(timeoutMs);
  }

  private setErrorMessage(message: string, timeoutMs = 5000): void {
    // Show error message and clear any existing success, then auto-dismiss after timeout
    this.errorMessage.set(message);
    this.successMessage.set(null);
    this.startMessageTimeout(timeoutMs);
  }

  private clearMessages(): void {
    // Clear both success and error messages and cancel any pending auto-dismiss timer
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.clearMessageTimeout();
  }

  private startMessageTimeout(timeoutMs: number): void {
    // Cancel any previously scheduled dismiss before starting a fresh timer
    this.clearMessageTimeout();
    this.messageTimeoutId = setTimeout(() => {
      // Auto-clear both messages when the timer fires
      this.successMessage.set(null);
      this.errorMessage.set(null);
      this.messageTimeoutId = null;
    }, timeoutMs);
  }

  private clearMessageTimeout(): void {
    // If no timer is active, do nothing
    if (!this.messageTimeoutId) {
      return;
    }

    // Cancel the pending timeout to prevent stale dismissal
    clearTimeout(this.messageTimeoutId);
    this.messageTimeoutId = null;
  }

  private setTutorSlotLoading(teacherId: number, isLoading: boolean): void {
    // Update the per-tutor loading state without replacing other tutors' states
    this.slotsLoadingByTutor.update((state) => ({
      ...state,
      [teacherId]: isLoading,
    }));
  }
}