import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TimeSlot } from '../apis';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TimeSlotService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getByTeacher(teacherId: number): Observable<TimeSlot[]> {
    // Fetch all time slots (any status) belonging to the given teacher
    return this.http.get<TimeSlot[]>(`${this.baseUrl}/api/time-slots/teacher/${teacherId}/`);
  }

  getAvailableByTeacher(teacherId: number): Observable<TimeSlot[]> {
    // Fetch only available (not yet booked) time slots for the given teacher
    return this.http.get<TimeSlot[]>(`${this.baseUrl}/api/time-slots/teacher/${teacherId}/available/`);
  }

  markBooked(timeSlotId: number): Observable<TimeSlot> {
    // Send a POST request to mark a time slot as booked after a booking is confirmed
    return this.http.post<TimeSlot>(`${this.baseUrl}/api/time-slots/${timeSlotId}/mark-booked/`, {});
  }
}