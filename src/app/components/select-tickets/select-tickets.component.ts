import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-select-tickets',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatSelectModule, 
    MatInputModule,
    MatRadioModule
  ],
  templateUrl: './select-tickets.component.html',
  styleUrls: ['./select-tickets.component.scss']
})
export class SelectTicketsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  event: any = null;
  ticketTypes = [
    { 
      id: 1, 
      name: 'General', 
      price: 5000, 
      maxResalePrice: 6000, 
      location: 'Campo General', 
      status: 'AVAILABLE', 
      quantity: 0 
    },
    { 
      id: 2, 
      name: 'VIP Platino', 
      price: 15000, 
      maxResalePrice: 18000, 
      location: 'Sector VIP Front', 
      status: 'AVAILABLE', 
      quantity: 0 
    },
    { 
      id: 3, 
      name: 'Palco Preferencial', 
      price: 25000, 
      maxResalePrice: 30000, 
      location: 'Palcos Nivel 1', 
      status: 'SOLD_OUT', 
      quantity: 0 
    }
  ];

  paymentMethods = [
    { id: 'vbk', name: '$VBK', enabled: true },
    { id: 'mp', name: 'Mercado Pago', enabled: false },
    { id: 'other', name: 'Otro', enabled: false }
  ];

  selectedPaymentMethod = 'vbk';
  serviceChargeRate = 0.10; // 10%

  ngOnInit() {
    window.scrollTo(0, 0);
    const id = this.route.snapshot.paramMap.get('id');
    // Mock event data (reduced version)
    this.event = {
      id: id || 'EVENTO001',
      title: 'VibeCheck Festival 2026',
      description: 'El evento más esperado del año llega a Buenos Aires. Una noche llena de música, arte y tecnología.',
      startDate: '15/05/2026',
      endDate: '16/05/2026',
      venue: 'Estadio Vibe',
      image: null // Placeholder handled in template
    };
  }

  get subtotal() {
    return this.ticketTypes.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0);
  }

  get serviceCharge() {
    return this.subtotal * this.serviceChargeRate;
  }

  get total() {
    return this.subtotal + this.serviceCharge;
  }

  get canPay() {
    return this.subtotal > 0 && this.selectedPaymentMethod === 'vbk';
  }

  incrementQuantity(ticket: any) {
    if (ticket.status === 'AVAILABLE') {
      ticket.quantity++;
    }
  }

  decrementQuantity(ticket: any) {
    if (ticket.quantity > 0) {
      ticket.quantity--;
    }
  }

  processPayment() {
    if (this.canPay) {
      console.log('Processing payment for:', this.total, 'using', this.selectedPaymentMethod);
      // Logic for payment would go here
      alert(`Pago procesado con éxito por un total de ${this.total} $VBK`);
      this.router.navigate(['/dashboard']);
    }
  }

  goBack() {
    this.router.navigate(['/event', this.event.id]);
  }
}
