import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CronJobExecutionResponse {
  jobName: string;
  status: string;
  message: string;
  executedAt: string;
  recordsProcessed: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class CronJobService {
  private apiUrl = `${environment.apiBaseUrl}/cron-job`;

  constructor(private http: HttpClient) {}

  cleanupExpiredTokens(): Observable<CronJobExecutionResponse> {
    return this.http.post<CronJobExecutionResponse>(`${this.apiUrl}/cleanup-expired-tokens`, {});
  }

  cleanupExpiredVerificationTokens(): Observable<CronJobExecutionResponse> {
    return this.http.post<CronJobExecutionResponse>(`${this.apiUrl}/cleanup-expired-verification-tokens`, {});
  }

  cleanupExpiredPasswordResetTokens(): Observable<CronJobExecutionResponse> {
    return this.http.post<CronJobExecutionResponse>(`${this.apiUrl}/cleanup-expired-password-reset-tokens`, {});
  }

  cleanupExpiredAdvertisements(): Observable<CronJobExecutionResponse> {
    return this.http.post<CronJobExecutionResponse>(`${this.apiUrl}/cleanup-expired-advertisements`, {});
  }

  updateCompletedEvents(): Observable<CronJobExecutionResponse> {
    return this.http.post<CronJobExecutionResponse>(`${this.apiUrl}/update-completed-events`, {});
  }

  reconcileStuckTransactions(): Observable<CronJobExecutionResponse> {
    return this.http.post<CronJobExecutionResponse>(`${this.apiUrl}/reconcile-stuck-transactions`, {});
  }

  runBlockchainIndexer(): Observable<CronJobExecutionResponse> {
    return this.http.post<CronJobExecutionResponse>(`${this.apiUrl}/run-blockchain-indexer`, {});
  }
}
