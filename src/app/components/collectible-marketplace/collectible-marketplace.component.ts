import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { CollectibleMarketplaceService } from '../../services/collectible-marketplace.service';
import { Web3Service } from '../../services/web3.service';

@Component({
  selector: 'app-collectible-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
  templateUrl: './collectible-marketplace.component.html',
  styleUrls: ['./collectible-marketplace.component.scss']
})
export class CollectibleMarketplaceComponent implements OnInit {
  private svc = inject(CollectibleMarketplaceService);
  private web3Service = inject(Web3Service);

  listings = signal<any[]>([]);
  loading = signal<boolean>(true);
  page = signal<number>(0);
  totalPages = signal<number>(0);
  walletAddress = signal<string>('');
  buying = signal<boolean>(false);
  buyingListingId = signal<string>('');
  paymentCurrency = signal<'USDC' | 'VBK'>('USDC');
  filterEventNft = signal<string>('');

  ngOnInit(): void {
    this.web3Service.connectedAddress$.subscribe(addr => {
      this.walletAddress.set(addr || '');
    });
    this.loadListings();
  }

  async connectWallet(): Promise<void> {
    try {
      await this.svc.connectWallet();
    } catch (err: any) {
      alert('Error al conectar wallet: ' + err?.message);
    }
  }

  loadListings(): void {
    this.loading.set(true);
    const obs = this.filterEventNft()
      ? this.svc.getListingsByEvent(this.filterEventNft())
      : this.svc.getActiveListings(this.page());

    obs.subscribe({
      next: (data: any) => {
        this.listings.set(data.listings ?? data);
        this.totalPages.set(data.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  async buy(listing: any): Promise<void> {
    if (!this.walletAddress()) {
      await this.connectWallet();
      if (!this.walletAddress()) return;
    }
    this.buying.set(true);
    this.buyingListingId.set(listing.listingId);

    try {
      const listingId = BigInt(listing.listingId);

      if (this.paymentCurrency() === 'USDC') {
        const priceRaw = BigInt(listing.priceUsdc);
        await this.svc.buyWithUSDC(listingId, priceRaw);
      } else {
        const vbkNeeded = await this.svc.quoteVbkOnchain(listingId);
        // Include slippage: 0.5% (50 basis points)
        await this.svc.buyWithVBK(listingId, vbkNeeded, 50n);
      }

      alert('¡Compra exitosa! El coleccionable ya está en tu wallet.');
      this.loadListings();
    } catch (err: any) {
      alert('Error al realizar la compra: ' + (err?.reason ?? err?.message ?? 'desconocido'));
    } finally {
      this.buying.set(false);
      this.buyingListingId.set('');
    }
  }

  prevPage(): void {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
      this.loadListings();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update(p => p + 1);
      this.loadListings();
    }
  }
}
