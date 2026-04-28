import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { Wallet, Transaction, Page } from '../models/wallet.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getWalletBalance(): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiUrl}/wallets/me`);
  }

  getTransactionHistory(page: number = 0, size: number = 10): Observable<Transaction[]> {
    return this.http.get<Page<Transaction>>(`${this.apiUrl}/wallets/me/transactions?page=${page}&size=${size}`)
      .pipe(map(response => response.content));
  }

  loadMoney(amount: number): Observable<{success: boolean, message: string}> {
    // Endpoint no implementado en el backend todavía
    return throwError(() => new Error('Not implemented'));
  }

  withdrawMoney(amount: number): Observable<{success: boolean, message: string}> {
    // Endpoint no implementado en el backend todavía
    return throwError(() => new Error('Not implemented'));
  }
}
