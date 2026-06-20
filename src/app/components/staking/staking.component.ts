import { Component, OnInit, inject, signal, effect, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { StakingService, StakingSummary, QuoteResponse } from "../../services/staking.service";
import { Web3Service } from "../../services/web3.service";
import { AuthService } from "../../services/auth.service";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { formatUnits, parseUnits } from "viem";

@Component({
  selector: "app-staking",
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogModule],
  templateUrl: "./staking.component.html",
  styleUrl: "./staking.component.scss",
})
export class StakingComponent implements OnInit, OnDestroy {
  private stakingService = inject(StakingService);
  private web3Service = inject(Web3Service);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Connection & Balances
  connectedAddress = signal<string | null>(null);
  vbkBalance = signal<string>("0.00");
  userRole = signal<string>("");

  // Staking State
  stakingSummary = signal<StakingSummary | null>(null);
  isLoadingSummary = signal<boolean>(false);

  // New Stake Calculator State
  calculatorUsdc = signal<string>("100");
  calculatorTerm = signal<number>(30);
  quotedVbk = signal<number | null>(null);
  isLoadingQuote = signal<boolean>(false);

  // Tx Steps
  stakingStep = signal<'idle' | 'approving' | 'staking' | 'success' | 'error'>('idle');
  claimStep = signal<'idle' | 'claiming' | 'success' | 'error'>('idle');
  txHash = signal<string>("");
  errorMessage = signal<string>("");

  // Tab
  activeTab = signal<'user' | 'admin'>('user');

  // Admin Venue State
  allVenueWallets = signal<any[]>([]);
  newVenueAddress = signal<string>("");
  newVenueName = signal<string>("");
  isAdminLoading = signal<boolean>(false);

  // Subscriptions
  private addressSub: any = null;
  private vbkSub: any = null;

  constructor() {
    // Re-quote when calculator input changes
    effect(() => {
      const usdcVal = parseFloat(this.calculatorUsdc());
      const term = this.calculatorTerm();
      if (!isNaN(usdcVal) && usdcVal > 0) {
        this.fetchQuote(usdcVal, term);
      } else {
        this.quotedVbk.set(null);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.addressSub = this.web3Service.connectedAddress$.subscribe(addr => {
      this.connectedAddress.set(addr);
      if (addr) {
        this.loadStakingSummary(addr);
      } else {
        this.stakingSummary.set(null);
      }
    });

    this.vbkSub = this.web3Service.vbkBalance$.subscribe(bal => {
      this.vbkBalance.set(bal);
    });

    const user = this.authService.getCurrentUserValue();
    if (user) {
      this.userRole.set(user.role);
      if (this.isUserAdmin) {
        this.loadVenueWallets();
      }
    }
  }

  ngOnDestroy() {
    if (this.addressSub) this.addressSub.unsubscribe();
    if (this.vbkSub) this.vbkSub.unsubscribe();
  }

  get isUserAdmin(): boolean {
    const role = this.userRole().toUpperCase();
    return role === "ADMIN" || role === "CEO";
  }

  loadStakingSummary(wallet: string) {
    this.isLoadingSummary.set(true);
    this.stakingService.getStakingSummary(wallet).subscribe({
      next: (summary) => {
        this.stakingSummary.set(summary);
        this.isLoadingSummary.set(false);
      },
      error: (err) => {
        console.error("Error loading staking summary:", err);
        this.snackBar.open("Error al cargar el resumen de staking.", "Cerrar", { duration: 3000 });
        this.isLoadingSummary.set(false);
      }
    });
  }

  fetchQuote(usdcTarget: number, termDays: number) {
    this.isLoadingQuote.set(true);
    this.stakingService.quoteStake(usdcTarget, termDays).subscribe({
      next: (quote) => {
        this.quotedVbk.set(quote.vbkNeeded);
        this.isLoadingQuote.set(false);
      },
      error: (err) => {
        console.error("Error quoting stake:", err);
        this.isLoadingQuote.set(false);
      }
    });
  }

  setTerm(days: number) {
    this.calculatorTerm.set(days);
    // Auto-adjust target USDC to recommended minimums if user has lower value
    const currentUsdc = parseFloat(this.calculatorUsdc());
    if (days === 60 && (isNaN(currentUsdc) || currentUsdc < 500)) {
      this.calculatorUsdc.set("500");
    } else if (days === 90 && (isNaN(currentUsdc) || currentUsdc < 1000)) {
      this.calculatorUsdc.set("1000");
    } else if (days === 30 && (isNaN(currentUsdc) || currentUsdc < 100)) {
      this.calculatorUsdc.set("100");
    }
  }

  get projectedTier(): string {
    const usdc = parseFloat(this.calculatorUsdc());
    if (isNaN(usdc) || usdc < 100) return "Ninguno (Mínimo $100 USD)";
    if (usdc < 500) return "Nivel 1 (Inicial)";
    if (usdc < 1000) return "Nivel 2 (Intermedio)";
    return "Nivel 3 (Avanzado)";
  }

  get isStakeDisabled(): boolean {
    if (!this.connectedAddress()) return true;
    const usdc = parseFloat(this.calculatorUsdc());
    if (isNaN(usdc) || usdc < 100) return true;
    const needed = this.quotedVbk();
    if (!needed) return true;
    const bal = parseFloat(this.vbkBalance());
    return bal < needed || this.stakingStep() !== "idle";
  }

  async executeStake() {
    const needed = this.quotedVbk();
    if (!needed) return;

    this.stakingStep.set('approving');
    this.errorMessage.set("");
    this.txHash.set("");

    try {
      const term = this.calculatorTerm();
      // Execute the lock in the smart contract via Web3Service
      this.snackBar.open("Enviando transacción de staking...", "Cerrar", { duration: 4000 });
      const hash = await this.web3Service.stakeVbk(needed, term);
      this.txHash.set(hash);
      
      this.stakingStep.set('staking');
      // Wait for block confirmation
      await this.web3Service.waitForTransaction(hash);
      
      this.stakingStep.set('success');
      this.snackBar.open("¡Staking completado exitosamente!", "Cerrar", { duration: 5000 });
      
      // Refresh state
      const wallet = this.connectedAddress();
      if (wallet) {
        this.loadStakingSummary(wallet);
        this.web3Service.updateBalances(wallet);
      }
    } catch (err: any) {
      console.error("Staking execution failed:", err);
      this.stakingStep.set('error');
      if (err.code === 4001 || (err.message && err.message.toLowerCase().includes("user rejected"))) {
        this.errorMessage.set("Transacción rechazada por el usuario.");
      } else {
        this.errorMessage.set(err.message || "Fallo en la transacción de staking.");
      }
    }
  }

  electBenefit(dbLockId: number, benefit: string) {
    const wallet = this.connectedAddress();
    if (!wallet) return;

    let benefitName = "";
    let explanation = "";
    if (benefit === "PRESALE") {
      benefitName = "Preventa Exclusiva";
      explanation = "Te dará acceso prioritario a preventas de entradas.";
    } else if (benefit === "CASHBACK") {
      benefitName = "Cashback en Entradas";
      explanation = "Recibirás reembolsos en VBK por tus compras de entradas secundarias.";
    } else if (benefit === "FEEFREE") {
      benefitName = "Compra sin Comisión";
      explanation = "Te eximirá de cargos por servicio en tus compras de entradas primarias.";
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "420px",
      data: {
        title: "Confirmar Beneficio",
        message: `¿Estás seguro de que querés elegir "${benefitName}"? ${explanation} Esta acción es irreversible y aplicará durante todo el período de bloqueo.`,
        confirmText: "Confirmar",
        cancelText: "Cancelar",
        success: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.stakingService.electBenefit(wallet, dbLockId, benefit).subscribe({
          next: (res) => {
            this.snackBar.open("Beneficio registrado correctamente.", "Cerrar", { duration: 3000 });
            this.loadStakingSummary(wallet);
          },
          error: (err) => {
            console.error("Benefit election failed:", err);
            const msg = err.error?.message || "Error al registrar beneficio.";
            this.snackBar.open(msg, "Cerrar", { duration: 3000 });
          }
        });
      }
    });
  }

  claimCashback() {
    const wallet = this.connectedAddress();
    if (!wallet) return;

    this.claimStep.set('claiming');
    this.stakingService.claimCashback(wallet).subscribe({
      next: (res) => {
        this.claimStep.set('success');
        this.txHash.set(res.txHash || "");
        this.snackBar.open("Reclamo de cashback procesado. Esperá confirmación.", "Cerrar", { duration: 4000 });
        
        // Wait for confirmation to reload
        if (res.txHash) {
          this.web3Service.waitForTransaction(res.txHash).then(() => {
            this.loadStakingSummary(wallet);
            this.web3Service.updateBalances(wallet);
          });
        }
      },
      error: (err) => {
        console.error("Cashback claim failed:", err);
        this.claimStep.set('error');
        const msg = err.error?.message || "Fallo al reclamar cashback.";
        this.snackBar.open(msg, "Cerrar", { duration: 3000 });
      }
    });
  }

  async withdrawStake(lockIdOnChain: number) {
    const wallet = this.connectedAddress();
    if (!wallet) return;

    try {
      this.snackBar.open("Retirando VBK del Vault...", "Cerrar", { duration: 4000 });
      const hash = await this.web3Service.withdrawStake(BigInt(lockIdOnChain));
      await this.web3Service.waitForTransaction(hash);
      
      this.snackBar.open("Retiro completado.", "Cerrar", { duration: 4000 });
      this.loadStakingSummary(wallet);
      this.web3Service.updateBalances(wallet);
    } catch (err: any) {
      console.error("Withdrawal failed:", err);
      const msg = err.message || "Error al retirar staking.";
      this.snackBar.open(msg, "Cerrar", { duration: 3000 });
    }
  }

  // Admin Venue Wallets Methods
  loadVenueWallets() {
    this.isAdminLoading.set(true);
    this.stakingService.getAllVenueWallets().subscribe({
      next: (wallets) => {
        this.allVenueWallets.set(wallets);
        this.isAdminLoading.set(false);
      },
      error: (err) => {
        console.error("Error loading venue wallets:", err);
        this.isAdminLoading.set(false);
      }
    });
  }

  registerVenueWallet() {
    const addr = this.newVenueAddress().trim();
    const name = this.newVenueName().trim();
    if (!addr || !name) {
      this.snackBar.open("Completá todos los campos.", "Cerrar", { duration: 3000 });
      return;
    }

    this.isAdminLoading.set(true);
    this.stakingService.registerVenueWallet(addr, name).subscribe({
      next: (res) => {
        this.snackBar.open("Venue Wallet registrada con éxito.", "Cerrar", { duration: 3000 });
        this.newVenueAddress.set("");
        this.newVenueName.set("");
        this.loadVenueWallets();
      },
      error: (err) => {
        console.error("Error registering venue wallet:", err);
        const msg = err.error?.message || "Error al registrar venue wallet.";
        this.snackBar.open(msg, "Cerrar", { duration: 3000 });
        this.isAdminLoading.set(false);
      }
    });
  }

  setVenueFeeExempt(id: number) {
    this.isAdminLoading.set(true);
    this.snackBar.open("Iniciando exención de fee on-chain...", "Cerrar", { duration: 4000 });
    this.stakingService.setVenueWalletFeeExempt(id).subscribe({
      next: (res) => {
        this.snackBar.open("Exención de fee confirmada.", "Cerrar", { duration: 4000 });
        this.loadVenueWallets();
      },
      error: (err) => {
        console.error("Error setting fee exempt:", err);
        const msg = err.error?.message || "Error configurando exención de fee.";
        this.snackBar.open(msg, "Cerrar", { duration: 3000 });
        this.isAdminLoading.set(false);
      }
    });
  }

  resetStakingStep() {
    this.stakingStep.set('idle');
    this.errorMessage.set("");
    this.txHash.set("");
  }
}
