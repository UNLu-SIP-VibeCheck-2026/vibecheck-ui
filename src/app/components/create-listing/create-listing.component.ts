import { Component, Input, Output, EventEmitter, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ethers } from "ethers";

import { TicketResponse } from "../../models/ticket.model";
import { EventResponse } from "../../models/event.model";
import { ListingResponse } from "../../models/listing.model";
import { Web3Service } from "../../services/web3.service";
import { ContractsService } from "../../services/contracts.service";
import { TransactionService, TxState } from "../../services/transaction.service";
import { MarketplaceService } from "../../services/marketplace.service";
import { EventService } from "../../services/event.service";
import { TxStatusComponent } from "../shared/tx-status/tx-status.component";

@Component({
  selector: "app-create-listing",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    TxStatusComponent,
  ],
  templateUrl: "./create-listing.component.html",
  styleUrl: "./create-listing.component.scss",
})
export class CreateListingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private web3Service = inject(Web3Service);
  private contractsService = inject(ContractsService);
  private transactionService = inject(TransactionService);
  private marketplaceService = inject(MarketplaceService);
  private eventService = inject(EventService);
  private snackBar = inject(MatSnackBar);

  @Input() ticket!: TicketResponse;
  @Output() listed = new EventEmitter<ListingResponse>();

  listingForm!: FormGroup;
  eventDetails: EventResponse | null = null;
  maxPrice = 0;
  isLoading = false;
  
  txStep: "idle" | "approving" | "listing" | "confirming" | "success" = "idle";
  currentTxState: TxState | null = null;
  errorMessage = "";

  get capPercentage(): number {
    if (this.eventDetails && this.eventDetails.maxResalePriceBps) {
      return Math.round((this.eventDetails.maxResalePriceBps - 10000) / 100);
    }
    return 20; // fallback default
  }

  ngOnInit(): void {
    if (!this.ticket) return;

    this.maxPrice = this.ticket.ticketType.priceUsdc * 1.2;

    this.listingForm = this.fb.group({
      priceUsdc: [
        null,
        [
          Validators.required,
          Validators.min(0.01),
          Validators.max(this.maxPrice),
        ],
      ],
    });

    this.loadEventDetails();
  }

  loadEventDetails(): void {
    this.isLoading = true;
    this.eventService.findByIdEvent(this.ticket.ticketType.eventId).subscribe({
      next: (event) => {
        this.eventDetails = event;
        this.isLoading = false;
        if (event && event.maxResalePriceBps) {
          const multiplier = event.maxResalePriceBps / 10000;
          this.maxPrice = this.ticket.ticketType.priceUsdc * multiplier;
          this.listingForm.get("priceUsdc")?.setValidators([
            Validators.required,
            Validators.min(0.01),
            Validators.max(this.maxPrice),
          ]);
          this.listingForm.get("priceUsdc")?.updateValueAndValidity();
        }
      },
      error: (err) => {
        console.error("Error loading event details", err);
        this.isLoading = false;
        this.snackBar.open("Error al cargar detalles del evento.", "Cerrar", {
          duration: 3000,
        });
      },
    });
  }

  get isPriceInvalid(): boolean {
    const control = this.listingForm.get("priceUsdc");
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.listingForm.invalid || !this.eventDetails) {
      return;
    }

    const eventNftAddress = this.eventDetails.eventNftAddress;
    if (!eventNftAddress) {
      this.errorMessage = "La dirección del contrato NFT del evento no está disponible.";
      return;
    }

    if (!this.ticket.tokenId) {
      this.errorMessage = "Esta entrada no tiene un tokenId válido.";
      return;
    }

    this.errorMessage = "";
    this.txStep = "idle";
    this.currentTxState = null;

    // Regla 3: verificación sincrónica de red — un await antes de MetaMask invalida
    // el gesto del usuario en Safari mobile y bloquea el deeplink.
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage = "Cambiá la red a Sepolia en MetaMask";
      this.web3Service.switchToSepolia();
      return;
    }

    try {
      const marketplaceAddress = this.web3Service.NFT_MARKETPLACE_ADDRESS;
      const eventNFT = this.contractsService.getEventNFT(eventNftAddress);

      // 1. Verify ERC721 Approval
      this.isLoading = true;
      const approvedAddress = await eventNFT["getApproved"](this.ticket.tokenId);
      this.isLoading = false;

      if (approvedAddress.toLowerCase() !== marketplaceAddress.toLowerCase()) {
        this.txStep = "approving";
        const signer = await this.web3Service.getSigner();
        const eventNFTWithSigner = this.contractsService.getEventNFT(eventNftAddress, signer);

        const approveTx = await eventNFTWithSigner["approve"](
          marketplaceAddress,
          this.ticket.tokenId
        );

        this.transactionService.track(approveTx).subscribe({
          next: (state) => {
            this.currentTxState = state;
            if (state.status === "confirmed") {
              this.listOnMarketplace(eventNftAddress);
            } else if (state.status === "failed") {
              this.txStep = "idle";
              this.errorMessage = "La aprobación del NFT falló o fue cancelada.";
            }
          },
          error: (err) => {
            this.handleError(err);
          },
        });
      } else {
        // Already approved, proceed to list
        await this.listOnMarketplace(eventNftAddress);
      }
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async listOnMarketplace(eventNftAddress: string): Promise<void> {
    this.txStep = "listing";
    this.currentTxState = null;

    try {
      const priceUsdc = this.listingForm.value.priceUsdc;
      const priceUsdcOnChain = BigInt(Math.round(priceUsdc * 1_000_000)); // 6 decimals

      const signer = await this.web3Service.getSigner();
      const marketplace = this.contractsService.getMarketplace(signer);

      const listTx = await marketplace["list"](
        eventNftAddress,
        this.ticket.tokenId,
        priceUsdcOnChain
      );

      this.transactionService.track(listTx).subscribe({
        next: (state) => {
          this.currentTxState = state;
          if (state.status === "confirmed") {
            this.confirmListingBackend(state.receipt, eventNftAddress);
          } else if (state.status === "failed") {
            this.txStep = "idle";
            this.errorMessage = "La publicación en el marketplace falló.";
          }
        },
        error: (err) => {
          this.handleError(err);
        },
      });
    } catch (err: any) {
      this.handleError(err);
    }
  }

  confirmListingBackend(receipt: any, eventNftAddress: string): void {
    this.txStep = "confirming";
    this.currentTxState = null;

    try {
      const listedTopic = ethers.id("Listed(uint256,address,address,uint256,uint256)");
      let listingId: bigint | null = null;

      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          if (log.topics && log.topics[0] === listedTopic) {
            listingId = BigInt(log.topics[1]);
            break;
          }
        }
      }

      if (listingId === null) {
        throw new Error("No se pudo extraer el listingId de los logs de la transacción.");
      }

      const confirmReq = {
        onChainListingId: Number(listingId),
        tokenId: Number(this.ticket.tokenId),
        eventNftAddress: eventNftAddress,
        txHash: receipt.hash || receipt.transactionHash,
      };

      this.marketplaceService.confirmListing(confirmReq).subscribe({
        next: (response) => {
          this.txStep = "success";
          this.snackBar.open("Entrada listada con éxito!", "Cerrar", {
            duration: 3000,
          });
          this.listed.emit(response);
        },
        error: (err) => {
          console.error("Backend confirmation error", err);
          this.txStep = "idle";
          if (err.status === 400 && err.error && err.error.errorCode === "BLOCKCHAIN_ERROR") {
            this.errorMessage = err.error.message || "Error de validación en el servidor.";
          } else {
            this.errorMessage = `La transacción se confirmó on-chain pero hubo un error de sincronización. Contactá soporte con el Hash: ${confirmReq.txHash}`;
          }
        },
      });
    } catch (err: any) {
      this.handleError(err);
    }
  }

  handleError(err: any): void {
    this.isLoading = false;
    this.txStep = "idle";
    console.error("Error en el flujo de publicación:", err);
    if (err.code === "ACTION_REJECTED" || err.code === 4001 || (err.message && err.message.toLowerCase().includes("user rejected"))) {
      this.errorMessage = "Transacción cancelada por el usuario.";
    } else {
      this.errorMessage = err.message || "Ocurrió un error inesperado al interactuar con MetaMask.";
    }
  }
}
