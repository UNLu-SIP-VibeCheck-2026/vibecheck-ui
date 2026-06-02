import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  OperationalSummaryDTO,
  EventRankingItemDTO,
  FinancialSummaryDTO,
  AdvertisingRevenueDTO,
  AdvertisingTimeSeriesDTO,
  TokenStatsDTO,
  ScalpingWarningDTO
} from '../models/statistics.model';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/statistics/admin`;

  getOperationalSummary(): Observable<OperationalSummaryDTO> {
    return this.http.get<OperationalSummaryDTO>(`${this.apiUrl}/operational/summary`);
  }

  getEventsRanking(limit: number = 10): Observable<EventRankingItemDTO[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<EventRankingItemDTO[]>(`${this.apiUrl}/operational/events-ranking`, { params });
  }

  getFinancialSummary(from?: string, to?: string): Observable<FinancialSummaryDTO> {
    let params = new HttpParams();
    if (from) params = params.set('startDate', from);
    if (to) params = params.set('endDate', to);
    return this.http.get<FinancialSummaryDTO>(`${this.apiUrl}/financial/summary`, { params });
  }

  getAdvertisingRevenue(from?: string, to?: string): Observable<AdvertisingRevenueDTO> {
    let params = new HttpParams();
    if (from) params = params.set('startDate', from);
    if (to) params = params.set('endDate', to);
    return this.http.get<AdvertisingRevenueDTO>(`${this.apiUrl}/financial/advertising`, { params });
  }

  getAdvertisingTimeSeries(groupBy: 'day' | 'week' | 'month' = 'day'): Observable<AdvertisingTimeSeriesDTO[]> {
    const params = new HttpParams().set('groupBy', groupBy);
    return this.http.get<AdvertisingTimeSeriesDTO[]>(`${this.apiUrl}/financial/time-series`, { params });
  }

  getTokenStats(): Observable<TokenStatsDTO> {
    return this.http.get<TokenStatsDTO>(`${this.apiUrl}/token/stats`);
  }

  getScalpingWarnings(): Observable<ScalpingWarningDTO[]> {
    return this.http.get<ScalpingWarningDTO[]>(`${this.apiUrl}/security/scalping-warnings`);
  }
}
