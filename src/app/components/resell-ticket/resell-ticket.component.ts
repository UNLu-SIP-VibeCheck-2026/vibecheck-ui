import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-resell-ticket',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule,
    MatSliderModule
  ],
  templateUrl: './resell-ticket.component.html',
  styleUrl: './resell-ticket.component.scss'
})
export class ResellTicketComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ticketId: string | null = null;
  resalePrice = 5000;
  maxResalePrice = 12000;

  selectedTier = 'none';
  tiers = [
    { id: 'none', name: 'Sin Publicidad', fee: 5, icon: 'block', description: 'Tu entrada aparecerá al final de la lista.' },
    { id: 'cool', name: 'Cool-Vibe', fee: 10, icon: 'waves', description: 'Posicionamiento básico y resaltado suave en el marketplace.' },
    { id: 'super', name: 'Super-Vibe', fee: 15, icon: 'vibration', description: 'Aparece en las primeras posiciones y notificaciones push.' },
    { id: 'mega', name: 'MEGA-Vibe', fee: 20, icon: 'graphic_eq', description: 'Destacado premium en home, redes sociales y carrusel principal.' }
  ];

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id');
  }

  get currentFee(): number {
    const tier = this.tiers.find(t => t.id === this.selectedTier);
    return tier ? tier.fee : 0;
  }

  get finalEarnings(): number {
    return this.resalePrice * (1 - this.currentFee / 100);
  }

  publishResale(): void {
    if (confirm(`¿Estás seguro de publicar esta reventa por $${this.resalePrice}? Una vez publicada, no podrás deshacer esta acción sin cancelar el proceso.`)) {
      alert('Entrada publicada en el Marketplace!');
      this.router.navigate(['/']);
    }
  }

  goBack(): void {
    window.history.back();
  }
}
