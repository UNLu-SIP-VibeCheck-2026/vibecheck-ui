import { Component, Input, ViewChild, ElementRef, inject, signal, AfterViewInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SafeUrl } from '@angular/platform-browser';
import { EventSummary } from '../events.component';
import { EventCardComponent } from '../event-card/event-card.component';

@Component({
  selector: 'app-events-carousel',
  standalone: true,
  imports: [CommonModule, MatIconModule, EventCardComponent],
  templateUrl: './events-carousel.component.html',
  styleUrl: './events-carousel.component.scss'
})
export class EventsCarouselComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) events: EventSummary[] = [];
  @Input() imageMap = new Map<string, SafeUrl>();

  @ViewChild('carouselScroll', { read: ElementRef }) carouselScroll?: ElementRef<HTMLDivElement>;

  showFadeOverlay = signal<boolean>(false);

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScroll(), 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['events']) {
      setTimeout(() => this.checkScroll(), 100);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScroll();
  }

  checkScroll(): void {
    if (!this.carouselScroll) return;
    const container = this.carouselScroll.nativeElement;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;

    const hasOverflow = scrollWidth > clientWidth;
    const reachedEnd = scrollLeft + clientWidth >= scrollWidth - 10; // 10px buffer

    this.showFadeOverlay.set(hasOverflow && !reachedEnd);
  }

  scroll(direction: number): void {
    if (!this.carouselScroll) return;
    const container = this.carouselScroll.nativeElement;
    // Scroll by 75% of the visible container width
    const distance = container.clientWidth * direction * 0.75;
    
    container.scrollBy({
      left: distance,
      behavior: 'smooth',
    });
  }

  getEventImage(eventId: string): SafeUrl | null {
    return this.imageMap.get(eventId) || null;
  }

  getEventTier(eventId: string): 'ULTRA_SUPER' | 'SUPER' | 'BASIC' {
    const level = this.events.find(e => e.id === eventId)?.advertisementLevel;
    if (level === 'HIGH') return 'ULTRA_SUPER';
    if (level === 'MEDIUM') return 'SUPER';
    return 'BASIC';
  }
}
