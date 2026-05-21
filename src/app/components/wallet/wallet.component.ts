import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WalletService } from '../../services/wallet.service';
import { Transaction, Wallet } from '../../models/wallet.model';
import { Observable } from 'rxjs';
import { Web3WalletComponent } from './web3-wallet/web3-wallet.component';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule, MatSnackBarModule, Web3WalletComponent],
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
  chargeToken: string = 'VBK';
  amountToWithdraw: number | null = null;
  withdrawToken: string = 'VBK';
  withdrawMethod: string = 'mercadopago';
  withdrawDestination: string = '';
  isLoading = false;

  getMainBalance(wallet: Wallet | null | undefined): number {
    if (!wallet || !wallet.balances) return 0;
    const vbkBalance = wallet.balances.find(b => b.token === 'VBK');
    return vbkBalance ? vbkBalance.balance : (wallet.balances[0]?.balance || 0);
  }

  toggleChargeForm() {
    this.isCharging = !this.isCharging;
    this.isWithdrawing = false;
    this.amountToCharge = null;
    this.chargeToken = 'VBK';
  }

  toggleWithdrawForm() {
    this.isWithdrawing = !this.isWithdrawing;
    this.isCharging = false;
    this.amountToWithdraw = null;
    this.withdrawToken = 'VBK';
    this.withdrawMethod = 'mercadopago';
    this.withdrawDestination = '';
  }

  chargeMoney() {
    if (this.amountToCharge && this.amountToCharge > 0 && this.chargeToken) {
      this.isLoading = true;
      this.walletService.loadMoney({ amount: this.amountToCharge, token: this.chargeToken }).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('¡Carga realizada con éxito!', 'Cerrar', { duration: 3000 });
          this.toggleChargeForm();
          // Refrescar los datos reales
          this.balance$ = this.walletService.getWalletBalance();
          this.transactions$ = this.walletService.getTransactionHistory();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error al cargar dinero', err);
          const errMsg = err.error?.message || 'Ocurrió un error al cargar el saldo.';
          this.snackBar.open(errMsg, 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  withdrawMoney() {
    if (this.amountToWithdraw && this.amountToWithdraw > 0 && this.withdrawToken && this.withdrawMethod && this.withdrawDestination) {
      this.isLoading = true;
      this.walletService.withdrawMoney({ 
        amount: this.amountToWithdraw, 
        token: this.withdrawToken, 
        method: this.withdrawMethod, 
        destination: this.withdrawDestination 
      }).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('¡Retiro procesado con éxito!', 'Cerrar', { duration: 3000 });
          this.toggleWithdrawForm();
          this.balance$ = this.walletService.getWalletBalance();
          this.transactions$ = this.walletService.getTransactionHistory();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error al retirar dinero', err);
          const errMsg = err.error?.message || 'Ocurrió un error al procesar el retiro.';
          this.snackBar.open(errMsg, 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      this.snackBar.open('Por favor completa todos los campos para el retiro', 'Cerrar', { duration: 3000 });
    }
  }

  getIconForType(type: string): string {
    switch(type) {
      case 'CREDIT': return 'arrow_downward';
      case 'DEBIT': return 'arrow_upward';
      default: return 'attach_money';
    }
  }

  getAmountClass(type: string): string {
    return (type === 'CREDIT') ? 'positive-amount' : 'negative-amount';
  }
}
