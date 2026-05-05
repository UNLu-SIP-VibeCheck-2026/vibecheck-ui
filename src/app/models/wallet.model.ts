export interface BalanceEntry {
  token: string;
  contract: string;
  balance: number;
}

export interface Wallet {
  id: number;
  address: string;
  network: string;
  ownerUsername: string;
  balances: BalanceEntry[];
}

export type TransactionType = 'CREDIT' | 'DEBIT';

export interface Transaction {
  id: number;
  type: TransactionType;
  concept: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface LoadMoneyRequest {
  amount: number;
  token: string;
}

export interface WithdrawRequest {
  amount: number;
  token: string;
  method: string;
  destination: string;
}

export interface WithdrawResponse {
  amountRequested: number;
  fee: number;
  amountNet: number;
  balanceAfter: number;
  token: string;
  method: string;
  destination: string;
  status: string;
}
