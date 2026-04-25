export interface Wallet {
  balance: number;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
}

export interface LoadMoneyRequest {
  amount: number;
}
