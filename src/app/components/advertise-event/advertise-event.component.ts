import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-advertise-event',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <div class="advertise-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Publicitar Evento: {{ eventId }}</h1>
      </div>

      <div class="advertise-content">
        <div class="info-card">
          <mat-icon class="big-icon">campaign</mat-icon>
          <h2>Impulsa tu evento</h2>
          <p>Selecciona una estrategia publicitaria para llegar a más personas y aumentar tus ventas.</p>
        </div>

        <div class="options-grid">
          <mat-card class="option-card">
            <mat-card-header>
              <mat-card-title>Destacado en Inicio</mat-card-title>
              <mat-card-subtitle>Tu evento aparecerá en el carrusel principal</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="price">100 $VBK / día</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary">CONTRATAR</button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="option-card">
            <mat-card-header>
              <mat-card-title>Notificaciones Push</mat-card-title>
              <mat-card-subtitle>Envía una alerta a todos los usuarios interesados</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="price">250 $VBK / envío</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary">ENVIAR</button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="option-card">
            <mat-card-header>
              <mat-card-title>Email Marketing</mat-card-title>
              <mat-card-subtitle>Campaña personalizada a bases segmentadas</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="price">500 $VBK / campaña</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary">SOLICITAR</button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .advertise-container { padding: 40px 60px; font-family: 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 40px; }
    h1 { font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0; }
    .info-card { 
      background: white; border-radius: 16px; padding: 40px; text-align: center; 
      border: 1px solid #e5e7eb; margin-bottom: 32px;
    }
    .big-icon { font-size: 48px; width: 48px; height: 48px; color: #6366f1; margin-bottom: 16px; }
    h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { color: #6b7280; max-width: 500px; margin: 0 auto; }
    .options-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
    .option-card { padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: none !important; }
    .price { font-size: 1.25rem; font-weight: 700; color: #1a1a1a; margin: 16px 0; }
    mat-card-actions { justify-content: flex-end; padding: 16px 0 0; }
  `]
})
export class AdvertiseEventComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  eventId: string = "";

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') || "";
  }

  goBack() {
    this.router.navigate(['/admin-events']);
  }
}
