import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="event-detail-container" *ngIf="event">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="header-title">Detalle del Evento</span>
      </div>

      <div class="content-wrapper">
        <!-- Vertical layout -->
        <div class="event-hero">
          <div class="image-container">
            <div class="placeholder-img">
              <mat-icon>image</mat-icon>
              <span>Portada del Evento</span>
            </div>
            <div class="status-badge" [class.active]="event.active">
              {{ event.active ? 'Activo' : 'Inactivo' }}
            </div>
          </div>

          <div class="event-info-section">
            <h1 class="event-title">{{ event.title }}</h1>
            
            <div class="meta-info">
              <div class="meta-item">
                <mat-icon>calendar_today</mat-icon>
                <div class="meta-text">
                  <label>Fecha de Inicio</label>
                  <span>{{ event.startDate }}</span>
                </div>
              </div>

              <div class="meta-item">
                <mat-icon>event_available</mat-icon>
                <div class="meta-text">
                  <label>Fecha de Fin</label>
                  <span>{{ event.endDate }}</span>
                </div>
              </div>
              
              <div class="meta-item">
                <mat-icon>location_on</mat-icon>
                <div class="meta-text">
                  <label>Venue</label>
                  <span>{{ event.venue }}</span>
                </div>
              </div>
            </div>

            <div class="description-section">
              <h3>Descripción</h3>
              <p>{{ event.description }}</p>
            </div>

            <div class="actions">
              <button mat-raised-button color="primary" class="buy-btn" (click)="buyTickets()">
                <mat-icon>shopping_cart</mat-icon>
                Adquirir Entradas
              </button>
              <button mat-stroked-button class="share-btn">
                <mat-icon>share</mat-icon>
                Compartir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .event-detail-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-4);
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-8);
      
      button {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.05);
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }

      .header-title {
        font-family: 'Outfit', sans-serif;
        font-size: var(--text-title-md);
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        letter-spacing: 0.02em;
      }
    }

    .content-wrapper {
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-extra-large);
      overflow: hidden;
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--md-sys-color-outline-variant);
    }

    .event-hero {
      display: flex;
      flex-direction: column;
    }

    .image-container {
      position: relative;
      width: 100%;
      height: 450px;
      background: var(--md-sys-color-surface-container-high);
      
      .placeholder-img {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--md-sys-color-outline);
        gap: var(--space-4);

        mat-icon { 
          font-size: 80px; 
          width: 80px; 
          height: 80px; 
          opacity: 0.5;
        }
        
        span { 
          font-family: 'Outfit', sans-serif;
          font-size: var(--text-title-sm); 
          font-weight: 500; 
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.5;
        }
      }

      .status-badge {
        position: absolute;
        top: 24px;
        right: 24px;
        padding: 8px 20px;
        border-radius: 30px;
        font-weight: 700;
        font-size: var(--text-label-md);
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        letter-spacing: 0.05em;
        text-transform: uppercase;

        &.active { color: #4ade80; border-color: rgba(74, 222, 128, 0.3); }
        &:not(.active) { color: #f87171; border-color: rgba(248, 113, 113, 0.3); }
      }
    }

    .event-info-section {
      padding: var(--space-10);
      background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.2));
    }

    .event-title {
      font-family: 'Outfit', sans-serif;
      font-size: 3.5rem;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: var(--space-10);
      letter-spacing: -0.03em;
      line-height: 1;
    }

    .meta-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-6);
      margin-bottom: var(--space-10);
      padding: var(--space-8);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--md-sys-shape-corner-large);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      
      mat-icon { 
        color: var(--md-sys-color-primary); 
        background: rgba(168, 85, 247, 0.1);
        padding: 12px;
        border-radius: 12px;
        width: 24px;
        height: 24px;
        font-size: 24px;
        box-sizing: content-box;
      }
      
      .meta-text {
        display: flex;
        flex-direction: column;
        
        label {
          font-size: var(--text-label-sm);
          font-weight: 700;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: var(--space-1);
          letter-spacing: 0.05em;
        }

        span {
          font-family: 'Outfit', sans-serif;
          font-size: var(--text-body-lg);
          font-weight: 600;
          color: #ffffff;
        }
      }
    }

    .description-section {
      margin-bottom: var(--space-10);
      
      h3 {
        font-family: 'Outfit', sans-serif;
        font-size: var(--text-title-sm);
        font-weight: 700;
        color: #ffffff;
        margin-bottom: var(--space-4);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.9;
      }

      p {
        font-family: 'Inter', sans-serif;
        font-size: 1.15rem;
        line-height: 1.8;
        color: rgba(255, 255, 255, 0.7);
        white-space: pre-line;
      }
    }

    .actions {
      display: flex;
      gap: var(--space-4);
      
      .buy-btn {
        flex: 2;
        height: 64px;
        padding: 0 3rem;
        border-radius: 16px;
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 1.25rem;
        background: var(--gradient-brand) !important;
        color: #ffffff !important;
        border: none !important;
        box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(168, 85, 247, 0.5);
          filter: brightness(1.1);
        }
        
        mat-icon { margin-right: 12px; }
      }

      .share-btn {
        flex: 1;
        height: 64px;
        padding: 0 2rem;
        border-radius: 16px;
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        font-size: 1.1rem;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        background: transparent !important;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: #ffffff !important;
        }

        mat-icon { margin-right: 8px; }
      }
    }

    @media (max-width: 768px) {
      .event-detail-container { padding: var(--space-4); }
      .image-container { height: 300px; }
      .event-info-section { padding: var(--space-6); }
      .event-title { font-size: 2.5rem; }
      .meta-info { padding: var(--space-4); gap: var(--space-4); }
      .actions { flex-direction: column; }
      .buy-btn, .share-btn { width: 100%; flex: none; }
    }
  `]
})
export class EventComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  event: any = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    // Mock data based on the provided wireframe data
    this.event = {
      id: id || 'EVENTO001',
      title: id || 'EVENTO001',
      description: 'Excepteur efficient emerging, minim veniam anim aute carefully curated Ginza conversation exquisite perfect nostrud nisi intricate Content. Qui international first-class nulla ut. Punctual adipisicing, essential lovely queen\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      startDate: '15/05/2026',
      endDate: '16/05/2026',
      venue: 'VENUE01',
      active: true
    };
  }

  buyTickets() {
    this.router.navigate(['/select-tickets', this.event.id]);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
