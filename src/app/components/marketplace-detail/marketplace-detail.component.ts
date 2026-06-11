import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { writeContract } from "@wagmi/core";
import { config } from "../../services/wagmi.config";
import { HttpClient } from "@angular/common/http";
import { formatUnits } from "viem";

import { ListingResponse, PurchaseConfirmResponse } from "../../models/listing.model";
import { EventResponse } from "../../models/event.model";
import { TicketTypeResponse } from "../../models/ticket-type.model";
import { MarketplaceService } from "../../services/marketplace.service";
import { EventService } from "../../services/event.service";
import { VenueService } from "../../services/venue.service";
import { TicketTypeService } from "../../services/ticket-type.service";
import { ContractsService } from "../../services/contracts.service";
import { Web3Service } from "../../services/web3.service";
import { TokenApprovalService } from "../../services/token-approval.service";
import { TransactionService } from "../../services/transaction.service";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-marketplace-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: "./marketplace-detail.component.html",
  styleUrl: "./marketplace-detail.component.scss"
})
export class MarketplaceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private marketplaceService = inject(MarketplaceService);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private ticketTypeService = inject(TicketTypeService);
  private contractsService = inject(ContractsService);
  private web3Service = inject(Web3Service);
  private tokenApprovalService = inject(TokenApprovalService);
  private transactionService = inject(TransactionService);

  // Core wizard steps & states
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>("");
  connectedAddress = signal<string | null>(null);
  isSepolia = signal<boolean>(false);
  siweMessage = signal<string>("");

  // Listing details & quotes
  listing = signal<ListingResponse | null>(null);
  event = signal<EventResponse | null>(null);
  venueName = signal<string>("Cargando...");
  venueAddress = signal<string>("Cargando...");
  tierName = signal<string>("Cargando...");
  eventImageUrl = signal<SafeUrl | null>(null);

  selectedToken = signal<"USDC" | "VBK">("USDC");
  isVbkAvailable = signal<boolean>(false);
  vbkPriceEstimate = signal<string>("");
  vbkQuoteBigInt = signal<bigint>(0n);

  // Success ticket receipt
  purchaseTxHash = signal<string>("");
  successTicket = signal<PurchaseConfirmResponse | null>(null);

  ngOnInit(): void {
    window.scrollTo(0, 0);

    const listingId = this.route.snapshot.paramMap.get("listingId");
    if (listingId) {
      this.loadListingDetails(Number(listingId));
    } else {
      this.errorMessage.set("ID de publicación no proporcionado.");
    }

    this.web3Service.connectedAddress$.subscribe((addr) => {
      this.connectedAddress.set(addr);
      this.checkConnectionState();
    });

    // Regla 3: suscripción a chainId$ en vez de isSepolia$ para detectar la red
    // real de inmediato durante el switch y evitar desincronización.
    this.web3Service.chainId$.subscribe((chainId) => {
      this.isSepolia.set(chainId === 11155111);
      this.checkConnectionState();
    });
  }

  checkConnectionState(): void {
    const address = this.connectedAddress();
    // Regla 3: leer chainId sincrónico para evitar falsos positivos durante el switch de red
    const chainId = this.web3Service.chainId$.getValue();
    const sepolia = chainId === 11155111;

    if (!address || !sepolia) {
      this.currentStep.set(1);
      if (address && !sepolia) {
        this.errorMessage.set("Cambiá a la red Sepolia para continuar.");
        this.web3Service.switchToSepolia();
      }
      return;
    }

    if (this.currentStep() === 1) {
      this.currentStep.set(2);
      this.startSiweFlow();
    }
  }

  // Regla 1: sin async/await — Safari mobile invalida el gesto del usuario
  // en el primer await, bloqueando el deeplink a MetaMask.
  connectWallet(): void {
    this.errorMessage.set("");
    this.web3Service.connectWallet();
  }

  // Regla 3/4: verificación y switch de red sincrónicos — sin await antes de MetaMask.
  checkNetwork(): void {
    this.errorMessage.set("");
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage.set("Cambiá a la red Sepolia");
      this.web3Service.switchToSepolia();
    }
  }

  startSiweFlow(): void {
    const address = this.connectedAddress();
    if (!address) return;

    this.isLoading.set(true);
    this.errorMessage.set("");

    this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/challenge`, { walletAddress: address }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.walletAddress && res.walletAddress.toLowerCase() === address.toLowerCase()) {
          this.currentStep.set(3);
          return;
        }

        if (res && res.message) {
          this.siweMessage.set(res.message);
        } else {
          this.errorMessage.set("No se pudo obtener el mensaje de firma.");
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.errorMessage.set("La billetera ya está vinculada a otro usuario.");
        } else {
          this.errorMessage.set(err.error?.message || "Error al solicitar el desafío SIWE.");
        }
      }
    });
  }

  signAndVerify(): void {
    const address = this.connectedAddress();
    const message = this.siweMessage();
    if (!address || !message) return;

    this.isLoading.set(true);
    this.errorMessage.set("");

    this.web3Service.signMessage(message).then(signature => {
      this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/verify`, {
        walletAddress: address,
        message,
        signature
      }).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.currentStep.set(3);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 409) {
            this.errorMessage.set("La billetera ya está vinculada a otro usuario.");
          } else {
            this.errorMessage.set(err.error?.message || "Error al verificar la firma.");
          }
        }
      });
    }).catch((e: any) => {
      this.isLoading.set(false);
      console.error("Error al firmar:", e);
      this.errorMessage.set("Firma cancelada o rechazada por el usuario.");
    });
  }

  loadListingDetails(listingId: number): void {
    this.errorMessage.set("");

    this.marketplaceService.getListingById(listingId).subscribe({
      next: (l) => {
        this.listing.set(l);
        this.loadEnrichmentData(l);
        this.fetchVbkQuote(l);
      },
      error: (err) => {
        console.error("Error fetching listing details", err);
        this.errorMessage.set("No se pudieron cargar los detalles de la publicación.");
      }
    });
  }

  loadEnrichmentData(l: ListingResponse): void {
    // 1. Fetch Event by EventNFTAddress (Search through event list or fetch by address)
    this.eventService.findAllEvents(0, 100).subscribe({
      next: (eventsPage) => {
        const events = eventsPage.content || [];
        const matchedEvent = events.find(
          (e) => e.eventNftAddress?.toLowerCase() === l.eventNftAddress.toLowerCase()
        );

        if (matchedEvent) {
          this.event.set(matchedEvent);

          // 2. Fetch venue info
          if (matchedEvent.venueId) {
            this.venueService.findVenueById(matchedEvent.venueId).subscribe({
              next: (v) => {
                this.venueName.set(v.title);
                this.venueAddress.set(v.coordinates || "Dirección no registrada");
              },
              error: () => {
                this.venueName.set("Dirección no disponible");
                this.venueAddress.set("No disponible");
              }
            });
          } else {
            this.venueName.set("Sin sede asignada");
            this.venueAddress.set("No disponible");
          }

          // 3. Get event image
          this.eventService.getEventImage(matchedEvent.id).subscribe({
            next: (blob) => {
              this.eventImageUrl.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)));
            },
            error: () => console.log("No image found for event id", matchedEvent.id)
          });

          // 4. Load ticket types to resolve on-chain tier
          this.resolveOnChainTier(matchedEvent, l);
        } else {
          this.venueName.set("Desconocida");
          this.venueAddress.set("No disponible");
          this.tierName.set("Entrada General");
        }
      },
      error: (err) => {
        console.error("Error searching event list", err);
      }
    });
  }

  async resolveOnChainTier(evt: EventResponse, l: ListingResponse) {
    try {
      const ticketTypes = await this.ticketTypeService.findTicketTypesByEvent(evt.id).toPromise() || [];
      
      let tierIdxVal: any = null;
      try {
        tierIdxVal = await this.contractsService.getNftTokenTier(l.eventNftAddress, BigInt(l.tokenId));
      } catch (err) {
        console.warn("Could not retrieve token tier from contract", err);
      }

      if (tierIdxVal !== null && tierIdxVal !== undefined) {
        const tierIdx = Number(tierIdxVal);
        const matchedType = ticketTypes.find((t) => t.tierIndex === tierIdx);
        if (matchedType) {
          this.tierName.set(matchedType.name);
        } else {
          this.tierName.set(`Tier #${tierIdx}`);
        }
      } else {
        this.tierName.set("Entrada");
      }
    } catch (err) {
      console.error("Error resolving tier on-chain", err);
      this.tierName.set("Entrada");
    }
  }

  async fetchVbkQuote(l: ListingResponse): Promise<void> {
    this.isVbkAvailable.set(false);
    this.vbkPriceEstimate.set("");
    this.vbkQuoteBigInt.set(0n);

    try {
      const quote = await this.web3Service.quoteUsdcToVbk(l.priceUsdc);
      if (quote > 0n) {
        this.vbkQuoteBigInt.set(quote);
        this.vbkPriceEstimate.set(formatUnits(quote, 18));
        this.isVbkAvailable.set(true);
      }
    } catch (err) {
      console.warn("Oracle VBK is not available or pool has no liquidity. VBK purchases disabled.", err);
    }
  }

  async executePurchase(): Promise<void> {
    this.errorMessage.set("");
    const lst = this.listing();
    if (!lst) return;

    // Regla 3: verificación sincrónica de red — un await aquí invalida el gesto en
    // Safari mobile y bloquea el deeplink a MetaMask para la transacción.
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage.set("Cambiá la red a Sepolia en MetaMask");
      this.web3Service.switchToSepolia();
      return;
    }

    const wallet = this.connectedAddress();
    if (!wallet) {
      this.errorMessage.set("Por favor conectá tu billetera para comprar.");
      return;
    }

    this.currentStep.set(4);
    this.isLoading.set(true);

    try {
      const marketplaceAddress = this.web3Service.NFT_MARKETPLACE_ADDRESS;

      if (this.selectedToken() === "USDC") {
        const usdcAddress = this.web3Service.USDC_ADDRESS;
        const priceUsdcBig = BigInt(Math.round(lst.priceUsdc * 1_000_000));
        const amountUsdc = (priceUsdcBig * 10700n) / 10000n;

        // 1. Approve USDC if necessary
        const currentAllowance = await this.web3Service.getUsdcAllowance(wallet, marketplaceAddress);

        if (currentAllowance < amountUsdc) {
          await this.tokenApprovalService.ensureAllowance(usdcAddress, marketplaceAddress, amountUsdc);
        }

        // 2. Call buyWithUSDC
        const buyTx = await writeContract(config, {
          address: marketplaceAddress as `0x${string}`,
          abi: this.contractsService.MARKETPLACE_ABI,
          functionName: "buyWithUSDC",
          args: [BigInt(lst.onChainListingId)],
        } as any);

        this.transactionService.track(buyTx).subscribe({
          next: (state) => {
            if (state.status === "confirmed") {
              const txHash = buyTx;
              this.purchaseTxHash.set(txHash);
              this.confirmPurchaseOnBackend(txHash);
            } else if (state.status === "failed") {
              this.currentStep.set(3);
              this.errorMessage.set("La transacción de compra falló.");
              this.isLoading.set(false);
            }
          },
          error: (err) => {
            this.currentStep.set(3);
            this.handleTxError(err);
          }
        });

      } else {
        // VBK buy flow
        if (!this.isVbkAvailable() || this.vbkQuoteBigInt() === 0n) {
          this.errorMessage.set("La compra con VBK no está disponible.");
          this.currentStep.set(3);
          this.isLoading.set(false);
          return;
        }

        const vbkAddress = this.web3Service.VBK_ADDRESS;
        // 5% slippage on VBK amount
        const vbkNeeded = (this.vbkQuoteBigInt() * 105n) / 100n;
        const amountVbk = (vbkNeeded * 10400n) / 10000n;

        // 1. Approve VBK if necessary
        const currentAllowance = await this.web3Service.getVbkAllowance(wallet, marketplaceAddress);

        if (currentAllowance < amountVbk) {
          await this.tokenApprovalService.ensureAllowance(vbkAddress, marketplaceAddress, amountVbk);
        }

        // 2. Call buyWithVBK
        const buyTx = await writeContract(config, {
          address: marketplaceAddress as `0x${string}`,
          abi: this.contractsService.MARKETPLACE_ABI,
          functionName: "buyWithVBK",
          args: [BigInt(lst.onChainListingId)],
        } as any);

        this.transactionService.track(buyTx).subscribe({
          next: (state) => {
            if (state.status === "confirmed") {
              const txHash = buyTx;
              this.purchaseTxHash.set(txHash);
              this.confirmPurchaseOnBackend(txHash);
            } else if (state.status === "failed") {
              this.currentStep.set(3);
              this.errorMessage.set("La transacción de compra con VBK falló.");
              this.isLoading.set(false);
            }
          },
          error: (err) => {
            this.currentStep.set(3);
            this.handleTxError(err);
          }
        });
      }
    } catch (err: any) {
      this.currentStep.set(3);
      this.handleTxError(err);
    }
  }

  confirmPurchaseOnBackend(txHash: string): void {
    this.currentStep.set(5);
    this.isLoading.set(true);

    const lst = this.listing();
    if (!lst) return;

    this.marketplaceService.confirmPurchase({
      onChainListingId: lst.onChainListingId,
      txHash: txHash
    }).subscribe({
      next: (response) => {
        this.successTicket.set(response);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error("Backend purchase confirm failed", err);
        this.isLoading.set(false);
        if (err.status === 400) {
          this.errorMessage.set("Esta entrada ya no está disponible.");
        } else {
          this.errorMessage.set(`La compra se procesó on-chain pero falló la confirmación del servidor. Contactá a soporte con el Hash: ${txHash}`);
        }
      }
    });
  }

  handleTxError(err: any): void {
    this.isLoading.set(false);
    console.error("Purchase error", err);

    if (err.code === "ACTION_REJECTED" || err.code === 4001 || (err.message && err.message.toLowerCase().includes("user rejected"))) {
      this.errorMessage.set("Transacción cancelada por el usuario.");
    } else if (
      err.code === "INSUFFICIENT_FUNDS" ||
      (err.message && err.message.toLowerCase().includes("insufficient funds")) ||
      (err.message && err.message.toLowerCase().includes("transfer amount exceeds balance"))
    ) {
      this.errorMessage.set("Fondos insuficientes para pagar el gas o comprar en Sepolia.");
    } else {
      this.errorMessage.set(err.reason || err.message || "Ocurrió un error inesperado al procesar la compra.");
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try {
      const formatted = new Date(dateStr).toLocaleString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return dateStr;
    }
  }

  truncateAddress(address: string | null): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  navigateToMyListings(): void {
    this.router.navigate(["/my-listings"]);
  }

  goBack(): void {
    this.router.navigate(["/marketplace"]);
  }

  get vbkNumber(): number {
    return parseFloat(this.vbkPriceEstimate()) || 0;
  }
}
