import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Web3Service } from '../../../services/web3.service';

@Component({
  selector: 'app-web3-wallet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './web3-wallet.component.html',
  styleUrl: './web3-wallet.component.css'
})
export class Web3WalletComponent {
  web3Service = inject(Web3Service);

  isConnected$ = this.web3Service.isConnected$;
  connectedAddress$ = this.web3Service.connectedAddress$;
  ethBalance$ = this.web3Service.ethBalance$;
  vbkBalance$ = this.web3Service.vbkBalance$;
  usdcBalance$ = this.web3Service.usdcBalance$;
  isSepolia$ = this.web3Service.isSepolia$;

  get isInstalled(): boolean {
    return this.web3Service.isMetaMaskInstalled();
  }

  async connect() {
    try {
      await this.web3Service.connectWallet();
    } catch (error: any) {
      alert(error.message || 'Error al conectar MetaMask');
    }
  }

  async forceSwitchNetwork() {
    try {
      await this.web3Service.switchToSepolia();
    } catch (error: any) {
      alert('No se pudo cambiar a la red Sepolia. Por favor cámbiala manualmente en tu extensión MetaMask.');
    }
  }

  truncateAddress(address: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
        this.sendError = 'Transacción rechazada en MetaMask.';
      } else {
        this.sendError = error.message || 'Ocurrió un error al enviar los fondos.';
      }
    } finally {
      this.isSending = false;
    }
  }
}
