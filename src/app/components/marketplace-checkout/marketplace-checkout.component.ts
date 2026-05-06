import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-marketplace-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatRadioModule],
  templateUrl: './marketplace-checkout.component.html',
  styleUrl: './marketplace-checkout.component.scss'
})
export class MarketplaceCheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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
