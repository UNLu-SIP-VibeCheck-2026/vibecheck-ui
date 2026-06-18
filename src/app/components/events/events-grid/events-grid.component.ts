import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { VenueService } from '../../../services/venue.service';
import { EventSummary } from '../events.component';
import { EventCardComponent } from '../event-card/event-card.component';
import { VenueResponse } from '../../../models/venue.model';

@Component({
  selector: 'app-events-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
    EventCardComponent
  ],
  templateUrl: './events-grid.component.html',
  styleUrl: './events-grid.component.scss'
})
export class EventsGridComponent implements OnInit, OnChanges {
  @Input() categoryId: number | null = null;
  @Input() searchQuery: string = '';
  @Input() eventTierMap = new Map<string, 'HIGH' | 'MEDIUM' | 'LOW' | 'BASIC'>();

  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  // Pagination states
  pageIndex = signal<number>(0);
  pageSize = signal<number>(8);
  totalElements = signal<number>(0);
  
  // Event list
  events = signal<EventSummary[]>([]);
  imageMap = signal<Map<string, SafeUrl>>(new Map());
  venueMap = new Map<number, VenueResponse>();

  // Loader states
  isLoading = signal<boolean>(false);
  isInitialLoad = signal<boolean>(true);

  // Interleaved events computed signal
  interleavedEvents = computed(() => {
    return this.interleaveEvents(this.events());
  });

  ngOnInit(): void {
    this.loadVenues();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryId'] || changes['searchQuery']) {
      this.pageIndex.set(0);
      this.loadEventsPage();
    }
  }

  loadVenues(): void {
    this.venueService.findAllVenues(0, 500).subscribe({
      next: (page) => {
        this.venueMap.clear();
        page.content.forEach((v) => this.venueMap.set(v.id, v));
        this.loadEventsPage();
      },
      error: (err) => {
        console.error('Error loading venues for grid:', err);
        this.loadEventsPage();
      }
    });
  }

  loadEventsPage(): void {
    this.isLoading.set(true);
    
    // Fetch events from server with sorting
    this.eventService.findAllEvents(
      this.pageIndex(), 
      this.pageSize(), 
      this.categoryId || undefined, 
      ['startDate,asc']
    ).subscribe({
      next: (page) => {
        this.totalElements.set(page.totalElements);
        
        // Map backend events to EventSummary structure
        const mapped = page.content.map((backendEvent) => {
          return {
            id: backendEvent.id.toString(),
            title: backendEvent.title,
            description: backendEvent.description || 'Sin descripción',
            startDate: backendEvent.startDate,
            startDateParsed: new Date(backendEvent.startDate),
            endDate: backendEvent.endDate,
            venue: this.getVenueName(backendEvent.venueId),
            venueId: backendEvent.venueId,
            capacity: backendEvent.capacity,
            categoryIds: backendEvent.categories ? backendEvent.categories.map(c => c.id) : [],
            realCategories: backendEvent.categories ? backendEvent.categories.map(c => c.name) : [],
            imageUrl: undefined,
            advertisementPlanId: backendEvent.advertisementPlanId
          };
        });

        // Client-side search filtering (since backend might not support search text directly in public/all API)
        let filtered = mapped;
        if (this.searchQuery) {
          const query = this.searchQuery.toLowerCase();
          filtered = mapped.filter(e => 
            e.title.toLowerCase().includes(query) || 
            e.venue.toLowerCase().includes(query)
          );
        }

        this.events.set(filtered);
        this.loadImages(page.content);
        
        this.isLoading.set(false);
        this.isInitialLoad.set(false);
      },
      error: (err) => {
        console.error('Error loading grid page:', err);
        this.isLoading.set(false);
        this.isInitialLoad.set(false);
      }
    });
  }

  loadImages(rawEvents: any[]): void {
    rawEvents.forEach((ev) => {
      if (ev.hasImage && !this.imageMap().has(ev.id.toString())) {
        this.eventService.getEventImage(ev.id).subscribe({
          next: (blob) => {
            const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.imageMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id.toString(), url);
              return newMap;
            });
          },
          error: (err) => console.warn(`Error loading image for grid event ${ev.id}:`, err)
        });
      }
    });
  }

  getEventImage(eventId: string): SafeUrl | null {
    return this.imageMap().get(eventId) || null;
  }

  getVenueName(venueId: number | null | undefined): string {
    if (!venueId) return 'Sin venue';
    const v = this.venueMap.get(venueId);
    return v ? v.title : `Venue #${venueId}`;
  }

  getEventTier(eventId: string): 'ULTRA_SUPER' | 'SUPER' | 'BASIC' {
    const tier = this.eventTierMap.get(eventId);
    if (tier === 'HIGH') return 'ULTRA_SUPER';
    if (tier === 'MEDIUM') return 'SUPER';
    return 'BASIC';
  }

  // Interleaving logic: prevents layout gaps in grid when two span-2 elements are consecutive.
  interleaveEvents(list: EventSummary[]): EventSummary[] {
    const ultraSupers = list.filter(e => this.getEventTier(e.id) === 'ULTRA_SUPER');
    const nonUltraSupers = list.filter(e => this.getEventTier(e.id) !== 'ULTRA_SUPER');
    
    const result: EventSummary[] = [];
    let patternIndex = 0;
    
    while (ultraSupers.length > 0 || nonUltraSupers.length > 0) {
      if (ultraSupers.length === 0) {
        result.push(...nonUltraSupers);
        break;
      }
      if (nonUltraSupers.length === 0) {
        result.push(...ultraSupers);
        break;
      }
      
      const pattern = patternIndex % 3;
      patternIndex++;
      
      if (pattern === 0) {
        // Center Ultra: Non-Ultra (1), Ultra (2), Non-Ultra (1)
        if (nonUltraSupers.length >= 2 && ultraSupers.length >= 1) {
          result.push(nonUltraSupers.shift()!);
          result.push(ultraSupers.shift()!);
          result.push(nonUltraSupers.shift()!);
        } else {
          result.push(ultraSupers.shift()!);
          result.push(nonUltraSupers.shift()!);
        }
      } else if (pattern === 1) {
        // Left Ultra: Ultra (2), Non-Ultra (1), Non-Ultra (1)
        if (ultraSupers.length >= 1 && nonUltraSupers.length >= 2) {
          result.push(ultraSupers.shift()!);
          result.push(nonUltraSupers.shift()!);
          result.push(nonUltraSupers.shift()!);
        } else {
          result.push(nonUltraSupers.shift()!);
          result.push(ultraSupers.shift()!);
        }
      } else {
        // Right Ultra: Non-Ultra (1), Non-Ultra (1), Ultra (2)
        if (nonUltraSupers.length >= 2 && ultraSupers.length >= 1) {
          result.push(nonUltraSupers.shift()!);
          result.push(nonUltraSupers.shift()!);
          result.push(ultraSupers.shift()!);
        } else {
          result.push(ultraSupers.shift()!);
          result.push(nonUltraSupers.shift()!);
        }
      }
    }
    
    return result;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadEventsPage();
  }

  navigateToEvent(id: string): void {
    this.router.navigate(['/event', id]);
  }
}
