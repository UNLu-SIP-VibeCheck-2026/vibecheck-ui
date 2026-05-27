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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadTicket(id);
  }

  private ticketService = inject(TicketService);
  private sanitizer = inject(DomSanitizer);
  private eventService = inject(EventService);

  loadTicket(id: string | null): void {
    if (!id) return;
    
    this.ticketService.getTicketById(Number(id)).subscribe({
        next: (t) => {
            this.ticket = {
                id: t.id.toString(),
                eventTitle: 'Evento ID: ' + t.ticketType.eventId,
                description: t.ticketType.description,
                startDate: new Date(t.ticketType.saleStartDate).toLocaleDateString(),
                endDate: new Date(t.ticketType.saleEndDate).toLocaleDateString(),
                venue: 'Sede a confirmar',
                address: 'Dirección a confirmar',
                ticketType: t.ticketType.name,
                location: t.ticketType.hasSeats ? `Fila ${t.seatRow} - Asiento ${t.seatNumber}` : 'Entrada General',
                qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${t.token || 'VIBECHECK-' + t.id}`
            };
            
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
