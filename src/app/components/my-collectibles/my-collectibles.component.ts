import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CollectibleMarketplaceService } from '../../services/collectible-marketplace.service';
import { Web3Service } from '../../services/web3.service';

@Component({
  selector: 'app-my-collectibles',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './my-collectibles.component.html',
  styleUrls: ['./my-collectibles.component.scss']
})
export class MyCollectiblesComponent implements OnInit {
  private svc = inject(CollectibleMarketplaceService);
  private web3Service = inject(Web3Service);

  myListings = signal<any[]>([]);
  walletAddress = signal<string>('');
  editingListing = signal<string>('');
  newPrice = '';
  processing = signal<boolean>(false);
  loading = signal<boolean>(true);

  ngOnInit(): void {
    this.connectAndLoad();
  }

  async connectAndLoad(): Promise<void> {
    try {
      await this.svc.connectWallet();
      this.loadMyListings();
    } catch (err: any) {
      this.loading.set(false);
      alert('Error al conectar wallet: ' + err?.message);
    }
  }

  loadMyListings(): void {
    this.loading.set(true);
    this.svc.getMyListings(this.walletAddress()).subscribe({
      next: (data: any) => {
        this.myListings.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  async cancel(listingId: string): Promise<void> {
    if (confirm('¿Estás seguro de que deseas cancelar esta publicación? El coleccionable volverá a tu propiedad directa.')) {
      this.processing.set(true);
      try {
        const txHash = await this.svc.cancelListing(BigInt(listingId));
        await this.web3Service.waitForTransaction(txHash);
        this.myListings.update(listings => listings.filter(l => l.listingId !== listingId));
        alert('Publicación cancelada correctamente.');
      } catch (err: any) {
        alert('Error al cancelar: ' + (err?.reason ?? err?.message));
      } finally {
        this.processing.set(false);
      }
    }
  }

  startEdit(listingId: string, currentPrice: string): void {
    this.editingListing.set(listingId);
    // priceUsdc comes as raw string from backend, let's format it to human string
    this.newPrice = this.svc.formatUSDC(currentPrice);
  }

  async updatePrice(listingId: string): Promise<void> {
    if (!this.newPrice || +this.newPrice <= 0) return;
    this.processing.set(true);
    try {
      const txHash = await this.svc.updatePrice(BigInt(listingId), this.newPrice);
      await this.web3Service.waitForTransaction(txHash);
      
      this.myListings.update(listings => listings.map(l => {
        if (l.listingId === listingId) {
          l.priceUsdc = (parseFloat(this.newPrice) * 1000000).toString();
          l.priceUsdcFormatted = '$' + parseFloat(this.newPrice).toFixed(2);
        }
        return l;
      }));
      
      this.editingListing.set('');
      this.newPrice = '';
      alert('Precio actualizado correctamente.');
    } catch (err: any) {
      alert('Error al actualizar precio: ' + (err?.reason ?? err?.message));
    } finally {
      this.processing.set(false);
    }
  }
}
