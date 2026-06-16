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
  }

  selectUser(user: SearchResultUser): void {
    if (user && user.canReceiveGift) {
      this.selectedUser = user;
    }
  }

  clearSelection(): void {
    this.selectedUser = null;
  }

  getUserImageUrl(username: string): string {
    return `${this.apiBaseUrl}/users/public/${username}/image`;
  }

  get showMinCharsHint(): boolean {
    const q = this.searchQuery.trim();
    return q.length > 0 && q.length < 3 && !this.isManualAddressValid;
  }

  // Regla 3: sin await antes de MetaMask — Safari mobile invalida el gesto del
  // usuario en el primer await, bloqueando el deeplink a MetaMask.
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
    this.txStep = 'validating';
    this.currentTxState = null;

    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.txStep = 'idle';
      this.errorMessage = 'Cambiá la red a Sepolia en MetaMask';
      this.web3Service.switchToSepolia();
      return;
    }

    this.marketplaceService.validateGift({ recipientWallet }).subscribe({
      next: () => {
        this.executeOnChainGiftFlow(eventNftAddress, recipientWallet);
      },
      error: (err) => {
        console.error('Validation error', err);
        this.txStep = 'idle';
        this.errorMessage = err.error?.message || 'La wallet destinataria no está registrada en VibeCheck.';
      }
    });
  }

  private async executeOnChainGiftFlow(eventNftAddress: string, recipientWallet: string): Promise<void> {
    if (!this.ticket || this.ticket.tokenId === null) return;

    try {
      const marketplaceAddress = this.web3Service.NFT_MARKETPLACE_ADDRESS;

      // Verify that the connected wallet owns the ticket on-chain
      const connectedWallet = this.web3Service.walletAddress$.getValue();
      if (!connectedWallet) {
        this.txStep = 'idle';
        this.errorMessage = 'Por favor conectá tu billetera.';
        return;
      }

      const tokenOwner = await this.contractsService.getNftOwner(eventNftAddress, BigInt(this.ticket.tokenId));

      if (connectedWallet.toLowerCase() !== tokenOwner.toLowerCase()) {
        this.txStep = 'idle';
        this.errorMessage = `La billetera conectada (${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}) no es la dueña de esta entrada en la blockchain. Conectate con la billetera dueña (${tokenOwner.slice(0, 6)}...${tokenOwner.slice(-4)}) para poder regalarla.`;
        return;
      }

      // 1. Verify ERC721 Approval
      this.txStep = 'approving-nft';
      const approvedAddress = await this.contractsService.getNftApproved(eventNftAddress, BigInt(this.ticket.tokenId));

      if (approvedAddress.toLowerCase() !== marketplaceAddress.toLowerCase()) {
        const approveTx = await this.web3Service.approveNft(
          eventNftAddress,
          marketplaceAddress,
          BigInt(this.ticket.tokenId)
        );

        this.transactionService.track(approveTx).subscribe({
          next: (state) => {
            this.currentTxState = state;
            if (state.status === 'confirmed') {
              this.ensureUsdcAllowance(eventNftAddress, recipientWallet);
            } else if (state.status === 'failed') {
              this.txStep = 'idle';
              this.errorMessage = 'La aprobación de transferencia del NFT falló o fue cancelada.';
            }
          },
          error: (err) => this.handleError(err)
        });
      } else {
        // Already approved, proceed to USDC allowance check
        await this.ensureUsdcAllowance(eventNftAddress, recipientWallet);
      }
    } catch (err: any) {
      this.handleError(err);
    }
  }

  private async ensureUsdcAllowance(eventNftAddress: string, recipientWallet: string): Promise<void> {
    if (!this.ticket) return;

    try {
      this.txStep = 'approving-usdc';
      this.currentTxState = null;

      const marketplaceAddress = this.web3Service.NFT_MARKETPLACE_ADDRESS;
      const donorWallet = this.web3Service.walletAddress$.getValue();
      if (!donorWallet) {
        this.txStep = 'idle';
        this.errorMessage = 'Por favor conectá tu billetera.';
        return;
      }

      const totalFeeOnChain = BigInt(Math.round(this.totalFee * 1_000_000)); // USDC has 6 decimals
      const currentAllowance = await this.web3Service.getUsdcAllowance(donorWallet, marketplaceAddress);

      if (currentAllowance < totalFeeOnChain) {
        const approveUsdcTx = await this.web3Service.approveUsdc(marketplaceAddress, totalFeeOnChain);

        this.transactionService.track(approveUsdcTx).subscribe({
          next: (state) => {
            this.currentTxState = state;
            if (state.status === 'confirmed') {
              this.giftTicketOnChain(eventNftAddress, recipientWallet);
            } else if (state.status === 'failed') {
              this.txStep = 'idle';
              this.errorMessage = 'La aprobación de USDC falló o fue cancelada.';
            }
          },
          error: (err) => this.handleError(err)
        });
      } else {
        // Already approved, proceed to execute gift on-chain
        await this.giftTicketOnChain(eventNftAddress, recipientWallet);
      }
    } catch (err: any) {
      this.handleError(err);
    }
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
