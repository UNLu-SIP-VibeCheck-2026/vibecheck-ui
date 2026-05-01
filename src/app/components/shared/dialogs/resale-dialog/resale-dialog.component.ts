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
        <p class="event-info">Evento: <span>{{ data.event.title }}</span></p>
        <form [formGroup]="resaleForm">
          <div class="form-group">
            <label for="maxResalePrice">Indicá el precio máximo al cual se podrá revender una entrada del evento:</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <span matPrefix class="currency-prefix">$</span>
              <input matInput type="number" id="maxResalePrice" formControlName="maxResalePrice" placeholder="Ej: 500">
              <span matSuffix class="currency-suffix">$VBK</span>
            </mat-form-field>
            <mat-error *ngIf="resaleForm.get('maxResalePrice')?.invalid && resaleForm.get('maxResalePrice')?.touched">
               <span *ngIf="resaleForm.get('maxResalePrice')?.hasError('required')">El precio es requerido</span>
               <span *ngIf="resaleForm.get('maxResalePrice')?.hasError('min')">Debe ser mayor a 0</span>
            </mat-error>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions class="dialog-actions">
        <button mat-raised-button class="btn-submit" [disabled]="resaleForm.invalid" (click)="onSubmit()">Guardar</button>
        <button mat-button class="btn-cancel" (click)="onCancel()">Cancelar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .resale-dialog-container { 
      padding: 12px 16px; 
      font-family: 'Outfit', sans-serif; 
      max-width: 450px;
      color: #ffffff;
    }
    
    h2 { 
      font-weight: 700; 
      margin-bottom: 12px !important; 
      color: #ffffff;
      font-size: 24px;
      padding: 0 !important;
    }

    .event-info { 
      color: rgba(255, 255, 255, 0.6); 
      font-size: 15px; 
      margin-bottom: 24px;
      
      span {
        color: var(--md-sys-color-primary, #a855f7);
        font-weight: 600;
      }
    }

    .form-group { 
      display: flex; 
      flex-direction: column; 
      margin-bottom: 24px; 
    }

    label { 
      font-size: 14px; 
      font-weight: 500; 
      color: rgba(255, 255, 255, 0.9); 
      margin-bottom: 12px; 
      line-height: 1.4;
    }

    .custom-mat-form-field { 
      width: 100%; 
      margin-top: 4px;
      
      ::ng-deep {
        .mat-mdc-form-field-flex { 
          height: 56px !important; 
          border-radius: 12px !important; 
          background-color: rgba(255, 255, 255, 0.05) !important;
          padding: 0 16px !important;
        }
        
        /* Ensure prefix and suffix are properly centered and spaced */
        .mat-mdc-form-field-prefix, 
        .mat-mdc-form-field-suffix {
          display: flex !important;
          align-items: center !important;
          height: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .mat-mdc-form-field-prefix {
          margin-right: 8px !important;
        }

        .mat-mdc-form-field-suffix {
          margin-left: 8px !important;
        }

        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: rgba(255, 255, 255, 0.1) !important;
          border-width: 1px !important;
        }

        .mat-mdc-input-element {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 18px !important;
          padding: 0 !important;
        }

        /* Remove default padding that might cause overflow */
        .mat-mdc-form-field-infix {
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          min-height: 100% !important;
        }
      }
    }

    .currency-prefix, .currency-suffix {
      font-weight: 700;
      color: var(--md-sys-color-primary, #a855f7);
      font-size: 16px;
    }

    .currency-prefix {
        margin-left: 14px;
        margin-right: 4px;
    }

    .currency-suffix {
        font-size: 14px;
        margin-left: 4px;
        margin-right: 14px;
    }

    mat-error {
        font-size: 12px;
        margin-top: 8px;
        color: #f87171;
    }

    .dialog-actions { 
      display: flex; 
      gap: 12px; 
      margin-top: 16px; 
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
