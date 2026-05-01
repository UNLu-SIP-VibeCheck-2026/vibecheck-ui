import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-venue-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="venue-dialog-container">
      <h2 mat-dialog-title>Dar de alta nuevo Venue</h2>
      <mat-dialog-content>
        <form [formGroup]="venueForm">
          <div class="form-group">
            <label for="name">Nombre del Venue</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <input matInput id="name" formControlName="name" placeholder="Ej: Estadio Monumental">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label for="address">Dirección</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <input matInput id="address" formControlName="address" placeholder="Ej: Av. Figueroa Alcorta 7597">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label for="city">Ciudad</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <input matInput id="city" formControlName="city" placeholder="Ej: CABA">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label for="country">País</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <input matInput id="country" formControlName="country" placeholder="Ej: Argentina">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label for="capacity">Capacidad Máxima</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <input matInput type="number" id="capacity" formControlName="capacity" placeholder="0">
            </mat-form-field>
          </div>

          <div class="form-group toggle-group">
            <mat-slide-toggle formControlName="isPublic">
              ¿Hacer este Venue público para otros usuarios?
            </mat-slide-toggle>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions class="dialog-actions">
        <button mat-raised-button class="btn-submit" [disabled]="venueForm.invalid" (click)="onSubmit()">Crear Venue</button>
        <button mat-button class="btn-cancel" (click)="onCancel()">Cancelar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .venue-dialog-container { 
      padding: 12px 16px; 
      font-family: 'Outfit', sans-serif; 
      max-width: 500px;
      color: #ffffff;
    }
    
    h2 { 
      font-weight: 700; 
      margin-bottom: 24px !important; 
      color: #ffffff;
      font-size: 24px;
      padding: 0 !important;
    }

    .form-group { 
      margin-bottom: 20px; 
      display: flex; 
      flex-direction: column; 
    }

    label { 
      font-size: 13px; 
      font-weight: 700; 
      color: #ffffff; 
      margin-bottom: 8px; 
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.8;
    }

    .custom-mat-form-field { 
      width: 100%; 
      
      ::ng-deep {
        .mat-mdc-form-field-flex { 
          height: 52px !important; 
          border-radius: 8px !important; 
          background-color: rgba(255, 255, 255, 0.05) !important;
          align-items: center !important;
        }
        
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }

        .mat-mdc-input-element {
          color: #ffffff !important;
        }

        .mat-mdc-form-field-infix {
          display: flex !important;
          align-items: center !important;
          padding: 0 12px !important;
        }
      }

      &.mat-focused ::ng-deep {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: var(--md-sys-color-primary, #a855f7) !important;
          border-width: 2px !important;
        }
      }
    }

    .toggle-group { 
      margin-top: 8px;
      
      ::ng-deep .mdc-label {
        color: #ffffff;
        font-size: 14px;
        opacity: 0.9;
      }
    }

    .dialog-actions { 
      display: flex; 
      gap: 16px; 
      margin-top: 32px; 
      padding: 0 !important; 
    }

    .dialog-actions button { 
      flex: 1; 
      height: 52px !important; 
      font-size: 16px !important; 
      font-weight: 600 !important; 
      border-radius: 12px !important; 
    }

    .btn-submit { 
      background: linear-gradient(135deg, #a855f7 0%, #f97316 100%) !important; 
      color: #ffffff !important;
      border: none !important;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3) !important;
      
      &:disabled {
        background: rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.3) !important;
        box-shadow: none !important;
      }
    }

    .btn-cancel { 
      border: 1px solid rgba(255, 255, 255, 0.2) !important; 
      color: #ffffff !important; 
      background: transparent !important;
      
      &:hover {
        background: rgba(255, 255, 255, 0.05) !important;
      }
    }
  `]
})
export class VenueDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<VenueDialogComponent>);

  venueForm!: FormGroup;

  ngOnInit(): void {
    this.venueForm = this.fb.group({
      name: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['Argentina', [Validators.required]],
      capacity: ['', [Validators.required, Validators.min(1)]],
      isPublic: [true]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.venueForm.valid) {
      this.dialogRef.close(this.venueForm.value);
    }
  }
}
