export interface Wallet {
  id: number;
  address: string;
  network: string;
  balance: number;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND';

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
}
