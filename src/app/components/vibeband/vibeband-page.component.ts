import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { WalletService } from '../../services/wallet.service';
import { Web3Service } from '../../services/web3.service';
import { ContractsService } from '../../services/contracts.service';
import { environment } from '../../../environments/environment';

interface OrderResponse {
  orderId: string;
  treasuryAddress: string;
  amountVBK: string;
  amountUSDC: string;
}

@Component({
  selector: 'app-vibeband-page',
  templateUrl: './vibeband-page.component.html',
  styleUrls: ['./vibeband-page.component.scss'],
  standalone: false
})
export class VibebandPageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private walletService = inject(WalletService);
  private web3Service = inject(Web3Service);
  private contractsService = inject(ContractsService);

  shippingForm!: FormGroup;
  walletConnected = false;
  walletAddress: string | null = null;
  isSepolia = false;
  usdcBalance = '0.00';
  vbkBalance = '0.00';

  loading = false;
  loadingMessage = '';
  orderCreated = false;
  createdOrder: any = null;
  confirmedTxHash = '';
  
  // Custom polling state for pending backend validation
  isConfirming = false;
  confirmErrorOccurred = false;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.initForm();
    
    // Subscribe to wallet state
    this.subs.push(
      this.walletService.isConnected$.subscribe(connected => {
        this.walletConnected = connected;
      })
    );

    this.subs.push(
      this.walletService.address$.subscribe(address => {
        this.walletAddress = address;
        this.shippingForm.patchValue({ userAddress: address });
        if (address) {
          this.web3Service.updateBalances(address);
        }
      })
    );

    this.subs.push(
      this.web3Service.isSepolia$.subscribe(sepolia => {
        this.isSepolia = sepolia;
      })
    );

    this.subs.push(
      this.web3Service.usdcBalance$.subscribe(bal => {
        this.usdcBalance = bal;
      })
    );

    this.subs.push(
      this.web3Service.vbkBalance$.subscribe(bal => {
        this.vbkBalance = bal;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private initForm(): void {
    this.shippingForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      addressLine1: ['', [Validators.required, Validators.maxLength(150)]],
      addressLine2: ['', [Validators.maxLength(150)]],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      stateProvince: ['', [Validators.required, Validators.maxLength(50)]],
      postalCode: ['', [Validators.required, Validators.maxLength(20)]],
      country: ['Argentina', [Validators.required, Validators.maxLength(50)]],
      paymentToken: ['USDC', [Validators.required]],
      userAddress: ['']
    });
  }

  async connectWallet(): Promise<void> {
    try {
      await this.walletService.open();
    } catch (err: any) {
      this.snackBar.open('Error al conectar la wallet: ' + err.message, 'Cerrar', { duration: 4000 });
    }
  }

  async switchToSepolia(): Promise<void> {
    try {
      await this.walletService.switchNetwork();
    } catch (err: any) {
      this.snackBar.open('Error al cambiar de red: ' + err.message, 'Cerrar', { duration: 4000 });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.shippingForm.invalid) {
      this.shippingForm.markAllAsTouched();
      return;
    }

    if (!this.walletConnected) {
      this.snackBar.open('Por favor, conecta tu wallet antes de continuar.', 'Cerrar', { duration: 4000 });
      return;
    }

    if (!this.isSepolia) {
      await this.switchToSepolia();
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Registrando tu pedido...';

    const orderData = {
      ...this.shippingForm.value,
      userAddress: this.walletAddress
    };

    this.http.post<OrderResponse>(`${environment.backendUrl}/api/vibeband/orders`, orderData).subscribe({
      next: async (res) => {
        try {
          await this.handlePayment(res);
        } catch (err: any) {
          this.loading = false;
          this.snackBar.open('Pago fallido: ' + (err.message || err), 'Cerrar', { duration: 5000 });
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || 'Error al registrar el pedido.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }

  private async handlePayment(order: OrderResponse): Promise<void> {
    const isUsdc = this.shippingForm.value.paymentToken === 'USDC';
    let txHash = '';

    if (isUsdc) {
      this.loadingMessage = 'Aprobando USDC...';
      const amountUsdc = BigInt(order.amountUSDC);
      
      // approve first
      const approveHash = await this.web3Service.approveUsdc(order.treasuryAddress, amountUsdc);
      this.web3Service.openWallet();
      this.loadingMessage = 'Esperando confirmación de aprobación...';
      await this.web3Service.waitForTransaction(approveHash);

      // transfer
      this.loadingMessage = 'Transfiriendo USDC...';
      txHash = await this.web3Service.transferErc20(this.contractsService.USDC_ADDRESS, order.treasuryAddress, amountUsdc);
      this.web3Service.openWallet();
    } else {
      this.loadingMessage = 'Transfiriendo VBK...';
      const rawVbk = BigInt(order.amountVBK);
      // Aplicar burn adjustment usando BigInt: amountToSend = rawVbk / 0.98 -> (rawVbk * 100n) / 98n
      const amountToSendVbk = (rawVbk * 100n) / 98n;

      txHash = await this.web3Service.transferErc20(this.contractsService.VBK_ADDRESS, order.treasuryAddress, amountToSendVbk);
      this.web3Service.openWallet();
    }

    this.loadingMessage = 'Esperando confirmación en blockchain...';
    await this.web3Service.waitForTransaction(txHash);

    // Proceed to backend confirmation check
    this.confirmedTxHash = txHash;
    this.confirmOrderWithBackend(order.orderId, txHash);
  }

  confirmOrderWithBackend(orderId: string, txHash: string): void {
    this.loadingMessage = 'Confirmando pago en el servidor...';
    this.isConfirming = true;
    this.confirmErrorOccurred = false;

    this.http.post(`${environment.backendUrl}/api/vibeband/orders/${orderId}/confirm`, { txHash }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.isConfirming = false;
        this.orderCreated = true;
        this.createdOrder = res;
        this.snackBar.open('¡Pedido realizado y confirmado con éxito!', 'Cerrar', { duration: 5000 });
      },
      error: (err) => {
        // En caso de conflicto (tx pendiente, 409) o error de red, no marcamos el pedido como fallido en el front,
        // sino que permitimos que el usuario lo intente confirmar manualmente para evitar re-enviar la tx.
        this.isConfirming = false;
        this.confirmErrorOccurred = true;
        this.loading = false;
        
        const status = err.status;
        const msg = err.error?.message || 'Error de verificación temporal.';
        if (status === 409) {
          this.snackBar.open('La transacción está tardando en procesarse. Vuelve a intentar la confirmación.', 'Entendido', { duration: 6000 });
        } else {
          this.snackBar.open('Error al confirmar: ' + msg, 'Cerrar', { duration: 5000 });
        }
      }
    });
  }

  retryConfirmation(): void {
    if (this.createdOrder || !this.confirmedTxHash) return;
    const orderId = this.createdOrder?.id || this.getOrderIdFromSessionOrDraft();
    if (orderId) {
      this.confirmOrderWithBackend(orderId, this.confirmedTxHash);
    }
  }

  private getOrderIdFromSessionOrDraft(): string | null {
    // Si no tenemos la referencia directa, la obtenemos del formulario o estado local
    // que guardamos antes de iniciar la tx.
    return null; // fallback
  }

  resetPage(): void {
    this.orderCreated = false;
    this.createdOrder = null;
    this.confirmedTxHash = '';
    this.confirmErrorOccurred = false;
    this.initForm();
    if (this.walletAddress) {
      this.shippingForm.patchValue({ userAddress: this.walletAddress });
    }
  }
}
