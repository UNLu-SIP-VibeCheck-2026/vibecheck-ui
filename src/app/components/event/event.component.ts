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
                  <label>Fecha de Celebración</label>
                  <span>{{ event.celebrationDate }}</span>
                </div>
              </div>
              
              <div class="meta-item">
                <mat-icon>location_on</mat-icon>
                <div class="meta-text">
                  <label>Venue</label>
                  <span>{{ event.venue }}</span>
                </div>
              </div>

              <div class="meta-item">
                <mat-icon>history</mat-icon>
                <div class="meta-text">
                  <label>Creado el</label>
                  <span>{{ event.creationDate }}</span>
                </div>
              </div>
            </div>

            <div class="description-section">
              <h3>Descripción</h3>
              <p>{{ event.description }}</p>
            </div>

            <div class="actions">
              <button mat-raised-button color="primary" class="buy-btn">
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
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      
      .header-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #4b5563;
      }
    }

    .content-wrapper {
      background: white;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      border: 1px solid #f3f4f6;
    }

    .event-hero {
      display: flex;
      flex-direction: column;
    }

    .image-container {
      position: relative;
      width: 100%;
      height: 400px;
      background: #f9fafb;
      
      .placeholder-img {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        gap: 1rem;

        mat-icon { font-size: 4rem; width: 4rem; height: 4rem; }
        span { font-size: 1.1rem; font-weight: 500; }
      }

      .status-badge {
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.875rem;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);

        &.active { color: #10b981; }
        &:not(.active) { color: #ef4444; }
      }
    }

    .event-info-section {
      padding: 3rem;
    }

    .event-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #111827;
      margin-bottom: 2rem;
      letter-spacing: -0.025em;
    }

    .meta-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
      padding: 2rem;
      background: #f8fafc;
      border-radius: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      mat-icon { color: #6366f1; }
      
      .meta-text {
        display: flex;
        flex-direction: column;
        
        label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        span {
          font-weight: 600;
          color: #1f2937;
        }
      }
    }

    .description-section {
      margin-bottom: 3rem;
      
      h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #111827;
        margin-bottom: 1rem;
      }

      p {
        font-size: 1.1rem;
        line-height: 1.7;
        color: #4b5563;
        white-space: pre-line;
      }
    }

    .actions {
      display: flex;
      gap: 1.5rem;
      
      .buy-btn {
        height: 56px;
        padding: 0 2.5rem;
        border-radius: 14px;
        font-weight: 700;
        font-size: 1.1rem;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
      }

      .share-btn {
        height: 56px;
        padding: 0 2rem;
        border-radius: 14px;
        font-weight: 600;
      }
    }

    @media (max-width: 640px) {
      .event-detail-container { padding: 1rem; }
      .event-info-section { padding: 1.5rem; }
      .event-title { font-size: 1.75rem; }
      .actions { flex-direction: column; }
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
      description: 'Excepteur efficient emerging, minim veniam anim aute carefully curated Ginza conversation exquisite perfect nostrud nisi intricate Content. Qui international first-class nulla ut. Punctual adipisicing, essential lovely queen\\n\\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      creationDate: '28/04/2026',
      celebrationDate: '15/05/2026',
      venue: 'VENUE01',
      active: true
    };
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
