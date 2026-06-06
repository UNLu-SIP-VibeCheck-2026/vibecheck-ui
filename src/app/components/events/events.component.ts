import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed, effect } from "@angular/core";
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
import { trigger, transition, style, animate, query, stagger } from "@angular/animations";

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
  animations: [
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(24px)' }),
          stagger('40ms', [
            animate('350ms cubic-bezier(0.25, 1, 0.5, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class EventsComponent implements OnInit, OnDestroy {
  @ViewChild('midCarousel', { read: ElementRef }) midCarousel?: ElementRef<HTMLDivElement>;
  @ViewChild('miniCarousel', { read: ElementRef }) miniCarousel?: ElementRef<HTMLDivElement>;

  // Writable Signals for raw data
  rawTier1Events = signal<EventSummary[]>([]);
  rawTier2Events = signal<EventSummary[]>([]);
  rawTier3Events = signal<EventSummary[]>([]);
  allEvents = signal<EventSummary[]>([]);

  // Carousel state using Writable Signal
  currentIndex1 = signal<number>(0);
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

  // Reactivity State with Signals
  isLoading = signal<boolean>(false);
  viewMode = signal<'carousel' | 'grid'>('carousel');
  searchQuery = signal<string>("");
  categories = signal<CategoryResponse[]>([]);
  selectedCategoryId = signal<number | null>(null);

  /** Image lookup map id → SafeUrl, as a Signal to trigger UI updates reactively */
  imageMap = signal<Map<number, SafeUrl>>(new Map<number, SafeUrl>());

  /** Venue lookup map id → VenueResponse */
  venueMap = new Map<number, VenueResponse>();

  // Pagination Signals
  pageSize = signal<number>(8);
  pageIndex = signal<number>(0);

  // Computed Signals for filtered lists (decouples manual triggering of filtering logic)
  tier1Events = computed(() => this.filterCarousel(this.rawTier1Events()));
  tier2Events = computed(() => this.filterCarousel(this.rawTier2Events()));
  tier3Events = computed(() => this.filterCarousel(this.rawTier3Events()));

  filteredEvents = computed(() => {
    const queryStr = this.searchQuery().toLowerCase();
    return this.allEvents().filter((e) => {
      return e.title.toLowerCase().includes(queryStr) || e.venue.toLowerCase().includes(queryStr);
    });
  });

  pagedEvents = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredEvents().slice(start, end);
  });

  totalEvents = computed(() => this.filteredEvents().length);

  constructor() {
    // Automatically manage Carousel 1 timer based on tier1Events signal
    effect(() => {
      const events = this.tier1Events();
      this.currentIndex1.set(0); // Reset index on list changes
      if (events.length > 1) {
        this.startCarousel1();
      } else {
        if (this.carouselTimer1) {
          clearInterval(this.carouselTimer1);
        }
      }
    });
  }

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
        // Refresh event venue names once venues are loaded
        if (this.allEvents().length > 0) {
          this.refreshVenueNames();
        }
      },
      error: (err) => console.error("Error loading venues:", err)
    });
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
      },
      error: (err) => console.error("Error loading categories:", err)
    });
  }

  onCategoryChange(): void {
    this.pageIndex.set(0);
    this.loadEvents();
  }

  toggleViewMode(): void {
    this.viewMode.update(mode => mode === 'carousel' ? 'grid' : 'carousel');
  }

  startCarousel1(): void {
    if (this.carouselTimer1) {
      clearInterval(this.carouselTimer1);
    }
    this.carouselTimer1 = setInterval(() => {
      this.nextTier1();
    }, 4000); // 4s allows cleaner readability of large items
  }

  prevTier1(): void {
    const len = this.tier1Events().length;
    if (len <= 1) return;
    this.currentIndex1.update(idx => (idx + len - 1) % len);
  }

  nextTier1(): void {
    const len = this.tier1Events().length;
    if (len <= 1) return;
    this.currentIndex1.update(idx => (idx + 1) % len);
  }

  private scrollContainer(carousel?: ElementRef<HTMLDivElement>, direction: number = 1): void {
    if (!carousel) return;
    const container = carousel.nativeElement;
    const distance = container.clientWidth * direction * 0.85; // slightly less scroll distance for smoother feel

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
    this.eventService.findAllEvents(0, 100, this.selectedCategoryId() || undefined, ['startDate,asc'])
      .pipe(trackLoading((loading) => this.isLoading.set(loading)))
      .subscribe({
        next: (page) => {
          const mapped = page.content.map((backendEvent) => {
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

          this.allEvents.set(mapped);
          this.loadEventImages(page.content);
        },
        error: (err) => this.snackBar.open(err?.error?.message || "Error al buscar eventos:", "Cerrar", { duration: 4000 }),
      });
  }

  private refreshVenueNames(): void {
    this.allEvents.update(events => events.map(e => ({
      ...e,
      venue: this.getVenueName(e.venueId)
    })));
    this.rawTier1Events.update(events => events.map(e => ({
      ...e,
      venue: this.getVenueName(e.venueId)
    })));
    this.rawTier2Events.update(events => events.map(e => ({
      ...e,
      venue: this.getVenueName(e.venueId)
    })));
    this.rawTier3Events.update(events => events.map(e => ({
      ...e,
      venue: this.getVenueName(e.venueId)
    })));
  }

  loadEventImages(events: any[]): void {
    events.forEach((event) => {
      if (event.hasImage && !this.imageMap().has(event.id)) {
        this.eventService.getEventImage(event.id).subscribe({
          next: (blob) => {
            const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.imageMap.update(map => {
              const newMap = new Map(map);
              newMap.set(event.id, url);
              return newMap;
            });
          },
          error: (err) => console.warn(`Error al cargar imagen del evento ${event.id}:`, err)
        });
      }
    });
  }

  getEventImage(eventId: string): SafeUrl | null {
    return this.imageMap().get(Number(eventId)) || null;
  }

  getVenueName(venueId: number | null | undefined): string {
    if (!venueId) return "Sin venue";
    const v = this.venueMap.get(venueId);
    return v ? v.title : `Venue #${venueId}`;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
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

        this.rawTier1Events.set(highEvents);
        this.rawTier2Events.set(mediumEvents);
        this.rawTier3Events.set(lowEvents);

        const allPromotedRaw = [
          ...(grouped['high'] || grouped['premium'] || grouped['mega'] || []),
          ...(grouped['medium'] || grouped['destacado'] || grouped['super'] || []),
          ...(grouped['low'] || grouped['básico'] || grouped['cool'] || [])
        ];

        this.loadPromotedEventImages(allPromotedRaw);
      },
      error: (err) => {
        console.error("Error loading promoted events:", err);
      }
    });
  }

  loadPromotedEventImages(rawEvents: any[]): void {
    rawEvents.forEach((raw) => {
      if (raw.hasImage && !this.imageMap().has(raw.id)) {
        this.eventService.getEventImage(raw.id).subscribe({
          next: (blob) => {
            const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.imageMap.update(map => {
              const newMap = new Map(map);
              newMap.set(raw.id, url);
              return newMap;
            });
          },
          error: (err) => console.warn(`Error loading image for promoted event ${raw.id}:`, err)
        });
      }
    });
  }

  private filterCarousel(raw: EventSummary[]): EventSummary[] {
    const sQuery = this.searchQuery().toLowerCase();
    const catId = this.selectedCategoryId();
    return raw.filter(e => {
      const matchSearch = e.title.toLowerCase().includes(sQuery) || e.venue.toLowerCase().includes(sQuery);
      const matchCat = catId ? e.categoryIds?.includes(catId) : true;
      return matchSearch && matchCat;
    });
  }
}

