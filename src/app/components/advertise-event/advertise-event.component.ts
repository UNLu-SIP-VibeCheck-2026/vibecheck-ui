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
    <div class="advertise-container" *ngIf="event">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Publicitar Evento</h1>
      </div>

      <div class="layout">
        <div class="main-column">
          <!-- Event Info & Ads Integrated Panel -->
          <mat-card class="integrated-card">
            <div class="event-mini-hero">
              <img [src]="event.imageUrl" alt="Event" class="event-thumb">
              <div class="event-meta">
                <h2 class="event-name">{{ event.name }}</h2>
                <div class="event-details">
                  <span><mat-icon>calendar_today</mat-icon> {{ event.date }}</span>
                  <span><mat-icon>location_on</mat-icon> {{ event.venue }}</span>
                </div>
              </div>
            </div>

            <div class="ads-selection-section">
              <div class="section-header">
                <mat-icon>campaign</mat-icon>
                <h3>Impulsa tu alcance</h3>
              </div>
              <p class="section-desc">Selecciona el nivel de vibración para tu publicidad. A mayor nivel, más presencia en la plataforma.</p>
              
              <div class="tiers-grid">
                <div class="tier-card" *ngFor="let tier of tiers" 
                     [class.active]="selectedTier?.id === tier.id"
                     (click)="selectTier(tier)">
                  <div class="tier-icon-wrapper">
                    <mat-icon [class]="'vibe-icon ' + tier.id">{{ tier.icon }}</mat-icon>
                  </div>
                  <div class="tier-info">
                    <span class="tier-name">{{ tier.name }}</span>
                    <span class="tier-price">{{ tier.price }} $VBK</span>
                  </div>
                  <p class="tier-description">{{ tier.description }}</p>
                </div>
              </div>
            </div>
          </mat-card>
        </div>

        <div class="summary-column">
          <mat-card class="summary-card">
            <h3>Resumen de Campaña</h3>
            <div class="summary-content" *ngIf="selectedTier; else noSelection">
              <div class="summary-row">
                <span>Estrategia</span>
                <span class="highlight">{{ selectedTier.name }}</span>
              </div>
              <div class="summary-row">
                <span>Costo</span>
                <span class="highlight">{{ selectedTier.price }} $VBK</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-total">
                <span>Total a pagar</span>
                <span class="total-price">{{ selectedTier.price }} $VBK</span>
              </div>
              
              <div class="disclaimer">
                <mat-icon>info</mat-icon>
                <p>La campaña se activará automáticamente tras confirmar el pago.</p>
              </div>

              <button mat-raised-button class="pay-btn" (click)="confirmAd()">
                CONTRATAR PUBLICIDAD
              </button>
            </div>
            <ng-template #noSelection>
              <div class="empty-summary">
                <mat-icon>touch_app</mat-icon>
                <p>Selecciona un tier para ver el resumen.</p>
              </div>
            </ng-template>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .advertise-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-6);
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-8);
      
      h1 {
        margin: 0;
        font-weight: 800;
        background: var(--gradient-brand);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      button {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: var(--space-8);
    }

    .integrated-card {
      background: var(--md-sys-color-surface-container) !important;
      border: 1px solid var(--md-sys-color-outline-variant) !important;
      border-radius: 24px !important;
      overflow: hidden;
      padding: 0 !important;
    }

    .event-mini-hero {
      display: flex;
      gap: var(--space-6);
      padding: var(--space-6);
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);

      .event-thumb {
        width: 120px;
        height: 120px;
        border-radius: 16px;
        object-fit: cover;
      }

      .event-meta {
        display: flex;
        flex-direction: column;
        justify-content: center;

        .event-name {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0 0 var(--space-2) 0;
        }

        .event-details {
          display: flex;
          gap: var(--space-4);
          color: var(--md-sys-color-on-surface-variant);
          font-size: 0.9rem;

          span {
            display: flex;
            align-items: center;
            gap: 4px;
            mat-icon { font-size: 16px; width: 16px; height: 16px; }
          }
        }
      }
    }

    .ads-selection-section {
      padding: var(--space-8);

      .section-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-1);
        color: var(--md-sys-color-primary);

        h3 { font-size: 1.4rem; font-weight: 700; margin: 0; }
      }

      .section-desc {
        color: var(--md-sys-color-on-surface-variant);
        margin-bottom: var(--space-6);
      }
    }

    .tiers-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-4);
    }

    .tier-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      padding: var(--space-6);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      &:hover {
        border-color: var(--md-sys-color-primary);
        background: rgba(168, 85, 247, 0.05);
      }

      &.active {
        border-color: var(--md-sys-color-primary);
        background: rgba(168, 85, 247, 0.1);
        box-shadow: 0 0 20px rgba(168, 85, 247, 0.1);
      }

      .tier-icon-wrapper {
        margin-bottom: var(--space-4);
        
        .vibe-icon {
          color: var(--md-sys-color-primary);
          &.cool { transform: scale(1); }
          &.super { transform: scale(1.3); }
          &.mega { transform: scale(1.6); }
        }
      }

      .tier-info {
        display: flex;
        flex-direction: column;
        margin-bottom: var(--space-3);

        .tier-name { font-weight: 800; font-size: 1.1rem; color: white; }
        .tier-price { color: var(--md-sys-color-primary); font-weight: 700; font-size: 0.9rem; }
      }

      .tier-description {
        font-size: 0.8rem;
        color: var(--md-sys-color-on-surface-variant);
        line-height: 1.4;
        margin: 0;
      }
    }

    .summary-card {
      background: var(--md-sys-color-surface-container-high) !important;
      border: 1px solid var(--md-sys-color-outline-variant) !important;
      padding: var(--space-6);
      border-radius: 20px !important;
      height: fit-content;
      position: sticky;
      top: var(--space-8);

      h3 { font-weight: 700; margin-bottom: var(--space-6); }
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--space-3);
      color: var(--md-sys-color-on-surface-variant);

      .highlight { color: white; font-weight: 700; }
    }

    .summary-divider {
      height: 1px;
      background: var(--md-sys-color-outline-variant);
      margin: var(--space-4) 0;
    }

    .summary-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);

      span { font-weight: 800; font-size: 1.2rem; }
      .total-price { color: var(--md-sys-color-primary); font-size: 1.8rem; }
    }

    .disclaimer {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: var(--space-6);
      color: var(--md-sys-color-on-surface-variant);
      font-size: 0.8rem;
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
      p { margin: 0; line-height: 1.4; }
    }

    .pay-btn {
      width: 100%;
      height: 56px;
      border-radius: 12px;
      background: var(--gradient-brand) !important;
      color: white !important;
      font-weight: 800;
      font-size: 1rem;
    }

    .empty-summary {
      text-align: center;
      padding: var(--space-10) 0;
      opacity: 0.3;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    }

    @media (max-width: 992px) {
      .layout { grid-template-columns: 1fr; }
      .tiers-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdvertiseEventComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  eventId: string = "";
  event: any = null;
  selectedTier: any = null;

  tiers = [
    { id: 'cool', name: 'Cool-Vibe', price: 100, icon: 'waves', description: 'Posicionamiento básico en categorías recomendadas.' },
    { id: 'super', name: 'Super-Vibe', price: 250, icon: 'vibration', description: 'Destacado en búsquedas y 1 notificación push dirigida.' },
    { id: 'mega', name: 'MEGA-Vibe', price: 500, icon: 'graphic_eq', description: 'Presencia total: Home carousel, Redes y Notificaciones globales.' }
  ];

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') || "";
    this.loadEvent();
  }

  loadEvent() {
    // Mock event info
    this.event = {
      id: this.eventId,
      name: 'Festival de Primavera 2026',
      date: '21 de Septiembre, 2026',
      venue: 'Parque de la Ciudad, Buenos Aires',
      imageUrl: 'https://picsum.photos/seed/spring/400/400'
    };
  }

  selectTier(tier: any) {
    this.selectedTier = tier;
  }

  confirmAd() {
    alert(`Contratando plan ${this.selectedTier.name} para el evento ${this.event.name}.`);
    this.goBack();
  }

  goBack() {
    this.router.navigate(['/admin-events']);
  }
}
