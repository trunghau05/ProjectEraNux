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
    return this.http.get<TimeSlot[]>(`${this.baseUrl}/api/time-slots/teacher/${teacherId}/`);
  }

  getAvailableByTeacher(teacherId: number): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.baseUrl}/api/time-slots/teacher/${teacherId}/available/`);
  }

  markBooked(timeSlotId: number): Observable<TimeSlot> {
    return this.http.post<TimeSlot>(`${this.baseUrl}/api/time-slots/${timeSlotId}/mark-booked/`, {});
  }
}