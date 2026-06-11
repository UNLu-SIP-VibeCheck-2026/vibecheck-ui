import { Component, OnInit, inject, signal, effect, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { Web3Service } from "../../services/web3.service";
import { formatUnits, parseUnits } from "viem";

@Component({
  selector: "app-swap",
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: "./swap.component.html",
  styleUrl: "./swap.component.css",
})
export class SwapComponent implements OnInit, OnDestroy {
  web3Service = inject(Web3Service);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Angular Signals for State Management
  activeTab = signal<'buy' | 'sell'>('buy'); // buy: USDC->VBK, sell: VBK->USDC
  usdcAmountInput = signal<string>("");
  vbkAmountInput = signal<string>("");
  
  quotedVbk = signal<bigint | null>(null);
  quotedUsdc = signal<bigint | null>(null);
  isLoadingQuote = signal<boolean>(false);
  
  step = signal<'idle' | 'approving' | 'swapping' | 'success' | 'error'>('idle');
  txHash = signal<string>("");
  receivedAmount = signal<string>("");
  errorMessage = signal<string>("");

  connectedAddress = signal<string | null>(null);
  usdcBalance = signal<string>("0.00");
  vbkBalance = signal<string>("0.00");

  // Timer state
  secondsToRefresh = signal<number>(30);
  private countdownInterval: any = null;

  private quoteTimeout: any = null;
  private addressSub: any = null;
  private usdcSub: any = null;
  private vbkSub: any = null;

  constructor() {
    // Clear inputs and quotes on tab switch
    effect(() => {
      const _ = this.activeTab();
      this.usdcAmountInput.set("");
      this.vbkAmountInput.set("");
      this.quotedVbk.set(null);
      this.quotedUsdc.set(null);
      this.errorMessage.set("");
      this.stopCountdown();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.addressSub = this.web3Service.connectedAddress$.subscribe(addr => {
      this.connectedAddress.set(addr);
    });
    this.usdcSub = this.web3Service.usdcBalance$.subscribe(bal => {
      this.usdcBalance.set(bal);
    });
    this.vbkSub = this.web3Service.vbkBalance$.subscribe(bal => {
      this.vbkBalance.set(bal);
    });
  }

  ngOnDestroy() {
    if (this.addressSub) this.addressSub.unsubscribe();
    if (this.usdcSub) this.usdcSub.unsubscribe();
    if (this.vbkSub) this.vbkSub.unsubscribe();
    if (this.quoteTimeout) clearTimeout(this.quoteTimeout);
    this.stopCountdown();
  }

  // Timer control methods
  startCountdown() {
    this.stopCountdown();
    this.secondsToRefresh.set(30);
    this.countdownInterval = setInterval(() => {
      if (this.step() !== 'idle') {
        this.stopCountdown();
        return;
      }
      
      const hasInput = this.activeTab() === 'buy' ? this.usdcAmountInput() : this.vbkAmountInput();
      if (!hasInput) {
        this.stopCountdown();
        return;
      }

      const currentSec = this.secondsToRefresh();
      if (currentSec <= 1) {
        this.secondsToRefresh.set(30);
        this.refreshQuote();
      } else {
        this.secondsToRefresh.set(currentSec - 1);
      }
    }, 1000);
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  async refreshQuote() {
    this.isLoadingQuote.set(true);
    try {
      if (this.activeTab() === 'buy') {
        const amount = parseFloat(this.usdcAmountInput());
        if (!isNaN(amount) && amount > 0) {
          const quote = await this.web3Service.quoteUsdcToVbk(amount);
          this.quotedVbk.set(quote);
        }
      } else {
        const amount = parseFloat(this.vbkAmountInput());
        if (!isNaN(amount) && amount > 0) {
          const quote = await this.web3Service.quoteVbkToUsdc(amount);
          this.quotedUsdc.set(quote);
        }
      }
    } catch (err) {
      console.error("Error refreshing quote:", err);
    } finally {
      this.isLoadingQuote.set(false);
    }
  }

  // Formatting helpers
  get formattedQuoteVbk(): string {
    const quote = this.quotedVbk();
    return quote ? parseFloat(formatUnits(quote, 18)).toFixed(4) : "0.00";
  }

  get formattedQuoteUsdc(): string {
    const quote = this.quotedUsdc();
    return quote ? parseFloat(formatUnits(quote, 6)).toFixed(2) : "0.00";
  }

  get formattedQuoteUsdcNet(): string {
    const quote = this.quotedUsdc();
    if (!quote) return "0.00";
    const netQuote = (quote * 85n) / 100n; // 15% penalty fee
    return parseFloat(formatUnits(netQuote, 6)).toFixed(2);
  }

  get exchangeRateBuy(): string {
    const quote = this.quotedVbk();
    const amount = parseFloat(this.usdcAmountInput() || "0");
    if (!quote || amount <= 0) return "0.00";
    const rate = formatUnits(quote, 18);
    return (parseFloat(rate) / amount).toFixed(4);
  }

  get exchangeRateSell(): string {
    const quote = this.quotedUsdc();
    const amount = parseFloat(this.vbkAmountInput() || "0");
    if (!quote || amount <= 0) return "0.00";
    const rate = formatUnits(quote, 6);
    return (parseFloat(rate) / amount).toFixed(4);
  }

  get showPriceImpactWarning(): boolean {
    if (this.activeTab() === 'buy') {
      const amt = parseFloat(this.usdcAmountInput() || "0");
      return amt > 50; // 5% of 1000 USDC pool liquidity
    } else {
      const amt = parseFloat(this.vbkAmountInput() || "0");
      return amt > 500; // 5% of 10000 VBK pool liquidity
    }
  }

  onInputUsdc(value: string) {
    this.usdcAmountInput.set(value);
    this.quotedVbk.set(null);
    this.stopCountdown();
    if (this.quoteTimeout) clearTimeout(this.quoteTimeout);

    const amount = parseFloat(value);
    if (!value || isNaN(amount) || amount <= 0) {
      return;
    }

    this.isLoadingQuote.set(true);
    this.quoteTimeout = setTimeout(async () => {
      try {
        const quote = await this.web3Service.quoteUsdcToVbk(amount);
        this.quotedVbk.set(quote);
        this.startCountdown();
      } catch (err) {
        console.error("Error quoting USDC to VBK:", err);
      } finally {
        this.isLoadingQuote.set(false);
      }
    }, 500);
  }

  onInputVbk(value: string) {
    this.vbkAmountInput.set(value);
    this.quotedUsdc.set(null);
    this.stopCountdown();
    if (this.quoteTimeout) clearTimeout(this.quoteTimeout);

    const amount = parseFloat(value);
    if (!value || isNaN(amount) || amount <= 0) {
      return;
    }

    this.isLoadingQuote.set(true);
    this.quoteTimeout = setTimeout(async () => {
      try {
        const quote = await this.web3Service.quoteVbkToUsdc(amount);
        this.quotedUsdc.set(quote);
        this.startCountdown();
      } catch (err) {
        console.error("Error quoting VBK to USDC:", err);
      } finally {
        this.isLoadingQuote.set(false);
      }
    }, 500);
  }

  get isWalletConnected(): boolean {
    return !!this.connectedAddress();
  }

  get isConvertDisabled(): boolean {
    if (!this.isWalletConnected) return true;
    if (this.activeTab() === 'buy') {
      const amt = parseFloat(this.usdcAmountInput() || "0");
      const bal = parseFloat(this.usdcBalance() || "0");
      return isNaN(amt) || amt <= 0 || amt > bal || !this.quotedVbk() || this.isLoadingQuote();
    } else {
      const amt = parseFloat(this.vbkAmountInput() || "0");
      const bal = parseFloat(this.vbkBalance() || "0");
      return isNaN(amt) || amt <= 0 || amt > bal || !this.quotedUsdc() || this.isLoadingQuote();
    }
  }

  async onConvert() {
    const amount = parseFloat(this.usdcAmountInput());
    const balance = parseFloat(this.usdcBalance());
    if (isNaN(amount) || amount <= 0) return;
    if (amount > balance) {
      this.snackBar.open("Saldo de USDC insuficiente.", "Cerrar", { duration: 3000 });
      return;
    }

    this.stopCountdown();
    this.step.set('approving');
    this.errorMessage.set("");
    this.txHash.set("");
    this.receivedAmount.set("");

    try {
      const amountIn = parseUnits(amount.toString(), 6);
      const quoted = this.quotedVbk();
      if (!quoted) throw new Error("No hay cotización disponible.");
      
      const slippagePct = 2;
      const amountOutMin = (quoted * BigInt(100 - slippagePct)) / 100n;
 
      // Step 1: Approve
      await this.web3Service.approveToken(
        this.web3Service.USDC_ADDRESS,
        this.web3Service.UNISWAP_ROUTER_ADDRESS,
        amountIn
      );
 
      // Step 2: Swap
      this.step.set('swapping');
      const userAddr = this.connectedAddress();
      if (!userAddr) throw new Error("Billetera no conectada.");
 
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const hash = await this.web3Service.executeSwap(
        amountIn,
        amountOutMin,
        [this.web3Service.USDC_ADDRESS, this.web3Service.VBK_ADDRESS],
        userAddr,
        deadline
      );
 
      this.txHash.set(hash);
      
      // Extract received VBK amount
      const received = await this.web3Service.getVbkReceivedFromSwap(hash, userAddr);
      this.receivedAmount.set(parseFloat(formatUnits(received, 18)).toFixed(4));
      
      // Update balances
      await this.web3Service.updateBalances(userAddr);
      this.step.set('success');
    } catch (error: any) {
      console.error("Error in swap USDC -> VBK:", error);
      this.handleSwapError(error, 'buy');
    }
  }
 
  async onSell() {
    const amount = parseFloat(this.vbkAmountInput());
    const balance = parseFloat(this.vbkBalance());
    if (isNaN(amount) || amount <= 0) return;
    if (amount > balance) {
      this.snackBar.open("Saldo de VBK insuficiente.", "Cerrar", { duration: 3000 });
      return;
    }
 
    this.stopCountdown();
    this.step.set('approving');
    this.errorMessage.set("");
    this.txHash.set("");
    this.receivedAmount.set("");
 
    try {
      const amountIn = parseUnits(amount.toString(), 18);
      const quoted = this.quotedUsdc();
      if (!quoted) throw new Error("No hay cotización disponible.");
      
      // 15% disincentive fee + 2% slippage
      const afterFee = (quoted * 85n) / 100n;
      const slippagePct = 2;
      const amountOutMin = (afterFee * BigInt(100 - slippagePct)) / 100n;
 
      // Step 1: Approve
      await this.web3Service.approveToken(
        this.web3Service.VBK_ADDRESS,
        this.web3Service.UNISWAP_ROUTER_ADDRESS,
        amountIn
      );
 
      // Step 2: Swap
      this.step.set('swapping');
      const userAddr = this.connectedAddress();
      if (!userAddr) throw new Error("Billetera no conectada.");
 
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const hash = await this.web3Service.executeSwap(
        amountIn,
        amountOutMin,
        [this.web3Service.VBK_ADDRESS, this.web3Service.USDC_ADDRESS],
        userAddr,
        deadline
      );
 
      this.txHash.set(hash);
      
      // Extract received USDC amount
      const received = await this.web3Service.getUsdcReceivedFromSwap(hash, userAddr);
      this.receivedAmount.set(parseFloat(formatUnits(received, 6)).toFixed(2));
      
      // Update balances
      await this.web3Service.updateBalances(userAddr);
      this.step.set('success');
    } catch (error: any) {
      console.error("Error in swap VBK -> USDC:", error);
      this.handleSwapError(error, 'sell');
    }
  }

  private handleSwapError(error: any, operation: 'buy' | 'sell') {
    this.step.set('error');
    if (error.code === 4001 || (error.message && error.message.toLowerCase().includes("user rejected"))) {
      if (this.step() === 'approving') {
        this.errorMessage.set("Aprobación cancelada por el usuario.");
      } else {
        this.errorMessage.set("Swap cancelado por el usuario.");
      }
    } else if (
      error.message &&
      (error.message.includes("INSUFFICIENT_OUTPUT_AMOUNT") || error.message.toLowerCase().includes("revert"))
    ) {
      this.errorMessage.set("El precio del pool cambió demasiado. Intentá de nuevo.");
    } else if (error.reason) {
      this.errorMessage.set(error.reason);
    } else {
      this.errorMessage.set("Ocurrió un error inesperado al procesar la conversión.");
    }
  }

  resetForm() {
    this.stopCountdown();
    this.usdcAmountInput.set("");
    this.vbkAmountInput.set("");
    this.quotedVbk.set(null);
    this.quotedUsdc.set(null);
    this.step.set('idle');
    this.txHash.set("");
    this.receivedAmount.set("");
    this.errorMessage.set("");
  }
}
