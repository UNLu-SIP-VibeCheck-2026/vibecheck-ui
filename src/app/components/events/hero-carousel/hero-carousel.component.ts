import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventService } from '../../../services/event.service';
import { TicketTypeService } from '../../../services/ticket-type.service';
import { EventSummary, parseDateRobust } from '../events.component';

@Component({
  selector: 'app-hero-carousel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './hero-carousel.component.html',
  styleUrl: './hero-carousel.component.scss'
})
export class HeroCarouselComponent implements OnInit, OnDestroy, OnChanges {
  @Input() events: EventSummary[] = [];
  @Input() imageMap = new Map<string, SafeUrl>();

  private eventService = inject(EventService);
  private ticketTypeService = inject(TicketTypeService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  currentIndex = signal<number>(0);
  priceMap = signal<Map<string, number | null>>(new Map());
  soldOutMap = signal<Map<string, boolean>>(new Map());
  comingSoonMap = signal<Map<string, boolean>>(new Map());

  private autoplayInterval: any;
  private isHovered = false;
  private startX = 0;
  
  // Detect if browser prefers reduced motion
  prefersReducedMotion = false;

  ngOnInit(): void {
    this.prefersReducedMotion = this.checkReducedMotion();
    this.startAutoplay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['events'] && this.events) {
      this.currentIndex.set(0);
      this.loadResources();
      this.startAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  private checkReducedMotion(): boolean {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  private loadResources(): void {
    const activeEvents = this.events.slice(0, 10);
    activeEvents.forEach((ev) => {
      const numId = Number(ev.id);

      // Load price
      this.ticketTypeService.findTicketTypesByEvent(numId).subscribe({
        next: (ticketTypes) => {
          const now = new Date();
          const activeTiers = ticketTypes.filter(t => t.active);

          if (activeTiers.length === 0) {
            this.soldOutMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, true);
              return newMap;
            });
            this.comingSoonMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, false);
              return newMap;
            });
            this.priceMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, null);
              return newMap;
            });
            return;
          }

          // Currently selling
          const currentTiers = activeTiers.filter(t => {
            const starts = new Date(t.saleStartDate);
            const ends = new Date(t.saleEndDate);
            return starts <= now && ends >= now;
          });

          // Future selling
          const futureTiers = activeTiers.filter(t => {
            const starts = new Date(t.saleStartDate);
            return starts > now;
          });

          if (currentTiers.length > 0) {
            const price = Math.min(...currentTiers.map(t => t.priceUsdc));
            this.priceMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, price);
              return newMap;
            });
            this.soldOutMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, false);
              return newMap;
            });
            this.comingSoonMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, false);
              return newMap;
            });
          } else if (futureTiers.length > 0) {
            const price = Math.min(...futureTiers.map(t => t.priceUsdc));
            this.priceMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, price);
              return newMap;
            });
            this.soldOutMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, false);
              return newMap;
            });
            this.comingSoonMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, true);
              return newMap;
            });
          } else {
            this.soldOutMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, true);
              return newMap;
            });
            this.comingSoonMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, false);
              return newMap;
            });
            this.priceMap.update(map => {
              const newMap = new Map(map);
              newMap.set(ev.id, null);
              return newMap;
            });
          }
        },
        error: () => {
          this.priceMap.update(map => {
            const newMap = new Map(map);
            newMap.set(ev.id, null);
            return newMap;
          });
          this.soldOutMap.update(map => {
            const newMap = new Map(map);
            newMap.set(ev.id, false);
            return newMap;
          });
          this.comingSoonMap.update(map => {
            const newMap = new Map(map);
            newMap.set(ev.id, false);
            return newMap;
          });
        }
      });
    });
  }

  getEventImage(eventId: string): SafeUrl | null {
    return this.imageMap.get(eventId) || null;
  }

  getEventPrice(eventId: string): number | null {
    return this.priceMap().get(eventId) ?? null;
  }

  isEventSoldOut(eventId: string): boolean {
    return this.soldOutMap().get(eventId) || false;
  }

  isEventComingSoon(eventId: string): boolean {
    return this.comingSoonMap().get(eventId) || false;
  }

  // Autoplay control
  startAutoplay(): void {
    this.stopAutoplay();
    if (this.prefersReducedMotion || this.isHovered || this.events.length <= 1) {
      return;
    }
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, 4000);
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  // Hover and Focus Handlers
  onMouseEnter(): void {
    this.isHovered = true;
    this.stopAutoplay();
  }

  onMouseLeave(): void {
    this.isHovered = false;
    this.startAutoplay();
  }

  // Swipe Gestures using pointer events
  onPointerDown(event: PointerEvent): void {
    this.startX = event.clientX;
    this.stopAutoplay();
  }

  onPointerUp(event: PointerEvent): void {
    const endX = event.clientX;
    const deltaX = endX - this.startX;
    
    if (deltaX > 50) {
      this.prevSlide();
    } else if (deltaX < -50) {
      this.nextSlide();
    }
    this.startAutoplay();
  }

  // Slide navigation
  prevSlide(): void {
    const len = this.events.length;
    if (len <= 1) return;
    this.currentIndex.update(idx => (idx + len - 1) % len);
  }

  nextSlide(): void {
    const len = this.events.length;
    if (len <= 1) return;
    this.currentIndex.update(idx => (idx + 1) % len);
  }

  getFormattedDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      const date = parseDateRobust(dateStr);
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const dayName = days[date.getDay()];
      const dayNum = date.getDate();
      const monthName = months[date.getMonth()];
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${dayName} ${dayNum} ${monthName} · ${hours}:${minutes}hs`;
    } catch {
      return dateStr;
    }
  }

  navigateToEvent(id: string): void {
    this.router.navigate(['/event', id]);
  }
}
