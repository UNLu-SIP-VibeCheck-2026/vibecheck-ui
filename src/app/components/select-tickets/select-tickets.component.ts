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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SeatSelectionDialogComponent } from '../shared/dialogs/seat-selection-dialog/seat-selection-dialog.component';
import { ErrorDialogComponent } from '../shared/dialogs/error-dialog/error-dialog.component';
import { forkJoin } from 'rxjs';
import { TicketService } from '../../services/ticket.service';
import { TicketBuyRequest, SeatSelection } from '../../models/ticket.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

export interface TicketTypeUI extends TicketTypeResponse {
  quantity: number;
  status: string;
  selectedSeats?: SeatSelection[];
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
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './select-tickets.component.html',
  styleUrls: ['./select-tickets.component.scss']
})
export class SelectTicketsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventService = inject(EventService);
  private ticketTypeService = inject(TicketTypeService);
  private ticketService = inject(TicketService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  event: (EventResponse & { image?: SafeUrl | null }) | null = null;
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
          image: null
        };
        if (eventData.hasImage) {
            this.eventService.getEventImage(eventId).subscribe({
                next: (blob) => {
                    if (this.event) {
                        this.event.image = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
                    }
                },
                error: (err) => console.error('No image for event', err)
            });
        }
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
    return this.ticketTypes.reduce((sum, ticket) => sum + (ticket.priceUsdc * ticket.quantity), 0);
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
    if (ticket.status !== 'AVAILABLE') return;
    if (ticket.maxPerUser && ticket.quantity >= ticket.maxPerUser) return;
    
    if (ticket.hasSeats) {
        const dialogRef = this.dialog.open(SeatSelectionDialogComponent, {
            width: '400px',
            data: {
                firstRow: ticket.firstRow || 1,
                lastRow: ticket.lastRow || 1,
                firstSeat: ticket.firstSeat || 1,
                lastSeat: ticket.lastSeat || 1
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const alreadySelected = ticket.selectedSeats?.some(s => s.row === result.row && s.number === result.number);
                if (alreadySelected) {
                    this.snackBar.open('Ya seleccionaste este asiento', 'Cerrar', { duration: 3000 });
                    return;
                }
                
                ticket.selectedSeats = ticket.selectedSeats || [];
                ticket.selectedSeats.push(result);
                ticket.quantity++;
            }
        });
    } else {
        ticket.quantity++;
    }
  }

  decrementQuantity(ticket: TicketTypeUI) {
    if (ticket.quantity > 0) {
      if (ticket.hasSeats && ticket.selectedSeats && ticket.selectedSeats.length > 0) {
          ticket.selectedSeats.pop();
      }
      ticket.quantity--;
    }
  }

  processPayment() {
    if (!this.canPay) return;
    
    this.isLoading = true;
    
    const requests = this.ticketTypes
        .filter(t => t.quantity > 0)
        .map(t => {
            const req: TicketBuyRequest = {
                ticketTypeId: t.id,
                quantity: t.hasSeats ? null : t.quantity,
                seats: t.hasSeats ? t.selectedSeats : null
            };
            return this.ticketService.buyTickets(req);
        });

    if (requests.length === 0) {
        this.isLoading = false;
        return;
    }

    forkJoin(requests).subscribe({
        next: () => {
            this.snackBar.open(`Pago procesado con éxito por un total de ${this.total} $VBK`, 'Cerrar', { duration: 3000 });
            this.router.navigate(['/my-tickets']);
        },
        error: (err) => {
            console.error('Error procesando el pago', err);
            const errorMsg = err.error?.message || 'Error al procesar el pago. Por favor, intente nuevamente.';
            
            this.dialog.open(ErrorDialogComponent, {
                width: '400px',
                panelClass: 'vibe-dialog-container',
                data: {
                    title: 'No se pudo completar la compra',
                    message: errorMsg
                }
            });
            this.isLoading = false;
        }
    });
  }

  goBack() {
    if (this.event) {
      this.router.navigate(['/event', this.event.id]);
    } else {
      this.router.navigate(['/events']);
    }
  }
}
