import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { Transaction } from '../../models/wallet.model';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.css'
})
export class WalletComponent {
  private walletService = inject(WalletService);

  balance$ = this.walletService.getWalletBalance();
  transactions$ = this.walletService.getTransactionHistory();
  
  isCharging = false;
  amountToCharge: number | null = null;
  isLoading = false;

  toggleChargeForm() {
    this.isCharging = !this.isCharging;
    this.amountToCharge = null;
  }

  chargeMoney() {
    if (this.amountToCharge && this.amountToCharge > 0) {
      this.isLoading = true;
      this.walletService.loadMoney(this.amountToCharge).subscribe({
        next: () => {
          this.isLoading = false;
          this.isCharging = false;
          this.amountToCharge = null;
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error al cargar dinero', err);
        }
      });
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
