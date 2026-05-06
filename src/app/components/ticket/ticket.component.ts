import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.scss'
})
export class TicketComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  ticket: any = null;
  isQrVisible = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadTicket(id);
  }

  loadTicket(id: string | null): void {
    // Mock ticket detail with time
    this.ticket = {
      id: id || 'TICK-001',
      eventTitle: 'Quilmes Rock 2027',
      description: 'El festival más grande de Argentina vuelve con un line-up histórico. Disfrutá de tres días de puro rock nacional e internacional.',
      startDate: '15/05/2026 18:00 hs',
      endDate: '17/05/2026 23:50 hs',
      venue: 'Estadio Velez Sarsfield',
      address: 'Av. Juan B. Justo 9200, CABA',
      ticketType: 'VIP Platino',
      location: 'Sector VIP Front - Fila 5, Asiento 12',
      imageUrl: 'https://picsum.photos/seed/rock-detail/1200/400',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=VIBECHECK-TICK-001'
    };
  }

  toggleQR(): void {
    this.isQrVisible = !this.isQrVisible;
  }

  giftTicket(): void {
    this.router.navigate(['/gift-ticket', this.ticket.id]);
  }

  resellTicket(): void {
    this.router.navigate(['/resell-ticket', this.ticket.id]);
  }

  goBack(): void {
    this.router.navigate(['/my-tickets']);
  }
}
