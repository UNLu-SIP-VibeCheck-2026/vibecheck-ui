import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventService } from '../../services/event.service';
import { VenueService } from '../../services/venue.service';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.scss'
})
export class TicketComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  ticket: any = null;
  isQrVisible = false;

  private ticketService = inject(TicketService);
  private sanitizer = inject(DomSanitizer);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadTicket(id);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try {
      const formatted = new Date(dateStr).toLocaleString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return dateStr;
    }
  }

  loadTicket(id: string | null): void {
    if (!id) return;
    
    this.ticketService.getTicketById(Number(id)).subscribe({
        next: (t) => {
            const qrPayload = JSON.stringify({ ticketId: t.id });

            this.ticket = {
                id: t.id.toString(),
                eventTitle: 'Cargando evento...',
                description: t.ticketType.description,
                startDate: 'Cargando fecha...',
                endDate: 'Cargando fecha...',
                venue: 'Cargando sede...',
                address: 'Cargando dirección...',
                ticketType: t.ticketType.name,
                location: t.ticketType.hasSeats ? `Fila ${t.seatRow} - Asiento ${t.seatNumber}` : 'Entrada General',
                qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`
            };

            // Load event details
            this.eventService.findByIdEvent(t.ticketType.eventId).subscribe({
                next: (event) => {
                    this.ticket.eventTitle = event.title;
                    this.ticket.description = event.description || t.ticketType.description;
                    this.ticket.startDate = this.formatDate(event.startDate);
                    this.ticket.endDate = this.formatDate(event.endDate);
                    
                    if (event.venueId) {
                        this.venueService.findVenueById(event.venueId).subscribe({
                            next: (venue) => {
                                this.ticket.venue = venue.title;
                                this.ticket.address = venue.coordinates || 'Sin dirección registrada';
                            },
                            error: () => {
                                this.ticket.venue = 'Dirección no disponible';
                                this.ticket.address = 'No disponible';
                            }
                        });
                    } else {
                        this.ticket.venue = 'Sin sede asignada';
                        this.ticket.address = 'No disponible';
                    }
                },
                error: (err) => {
                    this.ticket.eventTitle = 'Evento ID: ' + t.ticketType.eventId;
                    this.ticket.startDate = this.formatDate(t.ticketType.saleStartDate);
                    this.ticket.endDate = this.formatDate(t.ticketType.saleEndDate);
                    this.ticket.venue = 'No disponible';
                    this.ticket.address = 'No disponible';
                }
            });
            
            this.eventService.getEventImage(t.ticketType.eventId).subscribe({
                next: (blob) => this.ticket.imageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
                error: (err) => console.error("No image found for event", t.ticketType.eventId)
            });
        },
        error: (err) => {
            console.error('Error fetching ticket', err);
        }
    });
  }

  toggleQR(): void {
    this.isQrVisible = !this.isQrVisible;
  }

  giftTicket(): void {
    this.router.navigate(['/gift-ticket', this.ticket.id]);
  }

  resellTicket(): void {
    this.router.navigate(['/resell-ticket', this.ticket.id]);
  }

  goBack(): void {
    this.router.navigate(['/my-tickets']);
  }
}

