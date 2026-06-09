import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Web3Service } from '../../../services/web3.service';
import { WalletService } from '../../../services/wallet.service';
import { AuthService } from '../../../services/auth.service';
import { SwapComponent } from '../../swap/swap.component';

@Component({
  selector: 'app-web3-wallet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule, MatSnackBarModule, SwapComponent],
  templateUrl: './web3-wallet.component.html',
  styleUrl: './web3-wallet.component.css'
})
export class Web3WalletComponent implements OnInit {
  web3Service = inject(Web3Service);
  private walletService = inject(WalletService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isConnected$ = this.web3Service.isConnected$;
  connectedAddress$ = this.web3Service.connectedAddress$;
  ethBalance$ = this.web3Service.ethBalance$;
  vbkBalance$ = this.web3Service.vbkBalance$;
  usdcBalance$ = this.web3Service.usdcBalance$;
  isSepolia$ = this.web3Service.isSepolia$;

  currentAddress: string | null = null;
  isLinking = false;
  isLinked = false;

  ngOnInit() {
    this.connectedAddress$.subscribe(address => {
      this.currentAddress = address;
      if (address) {
        const username = this.getCurrentUser();
        const stored = localStorage.getItem(`linked_wallet_${username}`);
        this.isLinked = (stored?.toLowerCase() === address.toLowerCase());
      } else {
        this.isLinked = false;
      }
    });
  }

  getCurrentUser(): string {
    const user = this.authService.getCurrentUserValue();
    return user ? user.username : 'guest';
  }

  async linkWallet() {
    if (!this.currentAddress) return;
    this.isLinking = true;
    this.walletService.requestChallenge(this.currentAddress).subscribe({
      next: async (challenge) => {
        try {
          const signature = await this.web3Service.signMessage(challenge.message);
          this.walletService.verifyChallenge(this.currentAddress!, challenge.message, signature).subscribe({
            next: (verifyResponse) => {
              this.isLinking = false;
              if (verifyResponse.linked) {
                const username = this.getCurrentUser();
                localStorage.setItem(`linked_wallet_${username}`, verifyResponse.walletAddress);
                this.isLinked = true;
                this.snackBar.open('¡Billetera vinculada con éxito!', 'Cerrar', { duration: 3000 });
              }
            },
            error: (err) => {
              this.isLinking = false;
              console.error('Error al verificar challenge SIWE:', err);
              const errMsg = err.error?.message || 'Error al verificar la firma de la billetera.';
              this.snackBar.open(errMsg, 'Cerrar', { duration: 4000 });
            }
          });
        } catch (e: any) {
          this.isLinking = false;
          console.error('Firma cancelada o errónea:', e);
          this.snackBar.open('Firma de mensaje rechazada o inválida.', 'Cerrar', { duration: 3000 });
        }
      },
      error: (err) => {
        this.isLinking = false;
        console.error('Error al solicitar challenge SIWE:', err);
        const errMsg = err.error?.message || 'Error al vincular con el servidor.';
        this.snackBar.open(errMsg, 'Cerrar', { duration: 4000 });
      }
    });
  }



  async connect() {
    try {
      await this.web3Service.connectWallet();
    } catch (error: any) {
      alert(error.message || 'Error al conectar la billetera');
    }
  }

  async forceSwitchNetwork() {
    try {
      await this.web3Service.switchToSepolia();
    } catch (error: any) {
      alert('No se pudo cambiar a la red Sepolia. Por favor cámbiala manualmente en tu billetera.');
    }
  }

  truncateAddress(address: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Navegación por pestañas
  activeTab: 'balances' | 'send' | 'swap' = 'balances';

  switchTab(tab: 'balances' | 'send' | 'swap') {
    this.activeTab = tab;
  }

  // Formularios de envío
  sendToAddress: string = '';
  sendAmount: number | null = null;
  selectedAsset: 'ETH' | 'VBK' | 'USDC' = 'ETH';
  
  isSending: boolean = false;
  sendSuccessHash: string | null = null;
  sendError: string | null = null;

  async onSendFunds() {
    this.sendError = null;
    this.sendSuccessHash = null;

    if (!this.sendToAddress || !this.sendAmount || this.sendAmount <= 0) {
      this.sendError = 'Por favor, ingresa una dirección y un monto válidos.';
      return;
    }

    this.isSending = true;

    try {
      const txHash = await this.web3Service.sendFunds(
        this.sendToAddress, 
        this.sendAmount.toString(), 
        this.selectedAsset
      );
      this.sendSuccessHash = txHash;
      this.sendToAddress = '';
      this.sendAmount = null;
    } catch (error: any) {
      console.error('Error al enviar fondos:', error);
      if (error.code === 'ACTION_REJECTED' || (error.message && error.message.includes('User denied'))) {
        this.sendError = 'Transacción rechazada en la billetera.';
      } else {
        this.sendError = error.message || 'Ocurrió un error al enviar los fondos.';
      }
    } finally {
      this.isSending = false;
    }
  }
}
