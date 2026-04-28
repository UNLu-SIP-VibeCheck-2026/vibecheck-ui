import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resale-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="resale-dialog-container">
      <h2 mat-dialog-title>Configurar Reventa</h2>
      <mat-dialog-content>
        <p class="subtitle">Evento: {{ data.event.title }}</p>
        <form [formGroup]="resaleForm">
          <div class="form-group">
            <label for="maxResalePrice">Precio máximo de entrada revendida ($VBK)</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field">
              <span matPrefix class="prefix">$</span>
              <input matInput type="number" id="maxResalePrice" formControlName="maxResalePrice" placeholder="Ej: 500">
              <mat-error *ngIf="resaleForm.get('maxResalePrice')?.hasError('required')">
                El precio es requerido
              </mat-error>
              <mat-error *ngIf="resaleForm.get('maxResalePrice')?.hasError('min')">
                Debe ser mayor a 0
              </mat-error>
            </mat-form-field>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button class="btn-cancel" (click)="onCancel()">Cancelar</button>
        <button mat-raised-button class="btn-submit" [disabled]="resaleForm.invalid" (click)="onSubmit()">Guardar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .resale-dialog-container { padding: 12px 24px; font-family: 'Inter', sans-serif; min-width: 380px; }
    h2 { font-weight: 700; margin-bottom: 8px; color: #1a1a1a; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .form-group { display: flex; flex-direction: column; margin-bottom: 24px; }
    label { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .custom-mat-form-field { width: 100%; ::ng-deep .mat-mdc-form-field-flex { height: 48px !important; border-radius: 8px !important; } }
    .prefix { margin-right: 8px; font-weight: 600; color: #1a1a1a; }
    .dialog-actions { display: flex; gap: 16px; margin-top: 16px; padding: 0 !important; }
    .dialog-actions button { flex: 1; height: 48px !important; font-size: 15px !important; font-weight: 500 !important; border-radius: 8px !important; }
    .btn-submit { background-color: #2b2b2b !important; color: #ffffff !important; }
    .btn-cancel { border: 1px solid #4a4a4a !important; color: #4a4a4a !important; }
  `]
})
export class ResaleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ResaleDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);

  resaleForm!: FormGroup;

  ngOnInit(): void {
    this.resaleForm = this.fb.group({
      maxResalePrice: [this.data?.event?.maxResalePrice || '', [Validators.required, Validators.min(1)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.resaleForm.valid) {
      this.dialogRef.close(this.resaleForm.value);
    }
  }
}
