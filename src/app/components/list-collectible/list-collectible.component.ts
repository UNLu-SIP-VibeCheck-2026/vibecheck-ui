import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CollectibleMarketplaceService } from '../../services/collectible-marketplace.service';
import { Web3Service } from '../../services/web3.service';

@Component({
  selector: 'app-list-collectible',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './list-collectible.component.html',
  styleUrls: ['./list-collectible.component.scss']
})
export class ListCollectibleComponent implements OnInit {
  private svc = inject(CollectibleMarketplaceService);
  private web3Service = inject(Web3Service);

  eventNftAddress = '';
  tokenId = '';
  priceUSDC = '';
  walletAddress = signal<string>('');
  step = signal<'form' | 'approving' | 'listing' | 'done' | 'error'>('form');
  txHash = '';
  listingId = '';
  errorMsg = '';
  isRedeemed = signal<boolean>(false);
  checkingToken = signal<boolean>(false);
  hasChecked = signal<boolean>(false);

  ngOnInit(): void {
    this.web3Service.connectedAddress$.subscribe(addr => {
      this.walletAddress.set(addr || '');
    });
  }

  async connectWallet(): Promise<void> {
    try {
      await this.svc.connectWallet();
    } catch (err: any) {
      alert('Error al conectar wallet: ' + err?.message);
    }
  }

  checkToken(): void {
    if (!this.eventNftAddress || !this.tokenId) return;
    this.checkingToken.set(true);
    this.hasChecked.set(false);
    
    this.svc.checkTokenRedeemed(this.eventNftAddress, parseInt(this.tokenId))
      .subscribe({
        next: (res: any) => {
          this.isRedeemed.set(res.redeemed);
          this.checkingToken.set(false);
          this.hasChecked.set(true);
        },
        error: () => {
          this.checkingToken.set(false);
          this.isRedeemed.set(false);
          this.hasChecked.set(true);
        }
      });
  }

  async submitListing(): Promise<void> {
    if (!this.walletAddress()) {
      await this.connectWallet();
      if (!this.walletAddress()) return;
    }
    if (!this.isRedeemed()) {
      this.errorMsg = 'El token no fue canjeado (redeemed = false). Solo se pueden listar coleccionables con check-in verificado.';
      this.step.set('error');
      return;
    }

    try {
      // Paso 1: Aprobar NFT al marketplace
      this.step.set('approving');
      const approveTx = await this.svc.approveNFT(this.eventNftAddress, BigInt(this.tokenId));
      await this.web3Service.waitForTransaction(approveTx);

      // Paso 2: Crear listing
      this.step.set('listing');
      const listTx = await this.svc.listCollectible(
        this.eventNftAddress,
        BigInt(this.tokenId),
        this.priceUSDC
      );
      
      const receipt = await this.web3Service.waitForTransaction(listTx);
      
      // Parse listingId from logs if possible, or fetch from event
      this.txHash = listTx;
      this.listingId = "Sincronizado";
      this.step.set('done');
    } catch (err: any) {
      this.errorMsg = err?.reason ?? err?.message ?? 'Error desconocido';
      this.step.set('error');
    }
  }
}
