import { Component, OnInit, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { EventService } from '../../services/event.service';
import { TicketTypeService } from '../../services/ticket-type.service';
import { Web3Service } from '../../services/web3.service';
import { environment } from '../../../environments/environment';
import { ethers } from 'ethers';

@Component({
  selector: 'app-ticket-purchase',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './select-tickets.component.html',
  styleUrls: ['./select-tickets.component.scss']
})
export class TicketPurchaseComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private http = inject(HttpClient);
  private eventService = inject(EventService);
  private ticketTypeService = inject(TicketTypeService);
  private web3Service = inject(Web3Service);

  @Input() event: {
    eventId: number;
    eventNftAddress: string;
    name: string;
    startDate: string;
  } | null = null;

  @Input() tiers: Array<{
    ticketTypeId: number;
    name: string;
    priceUsdc: number;
    maxQuantity: number;
    quantitySold: number;
    tierIndex: number;
  }> = [];

  // Route fallback event ID
  private routeEventId: number | null = null;

  // Component State Signals
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  connectedAddress = signal<string | null>(null);
  isSepolia = signal<boolean>(false);
  siweMessage = signal<string>('');
  
  // Event & Tiers display state signals (mapped from either @Input or fallback service calls)
  mappedEvent = signal<{
    eventId: number;
    eventNftAddress: string;
    name: string;
    startDate: string;
  } | null>(null);

  mappedTiers = signal<Array<{
    ticketTypeId: number;
    name: string;
    priceUsdc: number;
    maxQuantity: number;
    quantitySold: number;
    tierIndex: number;
  }>>([]);

  vbkQuotes = signal<Record<number, string>>({});
  
  // Purchase final details signals
  selectedTierName = signal<string>('');
  purchaseTxHash = signal<string>('');
  purchaseTokenId = signal<number | null>(null);
  successTicket = signal<any | null>(null);

  ngOnInit() {
    window.scrollTo(0, 0);

    const idParam = this.route.snapshot.paramMap.get('id');
    this.routeEventId = idParam ? parseInt(idParam, 10) : null;

    this.web3Service.connectedAddress$.subscribe(addr => {
      this.connectedAddress.set(addr);
      this.checkConnectionState();
    });

    this.web3Service.isSepolia$.subscribe(sepolia => {
      this.isSepolia.set(sepolia);
      this.checkConnectionState();
    });
  }

  checkConnectionState() {
    const address = this.connectedAddress();
    const sepolia = this.isSepolia();

    if (!address || !sepolia) {
      this.currentStep.set(1);
      return;
    }

    if (this.currentStep() === 1) {
      this.currentStep.set(2);
      this.startSiweFlow();
    }
  }

  async connectWallet() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.web3Service.connectWallet();
      const isSepolia = await this.web3Service.checkNetwork();
      if (!isSepolia) {
        this.errorMessage.set('Cambiá a la red Sepolia');
      }
    } catch (err: any) {
      console.error('Error al conectar wallet:', err);
      this.errorMessage.set(err.message || 'Error al conectar MetaMask.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async checkNetwork() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const isSepolia = await this.web3Service.checkNetwork();
      if (!isSepolia) {
        this.errorMessage.set('Cambiá a la red Sepolia');
      }
    } catch (err: any) {
      console.error('Error al verificar red:', err);
      this.errorMessage.set('No se pudo verificar la red. Asegurate de estar en Sepolia.');
    } finally {
      this.isLoading.set(false);
    }
  }

  startSiweFlow() {
    const address = this.connectedAddress();
    if (!address) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/challenge`, { walletAddress: address }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.walletAddress && res.walletAddress.toLowerCase() === address.toLowerCase()) {
          this.currentStep.set(3);
          this.loadEventAndTiers();
          return;
        }

        if (res && res.message) {
          this.siweMessage.set(res.message);
        } else {
          this.errorMessage.set('No se pudo obtener el mensaje de firma.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('La billetera ya está vinculada a otro usuario.');
        } else {
          this.errorMessage.set(err.error?.message || 'Error al solicitar el desafío SIWE.');
        }
      }
    });
  }

  async signAndVerify() {
    const address = this.connectedAddress();
    const message = this.siweMessage();
    if (!address || !message) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const signature = await this.web3Service.signMessage(message);
      this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/verify`, {
        walletAddress: address,
        message,
        signature
      }).subscribe({
        next: (verifyRes) => {
          this.isLoading.set(false);
          this.currentStep.set(3);
          this.loadEventAndTiers();
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 409) {
            this.errorMessage.set('La billetera ya está vinculada a otro usuario.');
          } else {
            this.errorMessage.set(err.error?.message || 'Error al verificar la firma.');
          }
        }
      });
    } catch (e: any) {
      this.isLoading.set(false);
      console.error('Error al firmar:', e);
      this.errorMessage.set('Firma cancelada o rechazada por el usuario.');
    }
  }

  loadEventAndTiers() {
    const eventInput = this.event;
    const tiersInput = this.tiers;

    if (eventInput && tiersInput && tiersInput.length > 0) {
      this.mappedEvent.set(eventInput);
      this.mappedTiers.set(tiersInput);
      this.loadVbkQuotes();
      return;
    }

    const eventId = this.routeEventId;
    if (!eventId) {
      this.errorMessage.set('ID de evento inválido.');
      return;
    }

    this.isLoading.set(true);
    this.eventService.findByIdEvent(eventId).subscribe({
      next: (eventData) => {
        this.mappedEvent.set({
          eventId: eventData.id,
          eventNftAddress: eventData.eventNftAddress || '',
          name: eventData.title,
          startDate: eventData.startDate
        });

        this.ticketTypeService.findTicketTypesByEvent(eventId).subscribe({
          next: (tickets) => {
            this.isLoading.set(false);
            const mapped = tickets.map(t => ({
              ticketTypeId: t.id,
              name: t.name,
              priceUsdc: t.priceUsdc,
              maxQuantity: t.maxQuantity,
              quantitySold: (t as any).quantitySold || 0,
              tierIndex: t.tierIndex
            }));
            this.mappedTiers.set(mapped);
            this.loadVbkQuotes();
          },
          error: (err) => {
            this.isLoading.set(false);
            this.errorMessage.set('No se pudieron cargar los tipos de tickets.');
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar la información del evento.');
      }
    });
  }

  async loadVbkQuotes() {
    const currentEvent = this.mappedEvent();
    if (!currentEvent || !currentEvent.eventNftAddress) return;
    const currentTiers = this.mappedTiers();
    const quotes: Record<number, string> = {};
    for (const tier of currentTiers) {
      try {
        const quote = await this.web3Service.getVbkQuote(currentEvent.eventNftAddress, tier.tierIndex);
        quotes[tier.ticketTypeId] = ethers.formatUnits(quote, 18);
      } catch (err) {
        console.error(`Error loading VBK quote for tier ${tier.name}:`, err);
        quotes[tier.ticketTypeId] = 'Error';
      }
    }
    this.vbkQuotes.set(quotes);
  }

  async buyWithUSDC(tier: any) {
    const currentEvent = this.mappedEvent();
    if (!currentEvent || !currentEvent.eventNftAddress) {
      this.errorMessage.set('El contrato del evento no está configurado.');
      return;
    }

    this.currentStep.set(4);
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.web3Service.buyTicketWithUSDC(
        currentEvent.eventNftAddress,
        tier.tierIndex,
        tier.priceUsdc
      );
      this.purchaseTxHash.set(result.txHash);
      this.purchaseTokenId.set(result.tokenId);
      this.selectedTierName.set(tier.name);
      this.confirmPurchaseOnBackend(tier.ticketTypeId, result.txHash, result.tokenId);
    } catch (err: any) {
      this.isLoading.set(false);
      this.currentStep.set(3);
      this.handlePurchaseError(err);
    }
  }

  async buyWithVBK(tier: any) {
    const currentEvent = this.mappedEvent();
    if (!currentEvent || !currentEvent.eventNftAddress) {
      this.errorMessage.set('El contrato del evento no está configurado.');
      return;
    }

    this.currentStep.set(4);
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.web3Service.buyTicketWithVBK(
        currentEvent.eventNftAddress,
        tier.tierIndex
      );
      this.purchaseTxHash.set(result.txHash);
      this.purchaseTokenId.set(result.tokenId);
      this.selectedTierName.set(tier.name);
      this.confirmPurchaseOnBackend(tier.ticketTypeId, result.txHash, result.tokenId);
    } catch (err: any) {
      this.isLoading.set(false);
      this.currentStep.set(3);
      this.handlePurchaseError(err);
    }
  }

  handlePurchaseError(err: any) {
    console.error('Error durante la compra on-chain:', err);
    if (err.code === 4001 || err.code === 'ACTION_REJECTED' || (err.message && err.message.includes('rejected'))) {
      this.errorMessage.set('Transacción cancelada por el usuario.');
    } else if (
      err.code === 'INSUFFICIENT_FUNDS' ||
      (err.message && err.message.toLowerCase().includes('insufficient funds')) ||
      (err.message && err.message.toLowerCase().includes('transfer amount exceeds balance'))
    ) {
      this.errorMessage.set('Saldo insuficiente de USDC/VBK.');
    } else if (err.reason) {
      this.errorMessage.set(err.reason);
    } else {
      this.errorMessage.set(err.message || 'Ocurrió un error inesperado en la transacción.');
    }
  }

  confirmPurchaseOnBackend(ticketTypeId: number, txHash: string, tokenId: number) {
    this.currentStep.set(5);
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.post<any>(`${environment.apiBaseUrl}/tickets/confirm`, {
      ticketTypeId,
      txHash,
      tokenId
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successTicket.set(res);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(`La compra se realizó on-chain pero hubo un error al registrarla. Contactá soporte con el txHash: ${txHash}`);
      }
    });
  }

  goBack() {
    const currentEvent = this.mappedEvent();
    if (currentEvent && currentEvent.eventId) {
      this.router.navigate(['/event/', currentEvent.eventId]);
    } else if (this.routeEventId) {
      this.router.navigate(['/event/', this.routeEventId]);
    } else {
      this.router.navigate(['/']);
    }
  }

  truncateAddress(address: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
