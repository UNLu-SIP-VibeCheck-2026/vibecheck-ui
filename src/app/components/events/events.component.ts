import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startDate: string;
  venue: string;
  imageUrl?: string;
  category: 'Próximos eventos' | 'Recomendados' | 'Cerca tuyo' | 'Marketplace';
  // Marketplace fields
  sellerName?: string;
  sellerPhoto?: string;
  price?: number;
  ticketType?: string;
  location?: string;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss'
})
export class EventsComponent implements OnInit {
  private router = inject(Router);

  selectedPill: string = 'Próximos eventos';
  searchQuery: string = '';
  allEvents: EventSummary[] = [];
  filteredEvents: EventSummary[] = [];
  pagedEvents: EventSummary[] = [];
  
  totalEvents = 0;
  pageSize = 8;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadMockEvents();
    this.applyFilter();
  }

  loadMockEvents(): void {
    const titles = [
      'Quilmes Rock 2027', 'VibeFest', 'Sunset Sessions', 'Techno Night', 
      'Jazz in the Park', 'Indie Road', 'Metal Madness', 'Pop World',
      'Classical Gala', 'Blues Night', 'Reggae Sun', 'Hip Hop Jam'
    ];
    
    const venues = ['Argentina', 'Buenos Aires', 'Estadio Velez', 'Movistar Arena', 'Luna Park', 'Teatro Colon'];
    const categories: ('Próximos eventos' | 'Recomendados' | 'Cerca tuyo' | 'Marketplace')[] = 
      ['Próximos eventos', 'Recomendados', 'Cerca tuyo', 'Marketplace'];
    
    const sellers = ['Juan Perez', 'Maria Garcia', 'Carlos Lopez', 'Ana Martinez'];
    const ticketTypes = ['General', 'VIP', 'Platea Alta', 'Campo'];

    this.allEvents = Array.from({ length: 40 }).map((_, i) => {
      const category = categories[i % categories.length];
      const event: EventSummary = {
        id: `EVT-${i + 1}`,
        title: titles[i % titles.length] + (i > titles.length ? ` ${Math.floor(i / titles.length) + 1}` : ''),
        description: 'Descripción breve del evento para completar el diseño.',
        startDate: 'Próximamente...',
        venue: venues[i % venues.length],
        category: category,
        imageUrl: `https://picsum.photos/seed/${i + 100}/600/600`
      };

      if (category === 'Marketplace') {
        event.sellerName = sellers[i % sellers.length];
        event.sellerPhoto = `https://i.pravatar.cc/150?u=${event.sellerName}`;
        event.price = 5000 + (i * 100);
        event.ticketType = ticketTypes[i % ticketTypes.length];
        event.location = venues[(i + 1) % venues.length];
      }

      return event;
    });
  }

  selectPill(pill: string): void {
    this.selectedPill = pill;
    this.pageIndex = 0;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredEvents = this.allEvents.filter(e => {
      const matchesCategory = e.category === this.selectedPill;
      const matchesSearch = e.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
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
    if (this.selectedPill === 'Marketplace') {
      this.router.navigate(['/ticket-marketplace', id]);
    } else {
      this.router.navigate(['/event', id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
