import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";

import { ListingResponse } from "../../models/listing.model";
import { Web3Service } from "../../services/web3.service";
import { ContractsService } from "../../services/contracts.service";
import { TransactionService, TxState } from "../../services/transaction.service";
import { MarketplaceService } from "../../services/marketplace.service";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { TxStatusComponent } from "../shared/tx-status/tx-status.component";

@Component({
  selector: "app-cancel-listing",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    TxStatusComponent,
  ],
  templateUrl: "./cancel-listing.component.html",
  styleUrl: "./cancel-listing.component.scss",
})
export class CancelListingComponent {
  private dialog = inject(MatDialog);
  private web3Service = inject(Web3Service);
  private contractsService = inject(ContractsService);
  private transactionService = inject(TransactionService);
  private marketplaceService = inject(MarketplaceService);
  private snackBar = inject(MatSnackBar);

  @Input() listing!: ListingResponse;
  @Output() cancelled = new EventEmitter<void>();

  isLoading = false;
  txStep: "idle" | "cancelling" | "confirming" | "success" = "idle";
  currentTxState: TxState | null = null;
  errorMessage = "";

  confirmCancel(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "400px",
      data: {
        title: "Cancelar Publicación",
        message: "¿Estás seguro de que querés retirar esta entrada del marketplace?",
        confirmText: "Sí, Cancelar",
        cancelText: "Volver",
        success: false,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.processCancellation();
      }
    });
  }

  async processCancellation(): Promise<void> {
    this.errorMessage = "";
    this.txStep = "cancelling";
    this.currentTxState = null;

    try {
      // 0. Verify Network
      const isSepolia = await this.web3Service.checkNetwork();
      if (!isSepolia) {
        this.txStep = "idle";
        this.errorMessage = "Cambiá la red a Sepolia en MetaMask";
        return;
      }

      // 1. Contract cancel call
      const signer = await this.web3Service.getSigner();
      const marketplace = this.contractsService.getMarketplace(signer);

      const cancelTx = await marketplace["cancel"](this.listing.onChainListingId);

      this.transactionService.track(cancelTx).subscribe({
        next: (state) => {
          this.currentTxState = state;
          if (state.status === "confirmed") {
            this.confirmCancelBackend(state.receipt);
          } else if (state.status === "failed") {
            this.txStep = "idle";
            this.errorMessage = "La cancelación on-chain falló.";
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

  confirmCancelBackend(receipt: any): void {
    this.txStep = "confirming";
    this.currentTxState = null;

    const txHash = receipt.hash || receipt.transactionHash;
    const req = { txHash };

    this.marketplaceService.confirmListingCancel(this.listing.onChainListingId, req).subscribe({
      next: () => {
        this.txStep = "success";
        this.snackBar.open("Publicación cancelada con éxito.", "Cerrar", {
          duration: 3000,
        });
        this.cancelled.emit();
      },
      error: (err) => {
        console.error("Error confirming cancellation on backend:", err);
        this.txStep = "idle";
        this.errorMessage = "Error al confirmar la cancelación en el servidor.";
      },
    });
  }

  handleError(err: any): void {
    this.isLoading = false;
    this.txStep = "idle";
    console.error("Error en flujo de cancelación:", err);
    if (err.code === "ACTION_REJECTED" || err.code === 4001 || (err.message && err.message.toLowerCase().includes("user rejected"))) {
      this.errorMessage = "Transacción cancelada por el usuario.";
    } else {
      this.errorMessage = err.message || "Ocurrió un error inesperado al interactuar con MetaMask.";
    }
  }
}
