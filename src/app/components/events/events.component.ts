import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from "@angular/core";
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
import { LoadingStateComponent } from "../shared/loading-state/loading-state.component";
import { EmptyStateComponent } from "../shared/empty-state/empty-state.component";
import { trackLoading } from "../../utils/loading.operator";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  venue: string;
  capacity?: number;
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
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: "./events.component.html",
  styleUrl: "./events.component.scss",
})
export class EventsComponent implements OnInit, OnDestroy {
  @ViewChild('midCarousel', { read: ElementRef }) midCarousel?: ElementRef<HTMLDivElement>;
  @ViewChild('miniCarousel', { read: ElementRef }) miniCarousel?: ElementRef<HTMLDivElement>;

  // ---- Carousels (sample data for preview) ----
  tier1Events: EventSummary[] = [];
  tier2Events: EventSummary[] = [];
  tier3Events: EventSummary[] = [];

  // Carousel state
  currentIndex1: number = 0;
  private carouselTimer1: any;
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private eventService = inject(EventService);
  private sanitizer = inject(DomSanitizer);

  isLoading: boolean = false;
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
    this.createSampleTiers();
    this.startCarousel1();
    this.loadEvents();
  }

  ngOnDestroy(): void {
    if (this.carouselTimer1) {
      clearInterval(this.carouselTimer1);
    }
  }

  createSampleTiers(): void {
    // Tier 1: large showcased events (one per viewport)
    this.tier1Events = [
      {
        id: 's1-1',
        title: 'Neon Nights - Live DJ',
        description: 'Una noche de música electrónica con invitados especiales.',
        startDate: '10/06/2026 21:00',
        endDate: '10/06/2026 23:30',
        venue: 'Club Aurora',
        capacity: 1500,
        imageUrl: 'https://picsum.photos/id/1011/1600/900',
        category: 'Recomendados',
        price: 3500,
      },
      {
        id: 's1-2',
        title: 'Indie Summer Fest',
        description: 'Bandas locales e internacionales en 2 escenarios.',
        startDate: '21/06/2026 18:30',
        endDate: '21/06/2026 23:00',
        venue: 'Parque Central',
        capacity: 8200,
        imageUrl: 'https://picsum.photos/id/1018/1600/900',
        category: 'Recomendados',
        price: 4200,
      },
      {
        id: 's1-3',
        title: 'Classical Under Stars',
        description: 'Orquesta sinfónica al aire libre.',
        startDate: '05/07/2026 20:00',
        endDate: '05/07/2026 22:45',
        venue: 'Teatro al Aire Libre',
        capacity: 5400,
        imageUrl: 'https://picsum.photos/id/1025/1600/900',
        category: 'Recomendados',
        price: 2800,
      },
    ];

    // Tier 2: mid-sized cards (3 per viewport)
    this.tier2Events = Array.from({ length: 9 }).map((_, i) => ({
      id: `s2-${i}`,
      title: `Evento ${i + 1}`,
      description: 'Descripción breve del evento.',
      startDate: `0${(i % 9) + 1}/07/2026`,
      venue: `Venue ${i + 1}`,
      imageUrl: `https://picsum.photos/seed/s2-${i}/600/400`,
      category: 'Próximos eventos',
      price: 1500 + i * 200,
    }));

    // Tier 3: mini cards (only images, 6 per viewport)
    this.tier3Events = Array.from({ length: 12 }).map((_, i) => ({
      id: `s3-${i}`,
      title: `Mini ${i + 1}`,
      description: '',
      startDate: `07/${(i % 30) + 1}/2026`,
      venue: `Venue ${i + 1}`,
      imageUrl: `https://picsum.photos/seed/s3-${i}/400/400`,
      category: 'Cerca tuyo',
    }));
  }

  startCarousel1(): void {
    if (this.tier1Events.length <= 1) return;
    this.carouselTimer1 = setInterval(() => {
      this.nextTier1();
    }, 3000);
  }

  prevTier1(): void {
    if (this.tier1Events.length <= 1) return;
    this.currentIndex1 = (this.currentIndex1 + this.tier1Events.length - 1) % this.tier1Events.length;
  }

  nextTier1(): void {
    if (this.tier1Events.length <= 1) return;
    this.currentIndex1 = (this.currentIndex1 + 1) % this.tier1Events.length;
  }

  private scrollContainer(carousel?: ElementRef<HTMLDivElement>, direction: number = 1): void {
    if (!carousel) return;
    const container = carousel.nativeElement;
    const distance = container.clientWidth * direction;

    container.scrollBy({
      left: distance,
      behavior: 'smooth',
    });
  }

  scrollTier2(direction: number): void {
    this.scrollContainer(this.midCarousel, direction);
  }

  scrollTier3(direction: number): void {
    this.scrollContainer(this.miniCarousel, direction);
  }

  loadEvents(): void {
    this.eventService.findAllEvents(0, 100)
      .pipe(trackLoading((loading) => (this.isLoading = loading)))
      .subscribe({
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
        error: (err) =>  this.snackBar.open(err?.error?.message || "Error fetching events:", "Cerrar", { duration: 4000 }),
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
          error: (err) =>  this.snackBar.open(err?.error?.message || "Ocurrió un error", "Cerrar", { duration: 4000 }),
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
