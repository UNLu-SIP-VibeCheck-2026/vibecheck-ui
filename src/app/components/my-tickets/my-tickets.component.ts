import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";
import { LoadingStateComponent } from "../shared/loading-state/loading-state.component";
import { EmptyStateComponent } from "../shared/empty-state/empty-state.component";

import { TicketService } from "../../services/ticket.service";
import { TicketResponse } from "../../models/ticket.model";
import { environment } from "../../../environments/environment";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { EventService } from "../../services/event.service";
import { VenueService } from "../../services/venue.service";
import { Observable } from "rxjs";
import { shareReplay } from "rxjs/operators";
import { EventResponse } from "../../models/event.model";
import { VenueResponse } from "../../models/venue.model";

export interface UserTicket {
  id: string;
  eventTitle: string;
  startDate: string;
  venue: string;
  ticketType: string;
  location: string;
  imageUrl?: SafeUrl | string;
  status: string;
}

@Component({
  selector: "app-my-tickets",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: "./my-tickets.component.html",
  styleUrl: "./my-tickets.component.scss",
})
export class MyTicketsComponent implements OnInit {
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private sanitizer = inject(DomSanitizer);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);

  tickets: UserTicket[] = [];
  isLoading: boolean = false;

  private eventCache = new Map<number, Observable<EventResponse>>();
  private venueCache = new Map<number, Observable<VenueResponse>>();

  ngOnInit(): void {
    this.loadTickets();
  }

  private getEvent(eventId: number): Observable<EventResponse> {
    if (!this.eventCache.has(eventId)) {
      this.eventCache.set(
        eventId,
        this.eventService.findByIdEvent(eventId).pipe(shareReplay(1))
      );
    }
    return this.eventCache.get(eventId)!;
  }

  private getVenue(venueId: number): Observable<VenueResponse> {
    if (!this.venueCache.has(venueId)) {
      this.venueCache.set(
        venueId,
        this.venueService.findVenueById(venueId).pipe(shareReplay(1))
      );
    }
    return this.venueCache.get(venueId)!;
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

  loadTickets(): void {
    this.isLoading = true;
    this.ticketService.getMyTickets(0, 50).subscribe({
      next: (page) => {
        this.tickets = page.content.map((t: TicketResponse) => {
          const ticketUI: UserTicket = {
            id: t.id.toString(),
            eventTitle: "Cargando evento...",
            startDate: "Cargando fecha...",
            venue: "Cargando sede...",
            ticketType: t.ticketType.name,
            location: t.ticketType.hasSeats
              ? `Fila ${t.seatRow} - Asiento ${t.seatNumber}`
              : "Entrada General",
            status: t.status,
          };

          // Fetch event details
          this.getEvent(t.ticketType.eventId).subscribe({
            next: (event) => {
              ticketUI.eventTitle = event.title;
              ticketUI.startDate = this.formatDate(event.startDate);
              
              if (event.venueId) {
                this.getVenue(event.venueId).subscribe({
                  next: (venue) => {
                    ticketUI.venue = venue.title;
                  },
                  error: () => {
                    ticketUI.venue = "Dirección no disponible";
                  }
                });
              } else {
                ticketUI.venue = "Sin sede asignada";
              }
            },
            error: () => {
              ticketUI.eventTitle = "Evento ID: " + t.ticketType.eventId;
              ticketUI.startDate = "Válido hasta: " + new Date(t.ticketType.saleEndDate).toLocaleDateString();
              ticketUI.venue = "No se pudo cargar la sede";
            }
          });

          // Fetch event image
          this.eventService.getEventImage(t.ticketType.eventId).subscribe({
            next: (blob) =>
              (ticketUI.imageUrl = this.sanitizer.bypassSecurityTrustUrl(
                URL.createObjectURL(blob),
              )),
            error: (err) =>
              console.error("No image found for event", t.ticketType.eventId),
          });

          return ticketUI;
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error fetching tickets", err);
        this.isLoading = false;
      },
    });
  }

  exploreEvents(): void {
    this.router.navigate(["/"]);
  }

  viewTicket(id: string): void {
    this.router.navigate(["/ticket", id]);
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }
}

