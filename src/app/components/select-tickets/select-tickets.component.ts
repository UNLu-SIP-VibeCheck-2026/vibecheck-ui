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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';

import { EventService } from '../../services/event.service';
import { TicketTypeService } from '../../services/ticket-type.service';
import { EventResponse } from '../../models/event.model';
import { TicketTypeResponse } from '../../models/ticket-type.model';
import { environment } from '../../../environments/environment';

export interface TicketTypeUI extends TicketTypeResponse {
  quantity: number;
  status: string;
}

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
    MatRadioModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './select-tickets.component.html',
  styleUrls: ['./select-tickets.component.scss']
})
export class SelectTicketsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventService = inject(EventService);
  private ticketTypeService = inject(TicketTypeService);

  event: (EventResponse & { image?: string | null }) | null = null;
  ticketTypes: TicketTypeUI[] = [];
  
  isLoading = true;
  errorMessage = '';

  paymentMethods = [
    { id: 'vbk', name: '$VBK', enabled: true },
    { id: 'mp', name: 'Mercado Pago', enabled: false },
    { id: 'other', name: 'Otro', enabled: false }
  ];

  selectedPaymentMethod = 'vbk';
  serviceChargeRate = 0.10; // 10%

  ngOnInit() {
    window.scrollTo(0, 0);
    const idParam = this.route.snapshot.paramMap.get('id');
    const eventId = idParam ? parseInt(idParam, 10) : null;

    if (!eventId || isNaN(eventId)) {
      this.errorMessage = 'ID de evento inválido.';
      this.isLoading = false;
      return;
    }

    this.loadEventData(eventId);
  }

  loadEventData(eventId: number) {
    this.isLoading = true;
    this.errorMessage = '';

    this.eventService.findByIdEvent(eventId).subscribe({
      next: (eventData) => {
        this.event = {
          ...eventData,
          image: eventData.hasImage ? `${environment.apiBaseUrl}/events/${eventId}/image` : null
        };
        this.loadTicketTypes(eventId);
      },
      error: (err) => {
        console.error('Error fetching event', err);
        this.errorMessage = 'No se pudo cargar la información del evento.';
        this.isLoading = false;
      }
    });
  }

  loadTicketTypes(eventId: number) {
    this.ticketTypeService.findTicketTypesByEvent(eventId).subscribe({
      next: (tickets) => {
        this.ticketTypes = tickets.map(ticket => ({
          ...ticket,
          quantity: 0,
          status: ticket.active ? 'AVAILABLE' : 'SOLD_OUT'
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching ticket types', err);
        this.errorMessage = 'No se pudieron cargar los tipos de tickets.';
        this.isLoading = false;
      }
    });
  }

  get subtotal() {
    return this.ticketTypes.reduce((sum, ticket) => sum + (ticket.priceUsdt * ticket.quantity), 0);
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

  incrementQuantity(ticket: TicketTypeUI) {
    if (ticket.status === 'AVAILABLE') {
      if (ticket.maxPerUser && ticket.quantity >= ticket.maxPerUser) {
          // Maximum tickets per user reached
          return;
      }
      ticket.quantity++;
    }
  }

  decrementQuantity(ticket: TicketTypeUI) {
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
    if (this.event) {
      this.router.navigate(['/event', this.event.id]);
    } else {
      this.router.navigate(['/events']);
    }
  }
}
