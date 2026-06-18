import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-marketplace-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './marketplace-checkout.component.html',
  styleUrl: './marketplace-checkout.component.scss'
})
export class MarketplaceCheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  ticket: any = null;
  paymentMethods = [
    { id: 'vbk', name: 'Billetera VibeCheck ($VBK)', icon: 'account_balance_wallet', available: true },
    { id: 'mp', name: 'Mercado Pago', icon: 'payments', available: false },
    { id: 'other', name: 'Otro método', icon: 'credit_card', available: false }
  ];
  selectedPaymentMethod = 'vbk';
  serviceFeeRate = 0.10;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.checkRoleAndLoad(id);
  }

  private checkRoleAndLoad(id: string | null): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUserValue();
      const currentRole = user?.role?.toLowerCase() || '';
      const isClient = currentRole === 'cliente' || currentRole === 'comprar' || currentRole === 'user';

      if (!isClient) {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          width: '400px',
          disableClose: true,
          data: {
            title: 'Cambiar rol a Cliente',
            message: 'Para comprar entradas necesitas estar en tu rol de Cliente. ¿Querés cambiar tu rol ahora?',
            confirmText: 'Sí, cambiar',
            cancelText: 'Cancelar',
            success: true
          }
        });

        dialogRef.afterClosed().subscribe(confirmed => {
          if (confirmed) {
            this.authService.switchUserRole('cliente').subscribe({
              next: () => {
                this.snackBar.open('Rol cambiado a Cliente con éxito', 'Cerrar', { duration: 3000 });
                this.loadTicket(id);
              },
              error: (err) => {
                console.error('Error changing role:', err);
                alert('No se pudo cambiar el rol. Intentá de nuevo.');
                this.goBack();
              }
            });
          } else {
            this.goBack();
          }
        });
        return;
      }
    }

    this.loadTicket(id);
  }

  loadTicket(id: string | null): void {
    // Mock data for checkout
    this.ticket = {
      id: id || 'TICK-M-001',
      eventTitle: 'Quilmes Rock 2027',
      venue: 'Estadio Velez',
      startDate: '15/05/2026',
      ticketType: 'VIP Platino',
      location: 'Sector VIP Front',
      price: 15500,
      imageUrl: 'https://picsum.photos/seed/rock-pay/400/400'
    };
  }

  get subtotal(): number {
    return this.ticket ? this.ticket.price : 0;
  }

  get serviceFee(): number {
    return this.subtotal * this.serviceFeeRate;
  }

  get total(): number {
    return this.subtotal + this.serviceFee;
  }

  processPayment(): void {
    alert(`Procesando pago de ${this.total} $VBK...`);
    this.router.navigate(['/my-tickets']);
  }

  goBack(): void {
    window.history.back();
  }
}
