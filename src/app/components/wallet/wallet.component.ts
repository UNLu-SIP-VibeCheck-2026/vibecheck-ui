import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WalletService } from '../../services/wallet.service';
import { Transaction, Wallet } from '../../models/wallet.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule, MatSnackBarModule],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.css'
})
export class WalletComponent {
  private walletService = inject(WalletService);
  private snackBar = inject(MatSnackBar);

  balance$: Observable<Wallet> = this.walletService.getWalletBalance();
  transactions$: Observable<Transaction[]> = this.walletService.getTransactionHistory();
  
  isCharging = false;
  isWithdrawing = false;
  amountToCharge: number | null = null;
  amountToWithdraw: number | null = null;
  isLoading = false;

  toggleChargeForm() {
    this.isCharging = !this.isCharging;
    this.isWithdrawing = false;
    this.amountToCharge = null;
  }

  toggleWithdrawForm() {
    this.isWithdrawing = !this.isWithdrawing;
    this.isCharging = false;
    this.amountToWithdraw = null;
  }

  chargeMoney() {
    if (this.amountToCharge && this.amountToCharge > 0) {
      this.snackBar.open('Función en desarrollo', 'Cerrar', { duration: 3000 });
      this.toggleChargeForm();
    }
  }

  withdrawMoney() {
    if (this.amountToWithdraw && this.amountToWithdraw > 0) {
      this.snackBar.open('Función en desarrollo', 'Cerrar', { duration: 3000 });
      this.toggleWithdrawForm();
    }
  }

  getIconForType(type: string): string {
    switch(type) {
      case 'DEPOSIT': return 'arrow_downward';
      case 'WITHDRAWAL': return 'arrow_upward';
      case 'PAYMENT': return 'payment';
      case 'REFUND': return 'replay';
      default: return 'attach_money';
    }
  }

  getAmountClass(type: string): string {
    return (type === 'DEPOSIT' || type === 'REFUND') ? 'positive-amount' : 'negative-amount';
  }
}
