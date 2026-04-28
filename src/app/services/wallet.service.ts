import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Wallet, Transaction } from '../models/wallet.model';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  // Dummy Data State
  private mockWallet: Wallet = { balance: 0 };
  private mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      amount: 15000,
      type: 'DEPOSIT',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      description: 'Carga inicial mediante transferencia'
    },
    {
      id: 'tx-2',
      amount: 3500,
      type: 'PAYMENT',
      date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      description: 'Compra de entrada VibeFest 2026'
    },
    {
      id: 'tx-3',
      amount: 1200,
      type: 'PAYMENT',
      date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      description: 'Consumo en Barra Sector VIP'
    },
    {
      id: 'tx-4',
      amount: 5000,
      type: 'DEPOSIT',
      date: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
      description: 'Carga de saldo via MP'
    },
    {
      id: 'tx-5',
      amount: 850,
      type: 'PAYMENT',
      date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      description: 'Merchandising Oficial - Llavero'
    },
    {
      id: 'tx-6',
      amount: 2500,
      type: 'WITHDRAWAL',
      date: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      description: 'Retiro a cuenta bancaria'
    },
    {
      id: 'tx-7',
      amount: 450,
      type: 'REFUND',
      date: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      description: 'Devolución de carga fallida'
    }
  ];

  private balanceSubject = new BehaviorSubject<number>(0);
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);

  constructor() {
    this.calculateBalance();
    this.transactionsSubject.next(this.mockTransactions);
  }

  getWalletBalance(): Observable<number> {
    return this.balanceSubject.asObservable();
  }

  getTransactionHistory(): Observable<Transaction[]> {
    return this.transactionsSubject.asObservable();
  }

  loadMoney(amount: number): Observable<{success: boolean, message: string}> {
    // Simulamos una latencia de red de 800ms
    const newTransaction: Transaction = {
      id: `tx-${Math.random().toString(36).substring(2, 9)}`,
      amount: amount,
      type: 'DEPOSIT',
      date: new Date().toISOString(),
      description: 'Carga de saldo manual'
    };

    // Agregamos la transacción al inicio del arreglo
    this.mockTransactions = [newTransaction, ...this.mockTransactions];
    this.transactionsSubject.next(this.mockTransactions);
    this.calculateBalance();

    return of({ success: true, message: 'Saldo cargado exitosamente' }).pipe(delay(800));
  }

  withdrawMoney(amount: number): Observable<{success: boolean, message: string}> {
    // Simulamos una latencia de red de 800ms
    const newTransaction: Transaction = {
      id: `tx-${Math.random().toString(36).substring(2, 9)}`,
      amount: amount,
      type: 'WITHDRAWAL',
      date: new Date().toISOString(),
      description: 'Retiro de saldo manual'
    };

    // Agregamos la transacción al inicio del arreglo
    this.mockTransactions = [newTransaction, ...this.mockTransactions];
    this.transactionsSubject.next(this.mockTransactions);
    this.calculateBalance();

    return of({ success: true, message: 'Saldo retirado exitosamente' }).pipe(delay(800));
  }

  private calculateBalance() {
    const balance = this.mockTransactions.reduce((acc, tx) => {
      if (tx.type === 'DEPOSIT' || tx.type === 'REFUND') return acc + tx.amount;
      if (tx.type === 'WITHDRAWAL' || tx.type === 'PAYMENT') return acc - tx.amount;
      return acc;
    }, 0);
    this.mockWallet.balance = balance;
    this.balanceSubject.next(balance);
  }
}
