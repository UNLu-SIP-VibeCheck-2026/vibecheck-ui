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
            <mat-form-field appearance="outline" class="custom-mat-form-field">
              <input matInput id="name" formControlName="name" placeholder="Ej: Estadio Monumental">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label for="address">Dirección</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field">
              <input matInput id="address" formControlName="address" placeholder="Ej: Av. Figueroa Alcorta 7597">
            </mat-form-field>
          </div>

          <div class="multi-row">
            <div class="form-group half">
              <label for="city">Ciudad</label>
              <mat-form-field appearance="outline" class="custom-mat-form-field">
                <input matInput id="city" formControlName="city" placeholder="Ej: CABA">
              </mat-form-field>
            </div>
            <div class="form-group half">
              <label for="country">País</label>
              <mat-form-field appearance="outline" class="custom-mat-form-field">
                <input matInput id="country" formControlName="country" placeholder="Ej: Argentina">
              </mat-form-field>
            </div>
          </div>

          <div class="form-group">
            <label for="capacity">Capacidad Máxima</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field">
              <input matInput type="number" id="capacity" formControlName="capacity">
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
        <button mat-stroked-button class="btn-cancel" (click)="onCancel()">Cancelar</button>
        <button mat-raised-button class="btn-submit" [disabled]="venueForm.invalid" (click)="onSubmit()">Crear Venue</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .venue-dialog-container { padding: 12px 24px; font-family: 'Inter', sans-serif; max-width: 500px; }
    h2 { font-weight: 700; margin-bottom: 24px; color: #1a1a1a; }
    .form-group { margin-bottom: 16px; display: flex; flex-direction: column; }
    label { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .multi-row { display: flex; gap: 16px; .half { flex: 1; } }
    .custom-mat-form-field { width: 100%; ::ng-deep .mat-mdc-form-field-flex { height: 48px !important; border-radius: 8px !important; } }
    .toggle-group { margin-top: 12px; }
    .dialog-actions { display: flex; gap: 16px; margin-top: 32px; padding: 0 !important; }
    .dialog-actions button { flex: 1; height: 48px !important; font-size: 15px !important; font-weight: 500 !important; border-radius: 8px !important; }
    .btn-submit { background-color: #2b2b2b !important; color: #ffffff !important; }
    .btn-cancel { border: 1px solid #4a4a4a !important; color: #4a4a4a !important; }
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
