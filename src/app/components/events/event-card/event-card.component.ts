import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { SafeUrl } from '@angular/platform-browser';
import { TicketTypeService } from '../../../services/ticket-type.service';
import { EventSummary, parseDateRobust } from '../events.component';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss'
})
export class EventCardComponent implements OnInit {
  @Input({ required: true }) event!: EventSummary;
  @Input({ required: true }) boostTier: 'ULTRA_SUPER' | 'SUPER' | 'BASIC' = 'BASIC';
  @Input() size: 'hero' | 'featured' | 'default' | 'compact' = 'default';
  @Input() imageUrl: SafeUrl | null = null;

  private ticketTypeService = inject(TicketTypeService);
  private router = inject(Router);

  cheapestTicketPrice = signal<number | null>(null);
  isSoldOut = signal<boolean>(false);
  isComingSoon = signal<boolean>(false);
  isLoadingPrice = signal<boolean>(true);

  ngOnInit(): void {
    this.loadPrice();
  }

  loadPrice(): void {
    const eventId = Number(this.event.id);
    if (!eventId || isNaN(eventId)) {
      this.isLoadingPrice.set(false);
      return;
    }

    this.ticketTypeService.findTicketTypesByEvent(eventId).subscribe({
      next: (ticketTypes) => {
        this.isLoadingPrice.set(false);
        const now = new Date();
        
        const activeTiers = ticketTypes.filter(t => t.active);
        
        if (activeTiers.length === 0) {
          this.isSoldOut.set(true);
          this.isComingSoon.set(false);
          this.cheapestTicketPrice.set(null);
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
          this.cheapestTicketPrice.set(price);
          this.isSoldOut.set(false);
          this.isComingSoon.set(false);
        } else if (futureTiers.length > 0) {
          const price = Math.min(...futureTiers.map(t => t.priceUsdc));
          this.cheapestTicketPrice.set(price);
          this.isSoldOut.set(false);
          this.isComingSoon.set(true);
        } else {
          this.isSoldOut.set(true);
          this.isComingSoon.set(false);
          this.cheapestTicketPrice.set(null);
        }
      },
      error: () => {
        this.isLoadingPrice.set(false);
        this.cheapestTicketPrice.set(null);
        this.isSoldOut.set(false);
        this.isComingSoon.set(false);
      }
    });
  }

  getFormattedDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      const date = parseDateRobust(dateStr);
      // Map to Spanish days/months
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

  getEventMonth(date?: Date): string {
    if (!date) return '---';
    return date.toLocaleString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
  }

  getEventDay(date?: Date): string {
    if (!date) return '--';
    return date.getDate().toString();
  }

  navigateToEvent(): void {
    this.router.navigate(['/event', this.event.id]);
  }
}
