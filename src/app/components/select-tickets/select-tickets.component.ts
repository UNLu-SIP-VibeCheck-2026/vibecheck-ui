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
import { ContractsService } from '../../services/contracts.service';
import { environment } from '../../../environments/environment';
import { formatUnits } from 'viem';

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
  private contractsService = inject(ContractsService);

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

  // Challenge precargado para signAndVerify (mismo patrón que web3-wallet.component).
  // Evita el HTTP call dentro del handler del tap, que Safari mobile bloquea.
  private pendingSiweChallenge: { message: string } | null = null;

  // Component State Signals
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  connectedAddress = signal<string | null>(null);
  isSepolia = signal<boolean>(false);
  siweMessage = signal<string>('');

  // Event & Tiers display state signals
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

  // Sin async/await: Safari mobile invalida el gesto del usuario en el primer
  // await, bloqueando el deeplink a MetaMask.
  connectWallet() {
    this.errorMessage.set('');
    this.web3Service.connectWallet().catch((err: any) => {
      console.error('Error al conectar wallet:', err);
      this.errorMessage.set(err.message || 'Error al conectar la billetera.');
    });
  }

  checkNetwork() {
    this.errorMessage.set('');
    this.web3Service.switchToSepolia().catch((err: any) => {
      console.error('Error al cambiar red:', err);
      this.errorMessage.set('No se pudo cambiar a Sepolia. Cambiala manualmente en tu billetera.');
    });
  }

  startSiweFlow() {
    const address = this.connectedAddress();
    if (!address) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pendingSiweChallenge = null;

    this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/challenge`, { walletAddress: address }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        // Wallet ya vinculada: saltar directo al paso 3.
        if (res && res.walletAddress && res.walletAddress.toLowerCase() === address.toLowerCase()) {
          this.currentStep.set(3);
          this.loadEventAndTiers();
          return;
        }
        if (res && res.message) {
          // Precargar el challenge para que signAndVerify no necesite HTTP antes del tap.
          this.pendingSiweChallenge = { message: res.message };
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

  // signAndVerify: el signMessage tiene que ser la respuesta directa al tap.
  // No puede haber ningún await antes — Safari mobile lo bloquea.
  signAndVerify() {
    const address = this.connectedAddress();
    const challenge = this.pendingSiweChallenge;

    if (!address || !challenge) {
      // Challenge no listo: reintentar la precarga.
      this.errorMessage.set('Preparando firma, intentá de nuevo en un momento...');
      this.startSiweFlow();
      return;
    }

    const message = challenge.message;
    // Consumir el challenge para evitar reuso del nonce.
    this.pendingSiweChallenge = null;
    this.isLoading.set(true);
    this.errorMessage.set('');

    // Directo al signMessage sin ningún await previo.
    this.web3Service.signMessage(message).then(signature => {
      this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/verify`, {
        walletAddress: address,
        message,
        signature
      }).subscribe({
        next: () => {
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
          // Precargar nuevo challenge para que el usuario pueda reintentar.
          this.startSiweFlow();
        }
      });
    }).catch((e: any) => {
      this.isLoading.set(false);
      console.error('Error al firmar:', e);
      this.errorMessage.set('Firma cancelada o rechazada por el usuario.');
      // Precargar nuevo challenge para que el usuario pueda reintentar.
      this.startSiweFlow();
    });
  }

  loadEventAndTiers() {
    const eventInput = this.event;
    const tiersInput = this.tiers;

    if (eventInput && tiersInput && tiersInput.length > 0) {
      this.mappedEvent.set(eventInput);
      this.mappedTiers.set(tiersInput);
      this.loadOnChainData();
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
            this.loadOnChainData();
          },
          error: () => {
            this.isLoading.set(false);
            this.errorMessage.set('No se pudieron cargar los tipos de tickets.');
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar la información del evento.');
      }
    });
  }

  async loadOnChainData() {
    const currentEvent = this.mappedEvent();
    if (!currentEvent || !currentEvent.eventNftAddress) return;
    const currentTiers = this.mappedTiers();
    const quotes: Record<number, string> = {};
    const updatedTiers = currentTiers.map(t => ({ ...t }));

    try {
      for (const tier of updatedTiers) {
        try {
          const quote = await this.web3Service.getVbkQuote(currentEvent.eventNftAddress, tier.tierIndex);
          quotes[tier.ticketTypeId] = formatUnits(quote, 18);
        } catch (err) {
          console.error(`Error loading VBK quote for tier ${tier.name}:`, err);
          quotes[tier.ticketTypeId] = 'Error';
        }

        try {
          const onChainTier = await this.contractsService.getEventNftTier(currentEvent.eventNftAddress, BigInt(tier.tierIndex));
          tier.quantitySold = Number(onChainTier.sold);
        } catch (err) {
          console.error(`Error loading on-chain tier info for ${tier.name}:`, err);
        }
      }
    } catch (err) {
      console.error('Error connecting to EventNFT contract:', err);
    }

    this.mappedTiers.set(updatedTiers);
    this.vbkQuotes.set(quotes);
  }

  async buyWithUSDC(tier: any) {
    const currentEvent = this.mappedEvent();
    if (!currentEvent || !currentEvent.eventNftAddress) {
      this.errorMessage.set('El contrato del evento no está configurado.');
      return;
    }

    // Verificación síncrona de red: lee el BehaviorSubject sin await.
    // En mobile MetaMask puede tener la wallet en mainnet aunque AppKit diga Sepolia.
    // Si no está en Sepolia, pedimos el switch y cortamos — el usuario tendrá que
    // volver a tocar el botón una vez que cambie la red.
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage.set('Cambiá a la red Sepolia antes de comprar.');
      this.web3Service.switchToSepolia();
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

    // Misma verificación síncrona de red que buyWithUSDC.
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage.set('Cambiá a la red Sepolia antes de comprar.');
      this.web3Service.switchToSepolia();
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
      error: () => {
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

  parseFloat(val: string): number {
    return parseFloat(val) || 0;
  }
}