import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface TranscribeSummaryResponse {
  summary: string;
  transcript?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SttService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8001/api/stt';

  transcribeSummary(audioUrl: string): Observable<TranscribeSummaryResponse> {
    const formData = new FormData();
    formData.append('audio_url', audioUrl);

    return this.http.post<TranscribeSummaryResponse>(`${this.baseUrl}/transcribe-summary`, formData);
  }
}
