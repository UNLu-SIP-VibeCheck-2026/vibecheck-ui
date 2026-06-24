import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EventService } from '../../services/event.service';
import { CategoryService } from '../../services/category.service';
import { VenueService } from '../../services/venue.service';
import { CategoryResponse } from '../../models/category.model';
import { VenueResponse } from '../../models/venue.model';

import { HeroCarouselComponent } from './hero-carousel/hero-carousel.component';
import { EventsCarouselComponent } from './events-carousel/events-carousel.component';
import { EventsGridComponent } from './events-grid/events-grid.component';
import { EventCardComponent } from './event-card/event-card.component';

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startDate: string;
  startDateParsed?: Date;
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
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    HeroCarouselComponent,
    EventsCarouselComponent,
    EventsGridComponent,
    EventCardComponent
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss'
})
export class EventsComponent implements OnInit, OnDestroy {
  private snackBar = inject(MatSnackBar);
  private eventService = inject(EventService);
  private categoryService = inject(CategoryService);
  private venueService = inject(VenueService);
  private sanitizer = inject(DomSanitizer);

  // Writable Signals
  heroEvents = signal<EventSummary[]>([]);
  featuredEvents = signal<EventSummary[]>([]);
  sidebarEvents = signal<EventSummary[]>([]);
  isLoadingBoosted = signal<boolean>(true);
  
  eventTierMap = signal<Map<string, 'HIGH' | 'MEDIUM' | 'LOW' | 'BASIC'>>(new Map());
  imageMap = signal<Map<number, SafeUrl>>(new Map<number, SafeUrl>());
  
  stringImageMap = computed(() => {
    const stringMap = new Map<string, SafeUrl>();
    this.imageMap().forEach((val, key) => {
      stringMap.set(key.toString(), val);
    });
    return stringMap;
  });

  venueMap = new Map<number, VenueResponse>();
  categories = signal<CategoryResponse[]>([]);

  // Filter signals bound to inputs
  selectedCategoryId = signal<number | null>(null);
  searchQuery = signal<string>('');
  dateFilterOption = signal<string>('ALL'); // 'ALL', 'TODAY', 'WEEK', 'MONTH'

  startDateParam = computed(() => {
    const option = this.dateFilterOption();
    const now = new Date();
    if (option === 'TODAY') {
      return now.toISOString();
    }
    if (option === 'WEEK') {
      return now.toISOString();
    }
    if (option === 'MONTH') {
      return now.toISOString();
    }
    return null;
  });

  endDateParam = computed(() => {
    const option = this.dateFilterOption();
    const now = new Date();
    if (option === 'TODAY') {
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return todayEnd.toISOString();
    }
    if (option === 'WEEK') {
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return weekEnd.toISOString();
    }
    if (option === 'MONTH') {
      const monthEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return monthEnd.toISOString();
    }
    return null;
  });

  hasActiveFilters = computed(() => {
    return this.searchQuery().trim().length > 0 || this.selectedCategoryId() !== null || this.dateFilterOption() !== 'ALL';
  });

  getCategoryName(id: number | null): string {
    if (id === null) return '';
    const cat = this.categories().find(c => c.id === id);
    return cat ? cat.name : `Categoría #${id}`;
  }

  getDateOptionLabel(option: string): string {
    if (option === 'TODAY') return 'Hoy';
    if (option === 'WEEK') return 'Esta semana';
    if (option === 'MONTH') return 'Próximos 30 días';
    return '';
  }

  clearSearchQuery(): void {
    this.searchQuery.set('');
  }

  clearCategory(): void {
    this.selectedCategoryId.set(null);
  }

  clearDateFilter(): void {
    this.dateFilterOption.set('ALL');
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCategoryId.set(null);
    this.dateFilterOption.set('ALL');
  }

  ngOnInit(): void {
    this.loadVenues();
    this.loadCategories();
    this.loadPromotedEvents();
  }

  ngOnDestroy(): void {
    // Component cleanup if necessary
  }

  loadVenues(): void {
    this.venueService.findAllVenues(0, 500).subscribe({
      next: (page) => {
        this.venueMap.clear();
        page.content.forEach((v) => this.venueMap.set(v.id, v));
      },
      error: (err) => console.error('Error loading venues:', err)
    });
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
      },
      error: (err) => console.error('Error loading categories:', err)
    });
  }

  loadPromotedEvents(): void {
    this.isLoadingBoosted.set(true);
    this.eventService.getUpcomingPromotedEventsGroupedByTier().subscribe({
      next: (grouped) => {
        const mapBackendEvent = (backendEvent: any, level: 'HIGH' | 'MEDIUM' | 'LOW'): EventSummary => {
          return {
            id: backendEvent.id.toString(),
            title: backendEvent.title,
            description: backendEvent.description || 'Sin descripción',
            startDate: backendEvent.startDate,
            startDateParsed: parseDateRobust(backendEvent.startDate),
            endDate: backendEvent.endDate,
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

        // Populate event tier map
        const tierMap = new Map<string, 'HIGH' | 'MEDIUM' | 'LOW' | 'BASIC'>();
        const highRaw = grouped['high'] || grouped['premium'] || grouped['mega'] || [];
        const mediumRaw = grouped['medium'] || grouped['destacado'] || grouped['super'] || [];
        const lowRaw = grouped['low'] || grouped['básico'] || grouped['cool'] || [];

        highRaw.forEach((e: any) => tierMap.set(e.id.toString(), 'HIGH'));
        mediumRaw.forEach((e: any) => tierMap.set(e.id.toString(), 'MEDIUM'));
        lowRaw.forEach((e: any) => tierMap.set(e.id.toString(), 'LOW'));
        this.eventTierMap.set(tierMap);

        const highEvents = highRaw.sort(sortByDateAsc).map((e: any) => mapBackendEvent(e, 'HIGH'));
        const mediumEvents = mediumRaw.sort(sortByDateAsc).map((e: any) => mapBackendEvent(e, 'MEDIUM'));
        
        // If there are no boosted events, simply disable carousels and return
        if (highEvents.length === 0 && mediumEvents.length === 0) {
          this.heroEvents.set([]);
          this.featuredEvents.set([]);
          this.sidebarEvents.set([]);
          this.isLoadingBoosted.set(false);
          return;
        }

        // 1. Hero Events Fallback (high events, or medium events if no high)
        let heroList = highEvents;
        if (heroList.length === 0) {
          heroList = mediumEvents;
        }

        this.heroEvents.set(this.getRotatedHeroEvents(heroList));
        this.isLoadingBoosted.set(false);

        // 2. Featured Events (SUPER + ULTRA_SUPER sorted desc by tier, then date)
        const combinedFeatured = [...highEvents, ...mediumEvents].sort((a, b) => {
          const aWeight = a.advertisementLevel === 'HIGH' ? 2 : 1;
          const bWeight = b.advertisementLevel === 'HIGH' ? 2 : 1;
          if (bWeight !== aWeight) {
            return bWeight - aWeight; // HIGH tier first
          }
          return new Date(a.startDateParsed!).getTime() - new Date(b.startDateParsed!).getTime(); // Asc date
        });
        
        this.featuredEvents.set(combinedFeatured);

        // 3. Sidebar Events (Top 8 of featured list)
        this.sidebarEvents.set(combinedFeatured.slice(0, 8));

        // Load images for promoted events
        const allPromotedRaw = [...highRaw, ...mediumRaw, ...lowRaw];
        this.loadPromotedEventImages(allPromotedRaw);
      },
      error: (err) => {
        console.error('Error loading promoted events:', err);
        this.isLoadingBoosted.set(false);
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

  getRotatedHeroEvents(events: EventSummary[], max = 10): EventSummary[] {
    if (events.length <= max) return events;
    const seed = Math.floor(Date.now() / (1000 * 60 * 30)); // changes every 30 minutes
    return this.seededShuffle(events, seed).slice(0, max);
  }

  private seededShuffle(array: EventSummary[], seed: number): EventSummary[] {
    const arr = [...array];
    let m = arr.length, t, i;
    while (m) {
      const x = Math.sin(seed++) * 10000;
      const r = x - Math.floor(x);
      i = Math.floor(r * m--);
      t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }
    return arr;
  }

  getVenueName(venueId: number | null | undefined): string {
    if (!venueId) return 'Sin venue';
    const v = this.venueMap.get(venueId);
    return v ? v.title : `Venue #${venueId}`;
  }

  getEventTier(eventId: string): 'ULTRA_SUPER' | 'SUPER' | 'BASIC' {
    const tier = this.eventTierMap().get(eventId);
    if (tier === 'HIGH') return 'ULTRA_SUPER';
    if (tier === 'MEDIUM') return 'SUPER';
    return 'BASIC';
  }

  getEventImage(eventId: string): SafeUrl | null {
    return this.imageMap().get(Number(eventId)) || null;
  }

  getEventImageMap(): Map<string, SafeUrl> {
    const stringMap = new Map<string, SafeUrl>();
    this.imageMap().forEach((val, key) => {
      stringMap.set(key.toString(), val);
    });
    return stringMap;
  }

  getEventTierMap(): Map<string, 'HIGH' | 'MEDIUM' | 'LOW' | 'BASIC'> {
    return this.eventTierMap();
  }

  onCategoryChange(): void {
    // Signals will reactively update the child EventsGridComponent
  }
}

export function parseDateRobust(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  try {
    let date: Date;
    if (Array.isArray(dateVal)) {
      const year = dateVal[0];
      const month = dateVal[1] - 1;
      const day = dateVal[2];
      const hour = dateVal[3] || 0;
      const minute = dateVal[4] || 0;
      const second = dateVal[5] || 0;
      date = new Date(year, month, day, hour, minute, second);
    } else {
      let cleaned = String(dateVal).trim();
      if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
        cleaned = cleaned.slice(1, -1);
      }
      if (cleaned.includes(',')) {
        const parts = cleaned.split(',').map(p => parseInt(p, 10));
        const year = parts[0];
        const month = (parts[1] || 1) - 1;
        const day = parts[2] || 1;
        const hour = parts[3] || 0;
        const minute = parts[4] || 0;
        const second = parts[5] || 0;
        date = new Date(year, month, day, hour, minute, second);
      } else {
        const hasTimezone = cleaned.endsWith('Z') || /[\+\-]\d{2}:\d{2}$/.test(cleaned);
        const isoRegex = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;
        const match = cleaned.match(isoRegex);
        if (match && !hasTimezone) {
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const day = parseInt(match[3], 10);
          const hour = match[4] ? parseInt(match[4], 10) : 0;
          const minute = match[5] ? parseInt(match[5], 10) : 0;
          const second = match[6] ? parseInt(match[6], 10) : 0;
          date = new Date(year, month, day, hour, minute, second);
        } else {
          if (cleaned.includes(' ') && !cleaned.includes('T')) {
            cleaned = cleaned.replace(' ', 'T');
          }
          date = new Date(cleaned);
        }
      }
    }
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}
