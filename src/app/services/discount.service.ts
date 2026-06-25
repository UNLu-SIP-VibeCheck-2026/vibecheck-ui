import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TicketDiscountPreview {
  vbkBruto: number;
  descuentoVBK: number;
  vbkNetoFinal: number;
}

export interface DiscountPreviewResponse {
  fanTier: string;
  discountBps: number;
  usosRestantesAnio: number;
  previews: Record<number, TicketDiscountPreview>;
}

export interface TierConfigResponse {
  tier: string;
  minPoints: number;
  discountBps: number;
  usesMaxPerYear: number;
  cashbackPercent: number;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiscountService {
  private http = inject(HttpClient);

  getPreview(eventNFT: string, fanAddress: string): Observable<DiscountPreviewResponse> {
    return this.http.get<DiscountPreviewResponse>(
      `${environment.apiBaseUrl}/discount/preview`,
      { params: { eventNFT, fanAddress } }
    );
  }

  getTiersConfig(): Observable<TierConfigResponse[]> {
    return this.http.get<TierConfigResponse[]>(`${environment.apiBaseUrl}/tiers/config`);
  }
}
