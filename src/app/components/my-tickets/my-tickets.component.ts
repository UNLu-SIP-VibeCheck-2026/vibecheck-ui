import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';

export interface UserTicket {
  id: string;
  eventTitle: string;
  startDate: string;
  venue: string;
  ticketType: string;
  location: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule,
    LoadingStateComponent,
    EmptyStateComponent
  ],
  templateUrl: './my-tickets.component.html',
  styleUrl: './my-tickets.component.scss'
})
export class MyTicketsComponent implements OnInit {
  private router = inject(Router);
  
  tickets: UserTicket[] = [];
  isLoading: boolean = false;

  ngOnInit(): void {
    this.loadTicketsWithDelay();
  }

  loadTicketsWithDelay(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.loadMockTickets();
      this.isLoading = false;
    }, 1500);
  }

  loadMockTickets(): void {
    this.tickets = [
      {
        id: 'TICK-001',
        eventTitle: 'Quilmes Rock 2027',
        startDate: '15/05/2026',
        venue: 'Estadio Velez',
        ticketType: 'VIP Platino',
        location: 'Sector VIP Front',
        imageUrl: 'https://picsum.photos/seed/rock/600/300'
      },
      {
        id: 'TICK-002',
        eventTitle: 'VibeFest 2026',
        startDate: '20/06/2026',
        venue: 'Movistar Arena',
        ticketType: 'General',
        location: 'Campo',
        imageUrl: 'https://picsum.photos/seed/fest/600/300'
      },
      {
        id: 'TICK-003',
        eventTitle: 'Techno Night',
        startDate: '12/07/2026',
        venue: 'Luna Park',
        ticketType: 'Platea Alta',
        location: 'Sector C',
        imageUrl: 'https://picsum.photos/seed/techno/600/300'
      }
    ];
  }

  exploreEvents(): void {
    this.router.navigate(['/events']);
  }

  viewTicket(id: string): void {
    this.router.navigate(['/ticket', id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
