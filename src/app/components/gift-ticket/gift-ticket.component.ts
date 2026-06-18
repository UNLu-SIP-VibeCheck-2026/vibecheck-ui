import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { isAddress } from 'viem';

import { TicketResponse } from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';
import { MarketplaceService } from '../../services/marketplace.service';
import { Web3Service } from '../../services/web3.service';
import { ContractsService } from '../../services/contracts.service';
import { TransactionService, TxState } from '../../services/transaction.service';
import { TxStatusComponent } from '../shared/tx-status/tx-status.component';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface SearchResultUser {
  username: string;
  fullName: string;
  hasImage: boolean;
  wallet: string;
  canReceiveGift: boolean;
}

@Component({
  selector: 'app-gift-ticket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    TxStatusComponent
  ],
  templateUrl: './gift-ticket.component.html',
  styleUrl: './gift-ticket.component.scss'
})
export class GiftTicketComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private marketplaceService = inject(MarketplaceService);
  private web3Service = inject(Web3Service);
  private contractsService = inject(ContractsService);
  private transactionService = inject(TransactionService);
  private snackBar = inject(MatSnackBar);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);

  ticketId: number | null = null;
  ticket: TicketResponse | null = null;
  isLoading = false;
  searchQuery = '';
  selectedUser: SearchResultUser | null = null;
  isManualAddressValid = false;

  // Search state
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  isSearching = false;
  noResults = false;
  filteredFriends: SearchResultUser[] = [];

  txStep: 'idle' | 'validating' | 'approving-nft' | 'approving-usdc' | 'gifting' | 'confirming' | 'success' = 'idle';
  currentTxState: TxState | null = null;
  errorMessage = '';

  platformFee = 0;
  royaltyFee = 0;
  totalFee = 0;

  // Fase 3.A: estado on-chain precargado (lecturas fuera del tap) + validación del
  // destinatario hecha al seleccionarlo (no en el tap). Así confirmGift va directo al
  // primer write sin ningún await previo que rompa el gesto en Safari mobile.
  private nftApproved = false;
  private usdcFeeApproved = false;
  private ownerOnChain: string | null = null;
  recipientValidated = false;
  private isValidatingRecipient = false;

  apiBaseUrl = environment.apiBaseUrl;

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.ticketId = Number(idParam);
      this.loadTicketDetails();
    }

    this.initSearchSubscription();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  private initSearchSubscription(): void {
    const currentUser = this.authService.getCurrentUserValue();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap((query) => {
        if (query.length >= 3) {
          this.isSearching = true;
        }
        this.noResults = false;
      }),
      switchMap((query) => {
        if (query.length < 3) {
          this.filteredFriends = [];
          this.isSearching = false;
          return of([]);
        }
        return this.usersService.searchPublicUsers(query).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe((results) => {
      this.isSearching = false;
      this.filteredFriends = results
        .filter(u => !currentUser || u.username.toLowerCase() !== currentUser.username.toLowerCase())
        .map(u => ({
          username: u.username,
          fullName: `${u.name} ${u.lastName}`,
          hasImage: u.hasImage ?? false,
          wallet: u.walletAddress ?? '',
          canReceiveGift: !!(u.walletAddress && u.walletAddress.trim() !== '')
        }));

      const rawQuery = this.searchQuery.trim();
      this.noResults = rawQuery.length >= 3 && this.filteredFriends.length === 0;
    });
  }

  loadTicketDetails(): void {
    if (!this.ticketId) return;
    this.isLoading = true;
    this.ticketService.getTicketById(this.ticketId).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.isLoading = false;

        // Calculate fees (5% platform fee, 5% royalty fee)
        const price = ticket.ticketType.priceUsdc;
        this.platformFee = price * 0.05;
        this.royaltyFee = price * 0.05;
        this.totalFee = price * 0.10;

        this.preloadGiftState();
      },
      error: (err) => {
        console.error('Error loading ticket details', err);
        this.isLoading = false;
        this.snackBar.open('Error al cargar los detalles de la entrada.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  onSearchInput(): void {
    const value = this.searchQuery.trim();
    if (value.startsWith('0x') && isAddress(value)) {
      this.isManualAddressValid = true;
      this.filteredFriends = [];
      this.noResults = false;
      this.isSearching = false;
    } else {
      this.isManualAddressValid = false;
      this.searchSubject.next(value);
    }
  }

  selectManualAddress(): void {
    const query = this.searchQuery.trim();
    this.selectedUser = {
      username: 'wallet_manual',
      fullName: 'Dirección Manual',
      hasImage: false,
      wallet: query,
      canReceiveGift: true
    };
    this.searchQuery = '';
    this.isManualAddressValid = false;
    this.filteredFriends = [];
    this.validateRecipient();
  }

  selectUser(user: SearchResultUser): void {
    if (user && user.canReceiveGift) {
      this.selectedUser = user;
      this.validateRecipient();
    }
  }

  clearSelection(): void {
    this.selectedUser = null;
    this.recipientValidated = false;
  }

  // Fase 3.A: validamos el destinatario al seleccionarlo (HTTP fuera del tap). Así
  // confirmGift no necesita ningún await antes del primer write y conserva el gesto.
  private validateRecipient(): void {
    this.recipientValidated = false;
    this.errorMessage = '';
    const wallet = this.selectedUser?.wallet;
    if (!wallet || !isAddress(wallet)) {
      this.errorMessage = 'La dirección del destinatario no es una wallet de Ethereum válida.';
      return;
    }
    this.isValidatingRecipient = true;
    this.marketplaceService.validateGift({ recipientWallet: wallet }).subscribe({
      next: () => {
        this.isValidatingRecipient = false;
        this.recipientValidated = true;
      },
      error: (err) => {
        this.isValidatingRecipient = false;
        console.error('Validation error', err);
        this.errorMessage = err.error?.message || 'La wallet destinataria no está registrada en VibeCheck.';
      }
    });
  }

  // Fase 3.A: precarga del estado on-chain (dueño + aprobaciones) fuera del tap.
  private async preloadGiftState(): Promise<void> {
    if (!this.ticket || this.ticket.tokenId === null || this.ticket.tokenId === undefined) return;
    const eventNftAddress = this.ticket.eventNftAddress;
    if (!eventNftAddress) return;
    const tokenId = BigInt(this.ticket.tokenId);
    const marketplaceAddress = this.web3Service.NFT_MARKETPLACE_ADDRESS;
    const donorWallet = this.web3Service.walletAddress$.getValue();

    try {
      this.ownerOnChain = await this.contractsService.getNftOwner(eventNftAddress, tokenId);
    } catch (err) {
      console.warn('No se pudo precargar el dueño del NFT', err);
    }
    try {
      const approvedAddress = await this.contractsService.getNftApproved(eventNftAddress, tokenId);
      this.nftApproved = approvedAddress.toLowerCase() === marketplaceAddress.toLowerCase();
    } catch (err) {
      console.warn('No se pudo precargar la aprobación del NFT', err);
    }
    if (donorWallet) {
      try {
        const totalFeeOnChain = BigInt(Math.round(this.totalFee * 1_000_000));
        const allowance = await this.web3Service.getUsdcAllowance(donorWallet, marketplaceAddress);
        this.usdcFeeApproved = allowance >= totalFeeOnChain;
      } catch (err) {
        console.warn('No se pudo precargar la allowance de USDC', err);
      }
    }
  }

  getUserImageUrl(username: string): string {
    return `${this.apiBaseUrl}/users/public/${username}/image`;
  }

  get showMinCharsHint(): boolean {
    const q = this.searchQuery.trim();
    return q.length > 0 && q.length < 3 && !this.isManualAddressValid;
  }

  // Regla 3 + Fase 3.B: sin await antes del write — el destinatario ya fue validado al
  // seleccionarlo y las lecturas on-chain están precargadas. Si falta una aprobación,
  // disparamos ese write (gesto intacto) y pedimos al usuario tocar "Regalar" de nuevo;
  // el siguiente tap avanza al próximo paso hasta llegar al regalo (único write final).
  confirmGift(): void {
    if (!this.ticket || !this.selectedUser) return;

    const recipientWallet = this.selectedUser.wallet;
    if (!isAddress(recipientWallet)) {
      this.errorMessage = 'La dirección del destinatario no es una wallet de Ethereum válida.';
      return;
    }

    const eventNftAddress = this.ticket.eventNftAddress;
    if (!eventNftAddress) {
      this.errorMessage = 'La dirección del contrato NFT del evento no está disponible.';
      return;
    }

    if (this.ticket.tokenId === null || this.ticket.tokenId === undefined) {
      this.errorMessage = 'Esta entrada no tiene un tokenId válido.';
      return;
    }

    this.errorMessage = '';
    this.currentTxState = null;

    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage = 'Cambiá la red a Sepolia en MetaMask';
      this.web3Service.switchToSepolia();
      return;
    }

    // Destinatario validado en la selección (Fase 3.A).
    if (this.isValidatingRecipient) {
      this.errorMessage = 'Validando destinatario, intentá de nuevo en un momento...';
      return;
    }
    if (!this.recipientValidated) {
      this.validateRecipient();
      this.errorMessage = 'Validando destinatario, tocá "Regalar" de nuevo en un momento...';
      return;
    }

    const connectedWallet = this.web3Service.walletAddress$.getValue();
    if (!connectedWallet) {
      this.errorMessage = 'Por favor conectá tu billetera.';
      return;
    }

    // Verificación de dueño con el dato precargado (sin await en el tap).
    if (this.ownerOnChain && connectedWallet.toLowerCase() !== this.ownerOnChain.toLowerCase()) {
      this.errorMessage = `La billetera conectada (${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}) no es la dueña de esta entrada en la blockchain. Conectate con la billetera dueña (${this.ownerOnChain.slice(0, 6)}...${this.ownerOnChain.slice(-4)}) para poder regalarla.`;
      return;
    }

    const marketplaceAddress = this.web3Service.NFT_MARKETPLACE_ADDRESS;
    const tokenId = BigInt(this.ticket.tokenId);

    // Paso 1: aprobar el NFT (per-token) si falta.
    if (!this.nftApproved) {
      this.txStep = 'approving-nft';
      const approvePromise = this.web3Service.approveNft(eventNftAddress, marketplaceAddress, tokenId);
      approvePromise.then((approveTx) => {
        this.transactionService.track(approveTx).subscribe({
          next: (state) => {
            this.currentTxState = state;
            if (state.status === 'confirmed') {
              this.nftApproved = true;
              this.txStep = 'idle';
              this.snackBar.open('NFT aprobado. Tocá "Regalar" de nuevo para continuar.', 'Cerrar', { duration: 7000 });
            } else if (state.status === 'failed') {
              this.txStep = 'idle';
              this.errorMessage = 'La aprobación de transferencia del NFT falló o fue cancelada.';
            }
          },
          error: (err) => this.handleError(err)
        });
      }).catch((err) => this.handleError(err));
      return;
    }

    // Paso 2: aprobar el fee en USDC (approval infinito) si falta.
    if (!this.usdcFeeApproved) {
      this.txStep = 'approving-usdc';
      const approvePromise = this.web3Service.approveErc20Max(this.web3Service.USDC_ADDRESS, marketplaceAddress);
      approvePromise.then((approveTx) => {
        this.transactionService.track(approveTx).subscribe({
          next: (state) => {
            this.currentTxState = state;
            if (state.status === 'confirmed') {
              this.usdcFeeApproved = true;
              this.txStep = 'idle';
              this.snackBar.open('USDC aprobado. Tocá "Regalar" de nuevo para confirmar.', 'Cerrar', { duration: 7000 });
            } else if (state.status === 'failed') {
              this.txStep = 'idle';
              this.errorMessage = 'La aprobación de USDC falló o fue cancelada.';
            }
          },
          error: (err) => this.handleError(err)
        });
      }).catch((err) => this.handleError(err));
      return;
    }

    // Paso 3: regalo on-chain (único write, gesto intacto).
    this.giftTicketOnChain(eventNftAddress, recipientWallet);
  }

  private async giftTicketOnChain(eventNftAddress: string, recipientWallet: string): Promise<void> {
    if (!this.ticket || this.ticket.tokenId === null) return;

    try {
      this.txStep = 'gifting';
      this.currentTxState = null;

      const giftTx = await this.web3Service.giftTicket(
        eventNftAddress,
        BigInt(this.ticket.tokenId),
        recipientWallet
      );

      this.transactionService.track(giftTx).subscribe({
        next: (state) => {
          this.currentTxState = state;
          if (state.status === 'confirmed') {
            this.confirmGiftBackend(state.receipt || giftTx, eventNftAddress, recipientWallet);
          } else if (state.status === 'failed') {
            this.txStep = 'idle';
            this.errorMessage = 'La transacción de regalo falló o fue cancelada.';
          }
        },
        error: (err) => this.handleError(err)
      });
    } catch (err: any) {
      this.handleError(err);
    }
  }

  private confirmGiftBackend(receipt: any, eventNftAddress: string, recipientWallet: string): void {
    if (!this.ticket) return;

    this.txStep = 'confirming';
    this.currentTxState = null;

    const txHash = typeof receipt === 'string' ? receipt : (receipt.hash || receipt.transactionHash);
    const confirmReq = {
      txHash,
      tokenId: Number(this.ticket.tokenId),
      eventNftAddress,
      recipientWallet
    };

    this.marketplaceService.confirmGift(confirmReq).subscribe({
      next: () => {
        this.txStep = 'success';
        this.snackBar.open('¡Entrada regalada con éxito!', 'Cerrar', {
          duration: 3000
        });
      },
      error: (err) => {
        console.error('Backend confirmGift error', err);
        this.txStep = 'idle';
        this.errorMessage = `La transacción se confirmó on-chain pero hubo un error al sincronizar con el servidor. Hash: ${confirmReq.txHash}`;
      }
    });
  }

  handleError(err: any): void {
    this.isLoading = false;
    this.txStep = 'idle';
    console.error('Error in gift ticket flow:', err);
    if (err.code === 'ACTION_REJECTED' || err.code === 4001 || (err.message && err.message.toLowerCase().includes('user rejected'))) {
      this.errorMessage = 'Transacción cancelada por el usuario.';
    } else if (err.message && err.message.includes('insufficient funds')) {
      this.errorMessage = 'Fondos insuficientes (ETH o USDC) para completar la transacción.';
    } else {
      this.errorMessage = err.message || 'Ocurrió un error inesperado al interactuar con MetaMask.';
    }
  }

  goToMyTickets(): void {
    this.router.navigate(['/my-tickets']);
  }

  goBack(): void {
    window.history.back();
  }
}
