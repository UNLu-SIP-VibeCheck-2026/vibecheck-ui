import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Wallet, Transaction, Page } from '../models/wallet.model';
import { environment } from '../../environments/environment';

export interface SiweChallengeResponse {
  message: string;
  nonce: string;
}

export interface SiweVerifyResponse {
  walletAddress: string;
  linked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  /** @deprecated El backend actual no soporta billetera centralizada. */
  getWalletBalance(): Observable<Wallet> {
    return of({
      id: 0,
      address: '',
      network: '',
      ownerUsername: '',
      balances: []
    });
  }

  /** @deprecated El backend actual no soporta historial de transacciones centralizado. */
  getTransactionHistory(page: number = 0, size: number = 10): Observable<Transaction[]> {
    return of([]);
  }

  /** @deprecated El backend actual no soporta carga centralizada. */
  loadMoney(request: any): Observable<any> {
    return of(null);
  }

  /** @deprecated El backend actual no soporta retiro centralizado. */
  withdrawMoney(request: any): Observable<any> {
    return of(null);
  }

  // --- SIWE (Sign-In with Ethereum) endpoints ---

  requestChallenge(walletAddress: string): Observable<SiweChallengeResponse> {
    return this.http.post<SiweChallengeResponse>(`${this.apiUrl}/users/me/wallet/challenge`, { walletAddress });
  }

  verifyChallenge(walletAddress: string, message: string, signature: string): Observable<SiweVerifyResponse> {
    return this.http.post<SiweVerifyResponse>(`${this.apiUrl}/users/me/wallet/verify`, {
      walletAddress,
      message,
      signature
    });
  }
}

