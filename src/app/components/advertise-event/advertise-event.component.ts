import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ethers } from 'ethers';
import { EventService } from '../../services/event.service';
import { VenueService } from '../../services/venue.service';
import { AdvertisementService } from '../../services/advertisement.service';
import { Web3Service } from '../../services/web3.service';
import { ContractsService } from '../../services/contracts.service';
import { environment } from '../../../environments/environment';

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
      <!-- STEPPER VISUAL -->
      <div class="stepper-container">
        <div class="step-item" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() > 1">check</mat-icon>
            <span *ngIf="currentStep() <= 1">1</span>
          </div>
          <span class="step-label">Conectar</span>
        </div>
        <div class="step-line" [class.completed]="currentStep() > 1"></div>

        <div class="step-item" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2" [class.pending]="currentStep() < 2">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() > 2">check</mat-icon>
            <span *ngIf="currentStep() <= 2">2</span>
          </div>
          <span class="step-label">Vincular</span>
        </div>
        <div class="step-line" [class.completed]="currentStep() > 2"></div>

        <div class="step-item" [class.active]="currentStep() === 3" [class.completed]="currentStep() > 3" [class.pending]="currentStep() < 3">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() > 3">check</mat-icon>
            <span *ngIf="currentStep() <= 3">3</span>
          </div>
          <span class="step-label">Configurar</span>
        </div>
        <div class="step-line" [class.completed]="currentStep() > 3"></div>

        <div class="step-item" [class.active]="currentStep() === 4" [class.completed]="currentStep() > 4" [class.pending]="currentStep() < 4">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() > 4">check</mat-icon>
            <span *ngIf="currentStep() <= 4">4</span>
          </div>
          <span class="step-label">Pagar</span>
        </div>
        <div class="step-line" [class.completed]="currentStep() > 5"></div>

        <div class="step-item" [class.active]="currentStep() === 5" [class.completed]="currentStep() >= 5 && successAd()" [class.pending]="currentStep() < 5">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() >= 5 && successAd()">check</mat-icon>
            <span *ngIf="currentStep() < 5 || !successAd()">5</span>
          </div>
          <span class="step-label">Confirmar</span>
        </div>
      </div>

      <!-- ERROR DISPLAY UNDER ACTIVE STEP -->
      <div class="error-banner" *ngIf="errorMessage()">
        <mat-icon>error_outline</mat-icon>
        <p class="error-text">{{ errorMessage() }}</p>
        <button *ngIf="currentStep() === 1 && errorMessage().includes('Sepolia')" (click)="checkNetwork()" class="retry-btn" style="margin-left: auto;">
          Verificar Red Sepolia
        </button>
      </div>

      <!-- STEP VIEW: 1. CONNECT WALLET -->
      <div class="step-view" *ngIf="currentStep() === 1">
        <div class="card-prompt">
          <div class="icon-avatar">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <h2>Conectá tu Wallet</h2>
          <p>Para contratar publicidad para tus eventos en VibeCheck, primero necesitás conectar tu billetera MetaMask en la red Sepolia.</p>
          <div class="wallet-actions">
            <button (click)="connectWallet()" class="btn-cta" [disabled]="isLoading()">
              <mat-icon>extension</mat-icon>
              <span>Conectar MetaMask</span>
            </button>
          </div>
        </div>
      </div>

      <!-- STEP VIEW: 2. LINK WALLET (SIWE) -->
      <div class="step-view" *ngIf="currentStep() === 2">
        <div class="card-prompt">
          <div class="icon-avatar">
            <mat-icon>verified_user</mat-icon>
          </div>
          <h2>Vinculación con SIWE</h2>
          <p class="address-muted">Billetera conectada: <code>{{ truncateAddress(connectedAddress()) }}</code></p>
          <p>Confirmá que sos el dueño de esta billetera firmando un mensaje seguro sin costo de gas (SIWE).</p>

          <div class="challenge-box" *ngIf="siweMessage()">
            <span class="challenge-title">Mensaje a firmar:</span>
            <pre class="challenge-text">{{ siweMessage() }}</pre>
          </div>

          <div class="wallet-actions">
            <button (click)="signAndVerify()" class="btn-cta" [disabled]="isLoading() || !siweMessage()">
              <mat-icon>gesture</mat-icon>
              <span>Firmar y Vincular Billetera</span>
            </button>
          </div>
        </div>
      </div>

      <!-- STEP VIEW: 3. CONFIGURE CAMPAIGN AND PAYMENT OPTIONS -->
      <div class="layout" *ngIf="currentStep() === 3">
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
                    <span class="tier-price">{{ tier.pricePerDayUsdc | number:'1.2-2' }} USDC / día</span>
                    <span class="tier-price-vbk" style="font-size: 0.82rem; color: var(--md-sys-color-outline); margin-top: 2px;">
                      ≈ {{ tier.pricePerDayVbk | number:'1.2-2' }} VBK / día
                    </span>
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
                <span class="highlight">{{ selectedTier.pricePerDayUsdc | number:'1.2-2' }} USDC</span>
              </div>
              <div class="summary-row" *ngIf="discountUsdc > 0" style="color: var(--md-sys-color-tertiary);">
                <span>Descuento por upgrade</span>
                <span class="highlight">-{{ discountUsdc | number:'1.2-2' }} USDC</span>
              </div>
              <div class="summary-divider"></div>
              
              <div class="disclaimer" *ngIf="previewError">
                <mat-icon style="color: var(--md-sys-color-error)">error</mat-icon>
                <p style="color: var(--md-sys-color-error)">{{ previewError }}</p>
              </div>
              
              <div class="disclaimer" *ngIf="!previewError && discountUsdc > 0">
                <mat-icon style="color: var(--md-sys-color-tertiary)">loyalty</mat-icon>
                <p>¡Se ha aplicado un descuento proporcional por los días no usados de tu plan actual!</p>
              </div>

              <!-- Payment Choice Panels (USDC vs VBK with Fee differentiation) -->
              <div class="payment-options" *ngIf="!previewError">
                <h4 class="payment-title">Elegí tu Método de Pago</h4>
                
                <!-- VBK Option (glowing premium box with 0% fee recommendation) -->
                <div class="payment-box premium-vbk-box">
                  <div class="discount-ribbon">RECOMENDADO</div>
                  <div class="payment-details">
                    <div class="price-line">
                      <span class="coin-symbol"><mat-icon>local_activity</mat-icon> VBK</span>
                      <span class="price-val" *ngIf="!isPreviewing">{{ finalTotalVbk | number:'1.2-2' }} VBK</span>
                      <span class="price-val" *ngIf="isPreviewing" style="font-size: 0.95rem; opacity: 0.7;">Calculando...</span>
                    </div>
                    <span class="fee-disclaimer">Cargo de servicio: <strong>0% (¡Gratis!)</strong></span>
                  </div>
                  <button mat-raised-button class="pay-btn-vbk" (click)="confirmAd('VBK')" [disabled]="isPreviewing">
                    PAGAR CON VIBECHECK ($VBK)
                  </button>
                </div>

                <!-- USDC Option (subdued standard box with 10% fee) -->
                <div class="payment-box standard-usdc-box">
                  <div class="payment-details">
                    <div class="price-line">
                      <span class="coin-symbol"><mat-icon>credit_card</mat-icon> USDC</span>
                      <span class="price-val" *ngIf="!isPreviewing">{{ finalTotalUsdcWithFee | number:'1.2-2' }} USDC</span>
                      <span class="price-val" *ngIf="isPreviewing" style="font-size: 0.95rem; opacity: 0.7;">Calculando...</span>
                    </div>
                    <span class="fee-disclaimer">
                      Subtotal: {{ finalTotalUsdc | number:'1.2-2' }} USDC + 10% Fee ({{ (finalTotalUsdc * 0.1) | number:'1.2-2' }} USDC)
                    </span>
                  </div>
                  <button mat-raised-button class="pay-btn-usdc" (click)="confirmAd('USDC')" [disabled]="isPreviewing">
                    Pagar con USDC
                  </button>
                </div>
              </div>
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

      <!-- STEP VIEW: 4. ON-CHAIN TRANSACTION IN PROGRESS -->
      <div class="step-view" *ngIf="currentStep() === 4">
        <div class="card-prompt transaction-prompt">
          <div class="spinner-container">
            <div class="pulse-loader"></div>
            <mat-spinner diameter="50"></mat-spinner>
          </div>
          <h2>Transacción en Progreso</h2>
          <p>Confirmando el pago de tu publicidad en la red Ethereum Sepolia...</p>
          <p class="warning-alert">
            <mat-icon>warning</mat-icon>
            <span>Por favor, no cierres esta ventana ni recargues la página. La confirmación en la blockchain puede tardar unos segundos.</span>
          </p>
        </div>
      </div>

      <!-- STEP VIEW: 5. CONFIRMATION AND SUCCESS -->
      <div class="step-view" *ngIf="currentStep() === 5">
        <!-- Backend Registration Loading -->
        <div class="card-prompt" *ngIf="isLoading() && !successAd()">
          <mat-spinner diameter="40" style="margin: 0 auto;"></mat-spinner>
          <h2 style="margin-top: 20px;">Activando Promoción</h2>
          <p>Registrando tu campaña publicitaria en los servidores de VibeCheck...</p>
        </div>

        <!-- Success receipt -->
        <div class="success-screen" *ngIf="successAd() as ad">
          <div class="success-badge">
            <mat-icon>check_circle</mat-icon>
          </div>
          <h2>¡Campaña Contratada!</h2>
          <p class="success-subtitle">Tu evento ya cuenta con el posicionamiento del plan contratado.</p>

          <div class="ticket-receipt">
            <div class="receipt-header">
              <h3>Detalles de la Publicidad</h3>
            </div>
            <div class="receipt-body">
              <div class="receipt-row">
                <span class="label">Nivel del Plan:</span>
                <span class="val font-highlight">{{ ad.planName }}</span>
              </div>
              <div class="receipt-row">
                <span class="label">Duración:</span>
                <span class="val">{{ ad.durationDays }} días</span>
              </div>
              <div class="receipt-row">
                <span class="label">Vencimiento:</span>
                <span class="val">{{ formatDate(ad.expirationDate) }}</span>
              </div>
              <div class="receipt-row separator">
                <span class="label">Estado de Transacción:</span>
                <span class="val status-confirmed">EXITOSO</span>
              </div>
              <div class="receipt-row" *ngIf="purchaseTxHash()">
                <span class="label">Transacción:</span>
                <span class="val">
                  <a [href]="'https://sepolia.etherscan.io/tx/' + purchaseTxHash()" target="_blank" class="etherscan-link">
                    <span>{{ truncateAddress(purchaseTxHash()) }}</span>
                    <mat-icon>open_in_new</mat-icon>
                  </a>
                </span>
              </div>
            </div>
          </div>

          <div class="success-actions">
            <button (click)="goBack()" class="btn-cta">
              <mat-icon>dashboard</mat-icon>
              <span>Volver a Mis Eventos</span>
            </button>
          </div>
        </div>

        <!-- Error fallback (Tx completed but backend registration failed) -->
        <div class="error-screen" *ngIf="!isLoading() && !successAd() && errorMessage()">
          <div class="card-prompt" style="max-width: 550px;">
            <div class="icon-avatar" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
              <mat-icon>warning</mat-icon>
            </div>
            <h2>Falla de Registro</h2>
            <p>{{ errorMessage() }}</p>
            <div class="address-muted" *ngIf="purchaseTxHash()">
              Tx Hash: <code>{{ purchaseTxHash() }}</code>
            </div>
            <div class="wallet-actions">
              <button (click)="goBack()" class="btn-cta btn-secondary" style="background: rgba(255, 255, 255, 0.05) !important;">
                Volver a Mis Eventos
              </button>
            </div>
          </div>
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
      grid-template-columns: 1fr 400px;
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

    /* Stepper Styling */
    .stepper-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-8);
      max-width: 600px;
      margin: 0 auto var(--space-8) auto;
      background: rgba(255, 255, 255, 0.02);
      padding: 16px 24px;
      border-radius: 50px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
      z-index: 2;
      
      &.active {
        .step-badge {
          background: var(--gradient-brand);
          color: white;
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
          border-color: transparent;
        }
        .step-label {
          color: white;
          font-weight: 700;
        }
      }
      
      &.completed {
        .step-badge {
          background: var(--md-sys-color-tertiary, #00d2ff);
          color: black;
          border-color: transparent;
        }
        .step-label {
          color: var(--md-sys-color-tertiary, #00d2ff);
        }
      }

      &.pending {
        opacity: 0.5;
      }
    }

    .step-badge {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface-container);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.3s ease;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .step-label {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.3s ease;
    }

    .step-line {
      flex: 1;
      height: 2px;
      background: var(--md-sys-color-outline-variant);
      margin: 0 12px;
      margin-bottom: 20px; /* Offset for step label height */
      transition: all 0.3s ease;
      
      &.completed {
        background: var(--md-sys-color-tertiary, #00d2ff);
      }
    }

    /* Error Banners */
    .error-banner {
      display: flex;
      gap: 12px;
      padding: var(--space-4) var(--space-5);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 12px;
      margin-bottom: var(--space-6);
      color: #f87171;
      align-items: center;
      
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
      p { margin: 0; font-size: 0.85rem; line-height: 1.4; }
    }

    /* Step view panels */
    .step-view {
      animation: fadeIn 0.4s ease;
    }

    .card-prompt {
      max-width: 500px;
      margin: 0 auto;
      text-align: center;
      padding: var(--space-8);
      background: var(--md-sys-color-surface-container-high);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 24px;
      
      .icon-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(168, 85, 247, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--md-sys-color-primary);
        margin: 0 auto var(--space-5) auto;
        
        mat-icon { font-size: 32px; width: 32px; height: 32px; }
      }
      
      h2 { font-weight: 800; margin-bottom: var(--space-3); }
      p { color: var(--md-sys-color-on-surface-variant); line-height: 1.6; margin-bottom: var(--space-6); }
    }

    .address-muted {
      background: rgba(255, 255, 255, 0.05);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      display: inline-block;
      margin-bottom: var(--space-4);
      code { color: var(--md-sys-color-tertiary); }
    }

    .challenge-box {
      text-align: left;
      background: #090d16;
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 12px;
      padding: var(--space-4);
      margin-bottom: var(--space-6);
      
      .challenge-title { font-weight: 700; font-size: 0.75rem; color: var(--md-sys-color-outline); display: block; margin-bottom: 6px; }
      .challenge-text { margin: 0; font-family: monospace; font-size: 0.8rem; white-space: pre-wrap; color: #cbd5e1; }
    }

    .btn-cta {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      background: var(--gradient-brand) !important;
      color: white !important;
      font-weight: 700;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
      
      &:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
    }

    /* Step 4 Loading prompt */
    .transaction-prompt {
      padding: var(--space-10);
      
      .spinner-container {
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto var(--space-6) auto;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .pulse-loader {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(168, 85, 247, 0.2);
          animation: pulse 2s infinite ease-in-out;
        }
      }
      
      .warning-alert {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: rgba(234, 179, 8, 0.1);
        border: 1px solid rgba(234, 179, 8, 0.25);
        border-radius: 8px;
        color: #fef08a;
        font-size: 0.75rem;
        line-height: 1.4;
        text-align: left;
        align-items: flex-start;
        mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
      }
    }

    /* Step 5 Success screen */
    .success-screen {
      max-width: 550px;
      margin: 0 auto;
      text-align: center;
      animation: fadeIn 0.5s ease;
      
      .success-badge {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto var(--space-4) auto;
        
        mat-icon { font-size: 48px; width: 48px; height: 48px; }
      }
      
      h2 { font-weight: 800; font-size: 2rem; margin-bottom: 4px; }
      .success-subtitle { color: var(--md-sys-color-on-surface-variant); margin-bottom: var(--space-6); }
    }

    .ticket-receipt {
      background: var(--md-sys-color-surface-container-high);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: var(--space-6);
      text-align: left;
      
      .receipt-header {
        background: rgba(255, 255, 255, 0.02);
        padding: 16px var(--space-5);
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
      }
      
      .receipt-body {
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      
      .receipt-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        
        .label { color: var(--md-sys-color-on-surface-variant); }
        .val { color: white; font-weight: 600; }
        .font-highlight { font-weight: 700; color: var(--md-sys-color-primary); }
        .code-badge { font-family: monospace; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; }
        .status-confirmed { color: #10b981; font-weight: 700; }
        
        &.separator {
          border-top: 1px solid var(--md-sys-color-outline-variant);
          padding-top: var(--space-3);
          margin-top: var(--space-1);
        }
      }
    }

    .etherscan-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--md-sys-color-tertiary);
      text-decoration: none;
      &:hover { text-decoration: underline; }
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    /* Payment visual panels styling */
    .payment-options {
      margin-top: var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .payment-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: white;
    }

    .payment-box {
      position: relative;
      border-radius: 16px;
      padding: var(--space-5);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      overflow: hidden;
      transition: all 0.3s ease;
      text-align: left;
    }

    .premium-vbk-box {
      border: 2px solid var(--md-sys-color-primary) !important;
      background: rgba(168, 85, 247, 0.04) !important;
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.15);
      
      &:hover {
        box-shadow: 0 0 25px rgba(168, 85, 247, 0.3);
        background: rgba(168, 85, 247, 0.06) !important;
      }
    }

    .discount-ribbon {
      position: absolute;
      top: 12px;
      right: -35px;
      background: linear-gradient(90deg, #ec4899 0%, #f97316 100%);
      color: white;
      font-size: 0.65rem;
      font-weight: 900;
      padding: 4px 35px;
      transform: rotate(45deg);
      box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3);
      letter-spacing: 0.5px;
    }

    .payment-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .price-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .coin-symbol {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        color: white;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }
      
      .price-val {
        font-size: 1.4rem;
        font-weight: 800;
        color: white;
      }
    }

    .fee-disclaimer {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      
      strong {
        color: var(--md-sys-color-tertiary, #00d2ff);
      }
    }

    .pay-btn-vbk {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%) !important;
      color: white !important;
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4) !important;
      transition: all 0.3s ease !important;
      border: none !important;
      
      @keyframes button-pulse {
        0% { transform: scale(1); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4); }
        50% { transform: scale(1.02); box-shadow: 0 6px 22px rgba(236, 72, 153, 0.7), 0 0 10px rgba(168, 85, 247, 0.5); }
        100% { transform: scale(1); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4); }
      }
      
      animation: button-pulse 2.5s infinite ease-in-out;
      
      &:hover {
        animation: none;
        transform: scale(1.03);
        filter: brightness(1.1);
        box-shadow: 0 8px 25px rgba(236, 72, 153, 0.8) !important;
      }
    }

    .pay-btn-usdc {
      width: 100%;
      height: 46px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05) !important;
      color: white !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      font-weight: 700;
      font-size: 0.9rem;
      transition: all 0.2s ease !important;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
      }
    }

    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.1); opacity: 0.1; }
      100% { transform: scale(0.9); opacity: 0.6; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
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
  private http = inject(HttpClient);
  private web3Service = inject(Web3Service);

  eventId = 0;
  event: any = null;
  eventImageUrl: SafeUrl | null = null;
  venueName = 'Cargando ubicación...';

  plans: AdvertiseTier[] = [];
  selectedTier: AdvertiseTier | null = null;

  durationDays = 7;
  originalTotalUsdc = 0;
  discountUsdc = 0;
  finalTotalUsdc = 0;
  finalTotalUsdcWithFee = 0;

  originalTotalVbk = 0;
  discountVbk = 0;
  finalTotalVbk = 0;

  isLoadingGlobal = true;

  // Wallet and Stepper Wizard states
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  connectedAddress = signal<string | null>(null);
  isSepolia = signal<boolean>(false);
  siweMessage = signal<string>('');

  // Transaction confirmations
  purchaseTxHash = signal<string>('');
  isPreviewing = false;
  previewError: string | null = null;
  successAd = signal<any | null>(null);

  private previewTimeout: any;

  ngOnInit() {
    this.eventId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.loadData();

    this.web3Service.connectedAddress$.subscribe(addr => {
      this.connectedAddress.set(addr);
      this.checkConnectionState();
    });

    // Regla 3: suscripción a chainId$ para detectar la red real de inmediato
    // durante el switch y evitar desincronización con isSepolia$.
    this.web3Service.chainId$.subscribe(chainId => {
      this.isSepolia.set(chainId === 11155111);
      this.checkConnectionState();
    });
  }

  checkConnectionState() {
    const address = this.connectedAddress();
    // Regla 3: leer chainId sincrónico para evitar falsos positivos durante el switch de red
    const chainId = this.web3Service.chainId$.getValue();
    const sepolia = chainId === 11155111;

    if (!address || !sepolia) {
      this.currentStep.set(1);
      if (address && !sepolia) {
        this.errorMessage.set('Cambiá a la red Sepolia para continuar.');
        this.web3Service.switchToSepolia();
      }
      return;
    }

    if (this.currentStep() === 1) {
      this.currentStep.set(2);
      this.startSiweFlow();
    }
  }

  // Regla 1: sin async/await — Safari mobile invalida el gesto del usuario
  // en el primer await, bloqueando el deeplink a MetaMask.
  connectWallet(): void {
    this.errorMessage.set('');
    this.web3Service.connectWallet();
  }

  // Regla 3/4: verificación y switch de red sincrónicos — sin await antes de MetaMask.
  checkNetwork(): void {
    this.errorMessage.set('');
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage.set('Cambiá a la red Sepolia');
      this.web3Service.switchToSepolia();
    }
  }

  startSiweFlow() {
    const address = this.connectedAddress();
    if (!address) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/challenge`, { walletAddress: address }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.walletAddress && res.walletAddress.toLowerCase() === address.toLowerCase()) {
          this.currentStep.set(3);
          return;
        }

        if (res && res.message) {
          this.siweMessage.set(res.message);
        } else {
          this.errorMessage.set('No se pudo obtener el mensaje de firma.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('La billetera ya está vinculada a otro usuario.');
        } else {
          this.errorMessage.set(err.error?.message || 'Error al solicitar el desafío SIWE.');
        }
      }
    });
  }

  async signAndVerify() {
    const address = this.connectedAddress();
    const message = this.siweMessage();
    if (!address || !message) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const signature = await this.web3Service.signMessage(message);
      this.http.post<any>(`${environment.apiBaseUrl}/users/me/wallet/verify`, {
        walletAddress: address,
        message,
        signature
      }).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.currentStep.set(3);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 409) {
            this.errorMessage.set('La billetera ya está vinculada a otro usuario.');
          } else {
            this.errorMessage.set(err.error?.message || 'Error al verificar la firma.');
          }
        }
      });
    } catch (e: any) {
      this.isLoading.set(false);
      console.error('Error al firmar:', e);
      this.errorMessage.set('Firma cancelada o rechazada por el usuario.');
    }
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
        const mappedPlans = plans.map(p => {
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
            pricePerDayVbk: 0, // Converted dynamically below
            pricePerDayUsdc: p.pricePerDayUsdc,
            icon,
            description,
            availableSlots: p.availableSlots
          };
        });

        // Convert Plan USDC price to VBK price dynamically
        const quotePromises = mappedPlans.map(async (p) => {
          try {
            if (p.pricePerDayUsdc > 0) {
              const quoteBig = await this.web3Service.quoteUsdcToVbk(p.pricePerDayUsdc);
              p.pricePerDayVbk = parseFloat(ethers.formatUnits(quoteBig, 18));
            } else {
              p.pricePerDayVbk = 0;
            }
          } catch (err) {
            console.error("Error quoting daily VBK for plan " + p.planId, err);
            p.pricePerDayVbk = 0;
          }
          return p;
        });

        Promise.all(quotePromises).then(resolvedPlans => {
          this.plans = resolvedPlans;
          plansLoaded = true;
          checkLoaded();
        });
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
    } else if (this.durationDays > 90) {
      this.durationDays = 90;
    }
    this.calculateTotal();
  }

  calculateTotal() {
    if (!this.selectedTier) {
      this.originalTotalUsdc = 0;
      this.finalTotalUsdc = 0;
      this.discountUsdc = 0;
      this.finalTotalUsdcWithFee = 0;
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
            this.originalTotalUsdc = res.originalTotalUsdc;
            this.discountUsdc = res.discountUsdc;
            this.finalTotalUsdc = res.finalTotalUsdc;
            this.finalTotalUsdcWithFee = this.finalTotalUsdc * 1.10;

            if (this.finalTotalUsdc > 0) {
              this.web3Service.quoteUsdcToVbk(this.finalTotalUsdc).then(quote => {
                this.finalTotalVbk = parseFloat(ethers.formatUnits(quote, 18));
                this.originalTotalVbk = this.finalTotalVbk;
                this.discountVbk = 0;
                this.isPreviewing = false;
              }).catch(err => {
                console.error("Error quoting VBK total:", err);
                this.finalTotalVbk = 0;
                this.isPreviewing = false;
              });
            } else {
              this.finalTotalVbk = 0;
              this.originalTotalVbk = 0;
              this.discountVbk = 0;
              this.isPreviewing = false;
            }
          },
          error: (err) => {
            this.originalTotalUsdc = 0;
            this.discountUsdc = 0;
            this.finalTotalUsdc = 0;
            this.finalTotalUsdcWithFee = 0;
            this.originalTotalVbk = 0;
            this.finalTotalVbk = 0;
            this.discountVbk = 0;
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

  async confirmAd(paymentMethod: 'USDC' | 'VBK') {
    if (!this.selectedTier) {
      this.snackBar.open("Por favor, selecciona una estrategia de publicidad", "Cerrar", { duration: 3000 });
      return;
    }

    // Regla 3: verificación sincrónica de red — un await aquí invalida el gesto en
    // Safari mobile y bloquea el deeplink a MetaMask para la transacción.
    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.errorMessage.set("Cambiá la red a Sepolia en MetaMask");
      this.web3Service.switchToSepolia();
      return;
    }

    const wallet = this.connectedAddress();
    if (!wallet) {
      this.errorMessage.set("Por favor conectá tu billetera para pagar.");
      return;
    }

    this.currentStep.set(4);
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const treasuryAddress = this.web3Service.TREASURY_ADDRESS;
      let amountStr = '';

      if (paymentMethod === 'USDC') {
        amountStr = this.finalTotalUsdcWithFee.toFixed(2);
      } else {
        amountStr = this.finalTotalVbk.toFixed(4);
      }

      // Execute Direct Token Transfer to Treasury Wallet
      const txHash = await this.web3Service.sendFunds(treasuryAddress, amountStr, paymentMethod);
      this.purchaseTxHash.set(txHash);

      // Wait for blockchain confirmation receipt
      const provider = this.web3Service.getProvider();
      await provider.waitForTransaction(txHash);

      const request = {
        planId: this.selectedTier.planId,
        durationDays: this.durationDays
      };

      this.advertisementService.promoteEvent(this.eventId, request).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.successAd.set(response);
          this.currentStep.set(5);
        },
        error: (err) => {
          console.error("Error promoting event:", err);
          this.isLoading.set(false);
          this.errorMessage.set(`El pago se acreditó en la blockchain (Hash: ${txHash}) pero ocurrió una falla al registrar la promoción en el servidor.`);
          this.currentStep.set(5);
        }
      });
    } catch (err: any) {
      this.isLoading.set(false);
      this.currentStep.set(3);
      console.error("Ad payment error", err);

      if (err.code === "ACTION_REJECTED" || err.code === 4001 || (err.message && err.message.toLowerCase().includes("user rejected"))) {
        this.errorMessage.set("Transacción cancelada por el usuario.");
      } else if (
        err.code === "INSUFFICIENT_FUNDS" ||
        (err.message && err.message.toLowerCase().includes("insufficient funds")) ||
        (err.message && err.message.toLowerCase().includes("transfer amount exceeds balance"))
      ) {
        this.errorMessage.set(`Fondos insuficientes de ${paymentMethod} para pagar el gas o contratar la publicidad.`);
      } else {
        this.errorMessage.set(err.reason || err.message || "Ocurrió un error inesperado al procesar la transferencia.");
      }
    }
  }

  goBack() {
    this.router.navigate(['/admin-events']);
  }

  truncateAddress(address: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
