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

    // Regla 3: verificación sincrónica de red — un await antes de MetaMask invalida
    // el gesto del usuario en Safari mobile y bloquea el deeplink.
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.txStep = "idle";
      this.errorMessage = "Cambiá la red a Sepolia en MetaMask";
      this.web3Service.switchToSepolia();
      return;
    }

    try {
      // 1. Contract cancel call
      const cancelTx = await this.web3Service.cancelListing(BigInt(this.listing.onChainListingId));

      this.transactionService.track(cancelTx).subscribe({
        next: (state) => {
          this.currentTxState = state;
          if (state.status === "confirmed") {
            this.confirmCancelBackend(state.receipt || cancelTx);
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

    const txHash = typeof receipt === "string" ? receipt : (receipt.hash || receipt.transactionHash);
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
