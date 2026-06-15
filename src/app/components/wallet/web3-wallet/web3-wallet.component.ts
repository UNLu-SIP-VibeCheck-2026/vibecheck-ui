import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Web3Service } from '../../../services/web3.service';
import { WalletService, SiweChallengeResponse } from '../../../services/wallet.service';
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

  siweMessage: string | null = null;
  isLoadingChallenge = false;

  ngOnInit() {
    this.connectedAddress$.subscribe(address => {
      this.currentAddress = address;
      if (address) {
        const username = this.getCurrentUser();
        const stored = localStorage.getItem(`linked_wallet_${username}`);
        this.isLinked = (stored?.toLowerCase() === address.toLowerCase());
        // Precargar el challenge en cuanto llega la address, antes de que
        // el usuario toque "Vincular". Así el tap va directo a signMessage
        // sin ningún await previo, lo que Safari mobile requiere.
        this.preloadChallenge(address);
      } else {
        this.isLinked = false;
        this.siweMessage = null;
      }
    });
  }

  getCurrentUser(): string {
    const user = this.authService.getCurrentUserValue();
    return user ? user.username : 'guest';
  }

  private preloadChallenge(address: string) {
    this.siweMessage = null;
    this.isLoadingChallenge = true;
    this.walletService.requestChallenge(address).subscribe({
      next: (challenge) => {
        this.siweMessage = challenge.message;
        this.isLoadingChallenge = false;
      },
      error: (err) => {
        console.error('Error precargando challenge SIWE:', err);
        this.isLoadingChallenge = false;
      }
    });
  }

  linkWallet() {
    if (!this.currentAddress) return;

    if (!this.siweMessage) {
      this.snackBar.open('Preparando vinculación, intentá de nuevo en un momento...', 'Cerrar', { duration: 3000 });
      this.preloadChallenge(this.currentAddress);
      return;
    }

    const message = this.siweMessage;
    this.siweMessage = null;
    this.isLinking = true;

    // FIX DEFINITIVO: Guardamos la firma en una constante DIRECTA. 
    // Al no haber promesas intermedias antes de esta línea, el navegador 
    // reconoce el "gesto del usuario" y abre MetaMask al 100% de las veces.
    const signingPromise = this.web3Service.signMessage(message);

    // Mobile: traemos MetaMask al frente dentro del mismo gesto, justo después
    // de disparar la firma. Sin esto, en Safari/Chrome mobile la petición viaja
    // por el relay pero el wallet nunca aparece y el spinner queda colgado.
    this.web3Service.openWallet();

    signingPromise.then(signature => {
      this.walletService.verifyChallenge(this.currentAddress!, message, signature).subscribe({
        next: (verifyResponse) => {
          this.isLinking = false;
          if (verifyResponse.linked) {
            const username = this.getCurrentUser();
            localStorage.setItem(`linked_wallet_${username}`, verifyResponse.walletAddress);
            this.isLinked = true;
            this.preloadChallenge(this.currentAddress!);
            this.snackBar.open('¡Billetera vinculada con éxito!', 'Cerrar', { duration: 3000 });
          }
        },
        error: (err) => {
          this.isLinking = false;
          console.error('Error al verificar challenge SIWE:', err);
          const errMsg = err.error?.message || 'Error al verificar la firma de la billetera.';
          this.snackBar.open(errMsg, 'Cerrar', { duration: 4000 });
          this.preloadChallenge(this.currentAddress!);
        }
      });
    }).catch((e: any) => {
      this.isLinking = false;
      console.error('Firma cancelada o errónea:', e);
      this.snackBar.open('Firma de mensaje rechazada o inválida.', 'Cerrar', { duration: 3000 });
      this.preloadChallenge(this.currentAddress!);
    });
  }

  // Sin async/await: Safari mobile invalida el gesto del usuario
  // en el primer await, bloqueando el deeplink a MetaMask.
  connect() {
    this.web3Service.connectWallet();
  }

  forceSwitchNetwork() {
    this.web3Service.switchToSepolia().catch(err => {
      this.snackBar.open('Error al cambiar a Sepolia, verificalo en tu MetaMask.', 'Cerrar', { duration: 3000 });
    });
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