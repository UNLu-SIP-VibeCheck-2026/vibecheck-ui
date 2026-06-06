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
import { AdvertisementService } from "../../services/advertisement.service";
import { CategoryService } from "../../services/category.service";
import { VenueService } from "../../services/venue.service";
import { CategoryResponse } from "../../models/category.model";
import { VenueResponse } from "../../models/venue.model";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { LoadingStateComponent } from "../shared/loading-state/loading-state.component";
import { EmptyStateComponent } from "../shared/empty-state/empty-state.component";
import { trackLoading } from "../../utils/loading.operator";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatSelectModule } from "@angular/material/select";

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  venue: string;
  venueId?: number;
  capacity?: number;
  imageUrl?: any;
  categoryIds?: number[];
  realCategories?: string[];
  advertisementLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  advertisementPlanId?: number;
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
    MatSelectModule,
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
  rawTier1Events: EventSummary[] = [];
  rawTier2Events: EventSummary[] = [];
  rawTier3Events: EventSummary[] = [];

  tier1Events: EventSummary[] = [];
  tier2Events: EventSummary[] = [];
  tier3Events: EventSummary[] = [];

  // Carousel state
  currentIndex1: number = 0;
  private carouselTimer1: any;
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private eventService = inject(EventService);
  private advertisementService = inject(AdvertisementService);
  private categoryService = inject(CategoryService);
  private venueService = inject(VenueService);
  private sanitizer = inject(DomSanitizer);

  // Configurable limits for tier promotions
  readonly TIER1_LIMIT = 5;
  readonly TIER2_LIMIT = 15;
  readonly TIER3_LIMIT = 20;

  isLoading: boolean = false;
  viewMode: 'carousel' | 'grid' = 'carousel';
  searchQuery: string = "";
  categories: CategoryResponse[] = [];
  selectedCategoryId: number | null = null;
  allEvents: EventSummary[] = [];
  filteredEvents: EventSummary[] = [];
  pagedEvents: EventSummary[] = [];

  /** Image lookup map id → SafeUrl */
  imageMap = new Map<number, SafeUrl>();

  /** Venue lookup map id → VenueResponse */
  venueMap = new Map<number, VenueResponse>();

  totalEvents = 0;
  pageSize = 8;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadVenues();
    this.loadCategories();
    this.loadEvents();
    this.loadPromotedEvents();
  }

  ngOnDestroy(): void {
    if (this.carouselTimer1) {
      clearInterval(this.carouselTimer1);
    }
  }

  loadVenues(): void {
    this.venueService.findAllVenues(0, 500).subscribe({
      next: (page) => {
        this.venueMap.clear();
        page.content.forEach((v) => this.venueMap.set(v.id, v));
      },
      error: (err) => console.error("Error loading venues:", err)
    });
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
      },
      error: (err) => console.error("Error loading categories:", err)
    });
  }

  onCategoryChange(): void {
    this.pageIndex = 0;
    this.loadEvents();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'carousel' ? 'grid' : 'carousel';
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
    this.eventService.findAllEvents(0, 100, this.selectedCategoryId || undefined, ['startDate,asc'])
      .pipe(trackLoading((loading) => (this.isLoading = loading)))
      .subscribe({
        next: (page) => {
          console.log("Eventos cargados:", page);
          this.allEvents = page.content.map((backendEvent) => {
            return {
              id: backendEvent.id.toString(),
              title: backendEvent.title,
              description: backendEvent.description || "Sin descripción",
              startDate: new Date(backendEvent.startDate).toLocaleDateString(),
              venue: this.getVenueName(backendEvent.venueId),
              venueId: backendEvent.venueId,
              capacity: backendEvent.capacity,
              categoryIds: backendEvent.categories ? backendEvent.categories.map(c => c.id) : [],
              realCategories: backendEvent.categories ? backendEvent.categories.map(c => c.name) : [],
              imageUrl: undefined,
              advertisementPlanId: backendEvent.advertisementPlanId
            };
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

  getVenueName(venueId: number | null | undefined): string {
    if (!venueId) return "Sin venue";
    const v = this.venueMap.get(venueId);
    return v ? v.title : `Venue #${venueId}`;
  }

  applyFilter(): void {
    const sQuery = this.searchQuery.toLowerCase();
    
    // Filter grid data
    this.filteredEvents = this.allEvents.filter((e) => {
      const matchSearch = e.title.toLowerCase().includes(sQuery) || e.venue.toLowerCase().includes(sQuery);
      return matchSearch;
    });
    this.totalEvents = this.filteredEvents.length;
    this.updatePagedEvents();
    
    // Filter carousel data
    const filterCarousel = (raw: EventSummary[]) => raw.filter(e => {
      const matchSearch = e.title.toLowerCase().includes(sQuery) || e.venue.toLowerCase().includes(sQuery);
      const matchCat = this.selectedCategoryId ? e.categoryIds?.includes(this.selectedCategoryId) : true;
      return matchSearch && matchCat;
    });
    
    this.tier1Events = filterCarousel(this.rawTier1Events);
    this.tier2Events = filterCarousel(this.rawTier2Events);
    this.tier3Events = filterCarousel(this.rawTier3Events);
    this.currentIndex1 = 0;
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
    this.router.navigate(["/event", id]);
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }

  loadPromotedEvents(): void {
    this.eventService.getUpcomingPromotedEventsGroupedByTier().subscribe({
      next: (grouped) => {
        console.log("Promoted events grouped by tier loaded:", grouped);

        const mapBackendEvent = (backendEvent: any, level: 'HIGH' | 'MEDIUM' | 'LOW'): EventSummary => {
          return {
            id: backendEvent.id.toString(),
            title: backendEvent.title,
            description: backendEvent.description || "Sin descripción",
            startDate: new Date(backendEvent.startDate).toLocaleDateString(),
            endDate: backendEvent.endDate ? new Date(backendEvent.endDate).toLocaleDateString() : undefined,
            venue: this.getVenueName(backendEvent.venueId),
            venueId: backendEvent.venueId,
            capacity: backendEvent.capacity,
            categoryIds: backendEvent.categories ? backendEvent.categories.map((c: any) => c.id) : [],
            realCategories: backendEvent.categories ? backendEvent.categories.map((c: any) => c.name) : [],
            imageUrl: undefined,
            advertisementLevel: level,
            advertisementPlanId: backendEvent.advertisementPlanId
          };
        };

        const sortByDateAsc = (a: any, b: any) => {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        };

        const highEvents = (grouped['high'] || grouped['premium'] || grouped['mega'] || [])
          .sort(sortByDateAsc)
          .slice(0, this.TIER1_LIMIT)
          .map((e) => mapBackendEvent(e, 'HIGH'));

        const mediumEvents = (grouped['medium'] || grouped['destacado'] || grouped['super'] || [])
          .sort(sortByDateAsc)
          .slice(0, this.TIER2_LIMIT)
          .map((e) => mapBackendEvent(e, 'MEDIUM'));

        const lowEvents = (grouped['low'] || grouped['básico'] || grouped['cool'] || [])
          .sort(sortByDateAsc)
          .slice(0, this.TIER3_LIMIT)
          .map((e) => mapBackendEvent(e, 'LOW'));

        this.rawTier1Events = highEvents;
        this.rawTier2Events = mediumEvents;
        this.rawTier3Events = lowEvents;
        
        this.applyFilter();

        const allPromotedRaw = [
          ...(grouped['high'] || grouped['premium'] || grouped['mega'] || []),
          ...(grouped['medium'] || grouped['destacado'] || grouped['super'] || []),
          ...(grouped['low'] || grouped['básico'] || grouped['cool'] || [])
        ];

        this.loadPromotedEventImages(allPromotedRaw);
        this.startCarousel1();
      },
      error: (err) => {
        console.error("Error loading promoted events:", err);
      }
    });
  }

  loadPromotedEventImages(rawEvents: any[]): void {
    rawEvents.forEach((raw) => {
      if (raw.hasImage) {
        this.eventService.getEventImage(raw.id).subscribe({
          next: (blob) => {
            const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.imageMap.set(raw.id, url);

            const idStr = raw.id.toString();
            const t1 = this.tier1Events.find(e => e.id === idStr);
            if (t1) t1.imageUrl = url;
            const t2 = this.tier2Events.find(e => e.id === idStr);
            if (t2) t2.imageUrl = url;
            const t3 = this.tier3Events.find(e => e.id === idStr);
            if (t3) t3.imageUrl = url;
          },
          error: (err) => console.warn(`Error loading image for promoted event ${raw.id}:`, err)
        });
      }
    });
  }
}
