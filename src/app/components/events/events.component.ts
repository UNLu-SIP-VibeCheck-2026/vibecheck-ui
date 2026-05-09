import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { Router } from "@angular/router";
import { EventService } from "../../services/event.service";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startDate: string;
  venue: string;
  imageUrl?: string;
  category: "Próximos eventos" | "Recomendados" | "Cerca tuyo" | "Marketplace";
  // Marketplace fields
  sellerName?: string;
  sellerPhoto?: string;
  price?: number;
  ticketType?: string;
  location?: string;
}

@Component({
  selector: "app-events",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: "./events.component.html",
  styleUrl: "./events.component.scss",
})
export class EventsComponent implements OnInit {
  private router = inject(Router);
  private eventService = inject(EventService);
  private sanitizer = inject(DomSanitizer);

  selectedPill: string = "Próximos eventos";
  searchQuery: string = "";
  allEvents: EventSummary[] = [];
  filteredEvents: EventSummary[] = [];
  pagedEvents: EventSummary[] = [];

  /** Image lookup map id → SafeUrl */
  imageMap = new Map<number, SafeUrl>();

  totalEvents = 0;
  pageSize = 8;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.findAllEvents(0, 100).subscribe({
      next: (page) => {
        console.log("Eventos cargados:", page);
        const categories: (
          | "Próximos eventos"
          | "Recomendados"
          | "Cerca tuyo"
          | "Marketplace"
        )[] = ["Próximos eventos", "Recomendados", "Cerca tuyo", "Marketplace"];
        const sellers = [
          "Juan Perez",
          "Maria Garcia",
          "Carlos Lopez",
          "Ana Martinez",
        ];
        const ticketTypes = ["General", "VIP", "Platea Alta", "Campo"];

        this.allEvents = page.content.map((backendEvent, i) => {
          const category = categories[i % categories.length];
          const event: EventSummary = {
            id: backendEvent.id.toString(),
            title: backendEvent.title,
            description: backendEvent.description || "Sin descripción",
            startDate: new Date(backendEvent.startDate).toLocaleDateString(),
            venue: `Venue ${backendEvent.venueId || "Desconocido"}`,
            category: category,
            imageUrl: undefined, // Se cargará dinámicamente
          };

          if (category === "Marketplace") {
            event.sellerName = sellers[i % sellers.length];
            event.sellerPhoto = `https://i.pravatar.cc/150?u=${event.sellerName}`;
            event.price = 5000 + i * 100;
            event.ticketType = ticketTypes[i % ticketTypes.length];
            event.location = event.venue;
          }

          return event;
        });

        // Cargar imágenes de eventos que tienen imagen
        this.loadEventImages(page.content);
        this.applyFilter();
      },
      error: (err) => console.error("Error fetching events:", err),
    });
  }

  loadEventImages(events: any[]): void {
    events.forEach((event) => {
      if (event.hasImage) {
        this.eventService.getEventImage(event.id).subscribe({
          next: (blob) => {
            const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.imageMap.set(event.id, url);
          },
          error: (err) => console.warn(`Error loading image for event ${event.id}:`, err),
        });
      }
    });
  }

  getEventImage(eventId: string): SafeUrl | null {
    return this.imageMap.get(Number(eventId)) || null;
  }

  selectPill(pill: string): void {
    this.selectedPill = pill;
    this.pageIndex = 0;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredEvents = this.allEvents.filter((e) => {
      const matchesCategory = e.category === this.selectedPill;
      const matchesSearch =
        e.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        e.venue.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
    this.totalEvents = this.filteredEvents.length;
    this.updatePagedEvents();
  }

  updatePagedEvents(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedEvents = this.filteredEvents.slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedEvents();
  }

  navigateToEvent(id: string): void {
    if (this.selectedPill === "Marketplace") {
      this.router.navigate(["/ticket-marketplace", id]);
    } else {
      this.router.navigate(["/event", id]);
    }
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }
}
