import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-ticket-marketplace',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './ticket-marketplace.component.html',
  styleUrl: './ticket-marketplace.component.scss'
})
export class TicketMarketplaceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  ticket: any = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadTicket(id);
  }

  loadTicket(id: string | null): void {
    // Mock ticket detail for marketplace
    this.ticket = {
      id: id || 'TICK-M-001',
      eventTitle: 'Quilmes Rock 2027',
      description: 'Entrada en reventa para el Quilmes Rock. Excelente ubicación para disfrutar del festival más grande.',
      startDate: '15/05/2026 18:00 hs',
      endDate: '17/05/2026 23:50 hs',
      venue: 'Estadio Velez Sarsfield',
      address: 'Av. Juan B. Justo 9200, CABA',
      ticketType: 'VIP Platino',
      location: 'Sector VIP Front - Fila 5',
      price: 15500,
      sellerName: 'Juan Perez',
      sellerPhoto: 'https://i.pravatar.cc/150?u=JuanPerez',
      imageUrl: 'https://picsum.photos/seed/rock-marketplace/1200/400'
    };
  }

  buyTicket(): void {
    this.router.navigate(['/marketplace-checkout', this.ticket.id]);
  }

  shareTicket(): void {
    alert('Enlace de reventa copiado al portapapeles');
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
