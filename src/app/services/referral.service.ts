import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";

export interface ReferralCodeResponse {
  referralCode: string;
  referralLink: string;
}

export interface ReferralDetail {
  username: string;
  createdAt: string;
  state: "PENDING" | "COMPLETED" | "FAILED" | "LIMIT_EXCEEDED";
  rewardTxHash?: string;
}

export interface ReferralStatsResponse {
  totalReferred: number;
  totalEarnedVbk: number;
  maxReferrals: number;
  currentTier: string;
  referrals: ReferralDetail[];
}

@Injectable({
  providedIn: "root",
})
export class ReferralService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/referrals`;

  getMyReferralCode(): Observable<ReferralCodeResponse> {
    return this.http.get<ReferralCodeResponse>(`${this.apiUrl}/my-code`);
  }

  getReferralStats(): Observable<ReferralStatsResponse> {
    return this.http.get<ReferralStatsResponse>(`${this.apiUrl}/stats`);
  }

  recommend(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/recommend`, { email });
  }
}
