import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventService } from '../../services/event.service';
import { VenueService } from '../../services/venue.service';
import { AdvertisementService } from '../../services/advertisement.service';

interface AdvertiseTier {
  id: string; // 'cool' | 'super' | 'mega'
  planId: number;
  name: string;
  displayName: string;
  pricePerDayVbk: number;
  pricePerDayUsdc: number;
  icon: string;
  description: string;
  availableSlots: number | null;
}

@Component({
  selector: 'app-advertise-event',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    FormsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="advertise-container" *ngIf="!isLoadingGlobal; else loading">
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
              <img *ngIf="eventImageUrl" [src]="eventImageUrl" alt="Event" class="event-thumb">
              <div *ngIf="!eventImageUrl" class="no-image-placeholder">
                <mat-icon>image_not_supported</mat-icon>
              </div>
              <div class="event-meta">
                <h2 class="event-name">{{ event?.title }}</h2>
                <div class="event-details">
                  <span><mat-icon>calendar_today</mat-icon> {{ formatDate(event?.startDate) }}</span>
                  <span><mat-icon>location_on</mat-icon> {{ venueName }}</span>
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
                <div class="tier-card" *ngFor="let tier of plans" 
                     [class.active]="selectedTier?.planId === tier.planId"
                     [class.current-active]="event?.advertisementPlanId === tier.planId"
                     (click)="selectTier(tier)">
                  <div class="tier-icon-wrapper">
                    <mat-icon [class]="'vibe-icon ' + tier.id">{{ tier.icon }}</mat-icon>
                  </div>
                  <div class="tier-info">
                    <span class="tier-name">{{ tier.displayName }}</span>
                    <span class="active-badge" *ngIf="event?.advertisementPlanId === tier.planId">
                      Plan Actual
                    </span>
                    <span class="tier-price">{{ tier.pricePerDayVbk | number }} $VBK / día</span>
                    <span class="tier-slots" *ngIf="tier.availableSlots !== null">
                      Slots: {{ tier.availableSlots }} disponibles
                    </span>
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
                <span class="highlight">{{ selectedTier.displayName }}</span>
              </div>
              <div class="summary-row duration-row">
                <span>Duración</span>
                <span class="highlight-input">
                  <input type="number" min="1" max="90" [(ngModel)]="durationDays" (ngModelChange)="onDurationChange()" class="duration-input"> días
                </span>
              </div>
              <div class="summary-row">
                <span>Costo por día</span>
                <span class="highlight">{{ selectedTier.pricePerDayVbk | number }} $VBK</span>
              </div>
              <div class="summary-row" *ngIf="discountVbk > 0" style="color: var(--md-sys-color-tertiary);">
                <span>Descuento aplicado</span>
                <span class="highlight">-{{ discountVbk | number }} $VBK</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-total">
                <span>Total a pagar</span>
                <span class="total-price">{{ finalTotalVbk | number }} $VBK</span>
              </div>
              
              <div class="disclaimer" *ngIf="previewError">
                <mat-icon style="color: var(--md-sys-color-error)">error</mat-icon>
                <p style="color: var(--md-sys-color-error)">{{ previewError }}</p>
              </div>
              <div class="disclaimer" *ngIf="!previewError && discountVbk > 0">
                <mat-icon style="color: var(--md-sys-color-tertiary)">loyalty</mat-icon>
                <p>¡Se ha aplicado un descuento por los días no usados de tu plan actual!</p>
              </div>
              <div class="disclaimer" *ngIf="!previewError && discountVbk === 0">
                <mat-icon>info</mat-icon>
                <p>La campaña se activará automáticamente tras confirmar el pago con tu billetera interna.</p>
              </div>

              <button mat-raised-button class="pay-btn" (click)="confirmAd()" [disabled]="!!previewError || isPreviewing">
                <span *ngIf="!isPreviewing">CONTRATAR PUBLICIDAD</span>
                <mat-spinner *ngIf="isPreviewing" diameter="24" color="accent"></mat-spinner>
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

    <ng-template #loading>
      <div class="global-loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Cargando información de publicidad...</p>
      </div>
    </ng-template>
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
      align-items: center;

      .event-thumb {
        width: 120px;
        height: 120px;
        border-radius: 16px;
        object-fit: cover;
      }

      .no-image-placeholder {
        width: 120px;
        height: 120px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed var(--md-sys-color-outline-variant);
        color: var(--md-sys-color-on-surface-variant);
        mat-icon { font-size: 32px; width: 32px; height: 32px; }
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

      &.current-active {
        border-color: var(--md-sys-color-tertiary, #00d2ff);
        background: rgba(0, 210, 255, 0.05);
        box-shadow: 0 0 15px rgba(0, 210, 255, 0.1);
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
        
        .active-badge {
          background: rgba(0, 210, 255, 0.15);
          color: #00d2ff;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 20px;
          margin-top: 4px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          align-self: center;
          border: 1px solid rgba(0, 210, 255, 0.3);
        }
        
        .tier-slots {
          font-size: 0.75rem;
          color: var(--md-sys-color-outline);
          margin-top: 2px;
        }
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

    .duration-row {
      align-items: center;
    }

    .highlight-input {
      display: flex;
      align-items: center;
      gap: 4px;
      color: white;
    }

    .duration-input {
      width: 40px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 6px;
      color: white;
      text-align: center;
      padding: 4px;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      
      &:focus {
        border-color: var(--md-sys-color-primary);
      }
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

    .global-loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-20) 0;
      color: var(--md-sys-color-on-surface-variant);
      gap: var(--space-4);
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
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private advertisementService = inject(AdvertisementService);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  eventId = 0;
  event: any = null;
  eventImageUrl: SafeUrl | null = null;
  venueName = 'Cargando ubicación...';

  plans: AdvertiseTier[] = [];
  selectedTier: AdvertiseTier | null = null;

  durationDays = 7;
  originalTotalVbk = 0;
  discountVbk = 0;
  finalTotalVbk = 0;
  isLoadingGlobal = true;
  isPreviewing = false;
  previewError: string | null = null;
  private previewTimeout: any;

  ngOnInit() {
    this.eventId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.loadData();
  }

  loadData() {
    let eventLoaded = false;
    let plansLoaded = false;

    const checkLoaded = () => {
      if (eventLoaded && plansLoaded) {
        this.isLoadingGlobal = false;
        if (this.plans.length > 0) {
          const currentPlan = this.plans.find(p => p.planId === this.event?.advertisementPlanId);
          this.selectTier(currentPlan || this.plans[0]);
        }
      }
    };

    // 1. Fetch Event
    this.eventService.findByIdEvent(this.eventId).subscribe({
      next: (event) => {
        this.event = event;
        
        // Fetch Venue details
        if (event.venueId) {
          this.venueService.findVenueById(event.venueId).subscribe({
            next: (venue) => {
              this.venueName = venue.title;
              eventLoaded = true;
              checkLoaded();
            },
            error: (err) => {
              console.error("Error loading venue:", err);
              this.venueName = 'Ubicación no disponible';
              eventLoaded = true;
              checkLoaded();
            }
          });
        } else {
          this.venueName = 'Sin ubicación asignada';
          eventLoaded = true;
          checkLoaded();
        }

        // Fetch Event image if exists
        if (event.hasImage) {
          this.eventService.getEventImage(event.id).subscribe({
            next: (blob) => {
              this.eventImageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            },
            error: (err) => {
              console.warn("Error fetching event image:", err);
              this.eventImageUrl = null;
            }
          });
        }
      },
      error: (err) => {
        console.error("Error loading event:", err);
        this.snackBar.open("Error al cargar la información del evento", "Cerrar", { duration: 3000 });
        this.isLoadingGlobal = false;
      }
    });

    // 2. Fetch Plans
    this.advertisementService.getActivePlans().subscribe({
      next: (plans) => {
        this.plans = plans.map(p => {
          let id = 'cool';
          let icon = 'waves';
          let description = 'Posicionamiento básico en búsquedas y categorías recomendadas.';

          const nameUpper = p.name.toUpperCase();
          if (nameUpper.includes('MEDIUM') || nameUpper.includes('DESTACADO')) {
            id = 'super';
            icon = 'vibration';
            description = 'Posicionamiento destacado en búsquedas y categorías recomendadas.';
          } else if (nameUpper.includes('HIGH') || nameUpper.includes('PREMIUM') || nameUpper.includes('MEGA')) {
            id = 'mega';
            icon = 'graphic_eq';
            description = 'Presencia total: Home carousel y publicación en redes sociales de VibeCheck.';
          }

          return {
            id,
            planId: p.id,
            name: p.name,
            displayName: p.displayName,
            pricePerDayVbk: p.pricePerDayVbk,
            pricePerDayUsdc: p.pricePerDayUsdc,
            icon,
            description,
            availableSlots: p.availableSlots
          };
        });

        plansLoaded = true;
        checkLoaded();
      },
      error: (err) => {
        console.error("Error loading plans:", err);
        this.snackBar.open("Error al cargar planes de publicidad", "Cerrar", { duration: 3000 });
        this.isLoadingGlobal = false;
      }
    });
  }

  selectTier(tier: AdvertiseTier) {
    this.selectedTier = tier;
    this.calculateTotal();
  }

  onDurationChange() {
    if (this.durationDays < 1) {
      this.durationDays = 1;
    } else if (this.durationDays > 365) {
      this.durationDays = 365;
    }
    this.calculateTotal();
  }

  calculateTotal() {
    if (!this.selectedTier) {
      this.originalTotalVbk = 0;
      this.finalTotalVbk = 0;
      this.discountVbk = 0;
      return;
    }

    this.isPreviewing = true;
    this.previewError = null;

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }

    this.previewTimeout = setTimeout(() => {
      this.advertisementService.previewPromotion(this.eventId, this.selectedTier!.planId, this.durationDays)
        .subscribe({
          next: (res) => {
            this.originalTotalVbk = res.originalTotalVbk;
            this.discountVbk = res.discountVbk;
            this.finalTotalVbk = res.finalTotalVbk;
            this.isPreviewing = false;
          },
          error: (err) => {
            this.originalTotalVbk = 0;
            this.discountVbk = 0;
            this.finalTotalVbk = 0;
            this.previewError = err.error?.message || 'Error al calcular el precio.';
            this.isPreviewing = false;
          }
        });
    }, 500);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  confirmAd() {
    if (!this.selectedTier) {
      this.snackBar.open("Por favor, selecciona una estrategia de publicidad", "Cerrar", { duration: 3000 });
      return;
    }

    const request = {
      planId: this.selectedTier.planId,
      durationDays: this.durationDays
    };

    this.advertisementService.promoteEvent(this.eventId, request).subscribe({
      next: (response) => {
        this.snackBar.open(`¡Campaña contratada con éxito! Nivel: ${response.planName}`, "Cerrar", {
          duration: 4000
        });
        this.goBack();
      },
      error: (err) => {
        console.error("Error promoting event:", err);
        const errMsg = err.error?.message || "Ocurrió un error al procesar el pago o la promoción.";
        this.snackBar.open(`Error: ${errMsg}`, "Cerrar", { duration: 5000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin-events']);
  }
}
