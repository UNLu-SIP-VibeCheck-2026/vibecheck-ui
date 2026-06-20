import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface StakeLockDTO {
  id: number;
  lockIdOnChain: number;
  amountVbk: number;
  usdcValueFrozen: number;
  termDays: number;
  tier: string;
  status: string;
  electedBenefit: string | null;
  feefreeRemaining: number;
  lockedAt: string;
  unlockAt: string;
  isExpired: boolean;
  isWithdrawable: boolean;
}

export interface StakingSummary {
  wallet: string;
  tier: string;
  activeMultiplier: number;
  feefreeRemaining: number;
  presaleActive: boolean;
  claimableCashback: number;
  locks: StakeLockDTO[];
}

export interface QuoteResponse {
  usdcTarget: number;
  termDays: number;
  vbkNeeded: number;
}

import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class StakingService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/staking`;

  getStakingSummary(wallet: string): Observable<StakingSummary> {
    return this.http.get<StakingSummary>(`${this.baseUrl}/${wallet}`);
  }

  quoteStake(usdcTarget: number, termDays: number): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>(`${this.baseUrl}/lock/quote`, {
      usdcTarget,
      termDays,
    });
  }

  electBenefit(wallet: string, dbLockId: number, benefit: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/benefit/elect`, {
      wallet,
      dbLockId,
      benefit,
    });
  }

  claimCashback(wallet: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cashback/claim`, {
      wallet,
    });
  }

  setVenueWalletFeeExempt(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/venue-wallets/${id}/exempt`, {});
  }

  getAllVenueWallets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/venue-wallets`);
  }

  registerVenueWallet(address: string, name: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/venue-wallets`, { address, name });
  }
}
