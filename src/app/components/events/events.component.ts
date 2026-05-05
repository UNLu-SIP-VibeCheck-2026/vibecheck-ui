import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startDate: string;
  venue: string;
  imageUrl?: string;
  category: 'Próximos eventos' | 'Recomendados' | 'Cerca tuyo' | 'Marketplace';
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatPaginatorModule
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss'
})
export class EventsComponent implements OnInit {
  private router = inject(Router);

  selectedPill: string = 'Próximos eventos';
  allEvents: EventSummary[] = [];
  filteredEvents: EventSummary[] = [];
  pagedEvents: EventSummary[] = [];
  
  totalEvents = 0;
  pageSize = 8;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadMockEvents();
    this.filterEvents();
  }

  loadMockEvents(): void {
    // Generar una lista de eventos ficticios para demostración
    const titles = [
      'Quilmes Rock 2027', 'VibeFest', 'Sunset Sessions', 'Techno Night', 
      'Jazz in the Park', 'Indie Road', 'Metal Madness', 'Pop World',
      'Classical Gala', 'Blues Night', 'Reggae Sun', 'Hip Hop Jam'
    ];
    
    const venues = ['Argentina', 'Buenos Aires', 'Estadio Velez', 'Movistar Arena', 'Luna Park', 'Teatro Colon'];
    const categories: ('Próximos eventos' | 'Recomendados' | 'Cerca tuyo' | 'Marketplace')[] = 
      ['Próximos eventos', 'Recomendados', 'Cerca tuyo', 'Marketplace'];

    this.allEvents = Array.from({ length: 40 }).map((_, i) => ({
      id: `EVT-${i + 1}`,
      title: titles[i % titles.length] + (i > titles.length ? ` ${Math.floor(i / titles.length) + 1}` : ''),
      description: 'Descripción breve del evento para completar el diseño.',
      startDate: 'Próximamente...',
      venue: venues[i % venues.length],
      category: categories[i % categories.length],
      imageUrl: `https://picsum.photos/seed/${i + 100}/600/600` // Usamos fotos cuadradas como pidió el usuario
    }));
  }

  selectPill(pill: string): void {
    this.selectedPill = pill;
    this.pageIndex = 0;
    this.filterEvents();
  }

  filterEvents(): void {
    this.filteredEvents = this.allEvents.filter(e => e.category === this.selectedPill);
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
    this.router.navigate(['/event', id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
