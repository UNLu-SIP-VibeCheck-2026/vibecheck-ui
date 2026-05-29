import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';

import { TicketService } from '../../services/ticket.service';
import { TicketResponse } from '../../models/ticket.model';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventService } from '../../services/event.service';

export interface UserTicket {
  id: string;
  eventTitle: string;
  startDate: string;
  venue: string;
  ticketType: string;
  location: string;
  imageUrl?: SafeUrl | string;
}

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule,
    LoadingStateComponent,
    EmptyStateComponent
  ],
  templateUrl: './my-tickets.component.html',
  styleUrl: './my-tickets.component.scss'
})
export class MyTicketsComponent implements OnInit {
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private sanitizer = inject(DomSanitizer);
  private eventService = inject(EventService);
  
  tickets: UserTicket[] = [];
  isLoading: boolean = false;

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.isLoading = true;
    this.ticketService.getMyTickets(0, 50).subscribe({
      next: (page) => {
        this.tickets = page.content.map((t: TicketResponse) => {
          const ticketUI: UserTicket = {
            id: t.id.toString(),
            eventTitle: 'Evento ID: ' + t.ticketType.eventId,
            startDate: 'Válido hasta: ' + new Date(t.ticketType.saleEndDate).toLocaleDateString(),
            venue: 'Sede ID a confirmar',
            ticketType: t.ticketType.name,
            location: t.ticketType.hasSeats ? `Fila ${t.seatRow} - Asiento ${t.seatNumber}` : 'Entrada General'
          };
          
          this.eventService.getEventImage(t.ticketType.eventId).subscribe({
              next: (blob) => ticketUI.imageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
              error: (err) => console.error("No image found for event", t.ticketType.eventId)
          });
          
          return ticketUI;
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching tickets', err);
        this.isLoading = false;
      }
    });
  }

  exploreEvents(): void {
    this.router.navigate(['/']);
  }

  viewTicket(id: string): void {
    this.router.navigate(['/ticket', id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
