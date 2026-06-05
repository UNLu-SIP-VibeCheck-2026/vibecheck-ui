import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TicketService } from '../../services/ticket.service';
import { TicketResponse } from '../../models/ticket.model';
import { CreateListingComponent } from '../create-listing/create-listing.component';

@Component({
  selector: 'app-resell-ticket',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule,
    MatProgressSpinnerModule,
    CreateListingComponent
  ],
  templateUrl: './resell-ticket.component.html',
  styleUrl: './resell-ticket.component.scss'
})
export class ResellTicketComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);

  ticket: TicketResponse | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadTicket(Number(idParam));
    } else {
      this.errorMessage = 'ID de entrada no provisto.';
      this.isLoading = false;
    }
  }

  loadTicket(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.ticketService.getTicketById(id).subscribe({
      next: (res) => {
        this.ticket = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading ticket details', err);
        this.errorMessage = 'No se pudo cargar la información de la entrada.';
        this.isLoading = false;
      }
    });
  }

  onTicketListed(): void {
    // Navigate to user listings page
    this.router.navigate(['/my-listings']);
  }

  goBack(): void {
    window.history.back();
  }
}
