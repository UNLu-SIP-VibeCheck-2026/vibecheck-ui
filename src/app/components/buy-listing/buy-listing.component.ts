import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatRadioModule } from "@angular/material/radio";
import { FormsModule } from "@angular/forms";
import { ethers } from "ethers";

import { ListingResponse, PurchaseConfirmResponse } from "../../models/listing.model";
import { Web3Service } from "../../services/web3.service";
import { ContractsService } from "../../services/contracts.service";
import { TokenApprovalService } from "../../services/token-approval.service";
import { TransactionService, TxState } from "../../services/transaction.service";
import { MarketplaceService } from "../../services/marketplace.service";
import { TxStatusComponent } from "../shared/tx-status/tx-status.component";

@Component({
  selector: "app-buy-listing",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    FormsModule,
    TxStatusComponent
  ],
  templateUrl: "./buy-listing.component.html",
  styleUrl: "./buy-listing.component.scss"
})
export class BuyListingComponent implements OnInit, OnChanges {
  private web3Service = inject(Web3Service);
  private contractsService = inject(ContractsService);
  private tokenApprovalService = inject(TokenApprovalService);
  private transactionService = inject(TransactionService);
  private marketplaceService = inject(MarketplaceService);

  @Input() listing!: ListingResponse;
  @Output() purchased = new EventEmitter<PurchaseConfirmResponse>();

  // Payment Options
  selectedToken: "USDC" | "VBK" = "USDC";
  isVbkAvailable = signal<boolean>(false);
  vbkPriceEstimate = signal<string>("");
  vbkQuoteBigInt = 0n;

  // Wallet and network
  connectedAddress = signal<string | null>(null);
  errorMessage = signal<string>("");
  isLoading = signal<boolean>(false);

  // Tx flow state
  txStep: "idle" | "approving" | "buying" | "confirming" | "success" = "idle";
  currentTxState: TxState | null = null;

  ngOnInit(): void {
    this.web3Service.connectedAddress$.subscribe((addr) => {
      this.connectedAddress.set(addr);
    });

    if (this.listing) {
      this.fetchVbkQuote();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["listing"] && !changes["listing"].firstChange) {
      this.fetchVbkQuote();
    }
  }

  async fetchVbkQuote(): Promise<void> {
    this.isVbkAvailable.set(false);
    this.vbkPriceEstimate.set("");
    this.vbkQuoteBigInt = 0n;

    try {
      // Call Uniswap quote from Web3Service
      const quote = await this.web3Service.quoteUsdcToVbk(this.listing.priceUsdc);
      if (quote > 0n) {
        this.vbkQuoteBigInt = quote;
        this.vbkPriceEstimate.set(ethers.formatUnits(quote, 18));
        this.isVbkAvailable.set(true);
      }
    } catch (err) {
      console.warn("Oracle VBK is not available or pool has no liquidity. VBK purchases disabled.", err);
    }
  }

  async executePurchase(): Promise<void> {
    this.errorMessage.set("");
    this.txStep = "idle";
    this.currentTxState = null;

    // 0. Verify connected wallet and network
    const isSepolia = await this.web3Service.checkNetwork();
    if (!isSepolia) {
      this.errorMessage.set("Cambiá la red a Sepolia en MetaMask");
      return;
    }

    const wallet = this.connectedAddress();
    if (!wallet) {
      this.errorMessage.set("Por favor conectá tu billetera para comprar.");
      return;
    }

    this.isLoading.set(true);

    try {
      const signer = await this.web3Service.getSigner();
      const marketplaceAddress = this.web3Service.NFT_MARKETPLACE_ADDRESS;

      if (this.selectedToken === "USDC") {
        const usdcAddress = this.web3Service.USDC_ADDRESS;
        const amountUsdc = BigInt(Math.round(this.listing.priceUsdc * 1_000_000));

        // 1. Approve USDC if necessary
        const usdcContract = this.contractsService.getUsdcToken(signer);
        const currentAllowance = await usdcContract["allowance"](wallet, marketplaceAddress);

        if (currentAllowance < amountUsdc) {
          this.txStep = "approving";
          this.currentTxState = { status: "pending", hash: "" };
          await this.tokenApprovalService.ensureAllowance(usdcAddress, marketplaceAddress, amountUsdc);
          this.currentTxState = { status: "confirmed", hash: "" };
        }

        // 2. Call buyWithUSDC
        this.txStep = "buying";
        this.currentTxState = null;
        const marketplace = this.contractsService.getMarketplace(signer);
        const buyTx = await marketplace["buyWithUSDC"](this.listing.onChainListingId);

        this.transactionService.track(buyTx).subscribe({
          next: (state) => {
            this.currentTxState = state;
            if (state.status === "confirmed") {
              this.confirmPurchaseOnBackend(state.receipt, "USDC");
            } else if (state.status === "failed") {
              this.txStep = "idle";
              this.errorMessage.set("La transacción de compra falló.");
              this.isLoading.set(false);
            }
          },
          error: (err) => {
            this.handleTxError(err);
          }
        });

      } else {
        // VBK buy flow
        if (!this.isVbkAvailable() || this.vbkQuoteBigInt === 0n) {
          this.errorMessage.set("La compra con VBK no está disponible.");
          this.isLoading.set(false);
          return;
        }

        const vbkAddress = this.web3Service.VBK_ADDRESS;
        // 5% slippage on VBK amount
        const amountVbk = (this.vbkQuoteBigInt * 105n) / 100n;

        // 1. Approve VBK if necessary
        const vbkContract = this.contractsService.getVbkToken(signer);
        const currentAllowance = await vbkContract["allowance"](wallet, marketplaceAddress);

        if (currentAllowance < amountVbk) {
          this.txStep = "approving";
          this.currentTxState = { status: "pending", hash: "" };
          await this.tokenApprovalService.ensureAllowance(vbkAddress, marketplaceAddress, amountVbk);
          this.currentTxState = { status: "confirmed", hash: "" };
        }

        // 2. Call buyWithVBK
        this.txStep = "buying";
        this.currentTxState = null;
        const marketplace = this.contractsService.getMarketplace(signer);
        const buyTx = await marketplace["buyWithVBK"](this.listing.onChainListingId);

        this.transactionService.track(buyTx).subscribe({
          next: (state) => {
            this.currentTxState = state;
            if (state.status === "confirmed") {
              this.confirmPurchaseOnBackend(state.receipt, "VBK");
            } else if (state.status === "failed") {
              this.txStep = "idle";
              this.errorMessage.set("La transacción de compra con VBK falló.");
              this.isLoading.set(false);
            }
          },
          error: (err) => {
            this.handleTxError(err);
          }
        });
      }
    } catch (err: any) {
      this.handleTxError(err);
    }
  }

  confirmPurchaseOnBackend(receipt: any, token: "USDC" | "VBK"): void {
    this.txStep = "confirming";
    this.currentTxState = null;

    const txHash = receipt.hash || receipt.transactionHash;

    // Verify resale log is present in receipt to confirm contract execution succeeded correctly
    const usdcResoldTopic = ethers.id("TicketResoldUSDC(uint256,address,address,uint256,uint256,uint256)");
    const vbkResoldTopic = ethers.id("TicketResoldVBK(uint256,address,address,uint256,uint256,uint256,uint256)");
    const targetTopic = token === "USDC" ? usdcResoldTopic : vbkResoldTopic;

    let eventConfirmed = false;
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        if (log.topics && log.topics[0] === targetTopic) {
          eventConfirmed = true;
          break;
        }
      }
    }

    if (!eventConfirmed) {
      console.warn("Could not find TicketResold log in receipt, proceeding with backend confirmation anyway.");
    }

    this.marketplaceService.confirmPurchase({
      onChainListingId: this.listing.onChainListingId,
      txHash: txHash
    }).subscribe({
      next: (response) => {
        this.txStep = "success";
        this.isLoading.set(false);
        this.purchased.emit(response);
      },
      error: (err) => {
        console.error("Backend purchase confirm failed", err);
        this.txStep = "idle";
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
    this.txStep = "idle";
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

  async connectWallet(): Promise<void> {
    try {
      await this.web3Service.connectWallet();
    } catch (err: any) {
      this.errorMessage.set("Error al conectar MetaMask: " + err.message);
    }
  }
}
