import { Component, inject, OnInit, Inject } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { CommonModule } from "@angular/common";
import { VenueService } from "../../../../services/venue.service";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import {
  VenueCreateRequest,
  VenueUpdateRequest,
  VenueResponse,
  VenueVisibility,
} from "../../../../models/venue.model";

export interface VenueDialogData {
  venue?: VenueResponse; // if present → edit mode
}

@Component({
  selector: "app-venue-dialog",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="venue-dialog-container">
      <h2 mat-dialog-title>
        <mat-icon class="title-icon">{{ isEditMode ? 'edit_location' : 'add_location_alt' }}</mat-icon>
        {{ isEditMode ? 'Editar Venue' : 'Nuevo Venue' }}
      </h2>

      <mat-dialog-content>
        <form [formGroup]="venueForm">

          <div class="form-group">
            <label for="title">Nombre del Venue</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <input matInput id="title" formControlName="title"
                     placeholder="Ej: Estadio Monumental">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label for="coordinates">Coordenadas / Dirección</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <mat-icon matPrefix style="margin-right:8px;color:var(--md-sys-color-primary)">location_on</mat-icon>
              <input matInput id="coordinates" formControlName="coordinates"
                     placeholder="Ej: -34.6037,-58.3816  o  Av. Figueroa Alcorta 7597">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label for="capacity">Capacidad Máxima</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <input matInput type="number" id="capacity" formControlName="capacity" placeholder="0">
            </mat-form-field>
          </div>

          <div class="form-group">
            <label>Visibilidad</label>
            <mat-form-field appearance="outline" class="custom-mat-form-field" subscriptSizing="dynamic">
              <mat-select formControlName="visibility" placeholder="Seleccionar...">
                <mat-option [value]="VenueVisibility.PUBLIC">🌍 Público — visible para todos</mat-option>
                <mat-option [value]="VenueVisibility.PRIVATE">🔒 Privado — solo para ti</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="api-error" *ngIf="errorMessage">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage }}</span>
          </div>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-raised-button class="btn-submit"
                [disabled]="venueForm.invalid || isSubmitting"
                (click)="onSubmit()">
          <mat-spinner *ngIf="isSubmitting" diameter="20"></mat-spinner>
          <span *ngIf="!isSubmitting">{{ isEditMode && data.venue?.status !== 'REJECTED' ? 'Guardar cambios' : 'Enviar a Aprobación' }}</span>
        </button>
        <button mat-button class="btn-cancel" (click)="onCancel()">Cancelar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
    .venue-dialog-container {
      padding: 12px 16px;
      font-family: 'Outfit', sans-serif;
      min-width: 420px;
      color: #ffffff;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      margin-bottom: 24px !important;
      color: #ffffff;
      font-size: 22px;
      padding: 0 !important;
    }

    .title-icon {
      background: var(--gradient-brand, linear-gradient(90deg,#7c3aed,#f97316));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .form-group {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
    }

    label {
      font-size: 11px;
      font-weight: 700;
      color: #9ca3af;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .custom-mat-form-field {
      width: 100%;

      ::ng-deep {
        .mat-mdc-form-field-flex {
          height: 52px !important;
          border-radius: 8px !important;
          background-color: rgba(255,255,255,0.04) !important;
          align-items: center !important;
        }
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: rgba(255,255,255,0.1) !important;
        }
        .mdc-text-field--focused .mdc-notched-outline__leading,
        .mdc-text-field--focused .mdc-notched-outline__notch,
        .mdc-text-field--focused .mdc-notched-outline__trailing {
          border-color: var(--md-sys-color-primary, #a855f7) !important;
          border-width: 2px !important;
        }
        .mat-mdc-input-element,
        .mat-mdc-select-value { color: #ffffff !important; }
        .mat-mdc-form-field-infix {
          display: flex !important;
          align-items: center !important;
          padding: 0 12px !important;
        }
      }
    }

    .api-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(248,113,113,0.08);
      border: 1px solid rgba(248,113,113,0.25);
      border-radius: 8px;
      color: #f87171;
      font-size: 14px;
      margin-top: 4px;
    }

    .dialog-actions {
      display: flex;
      gap: 16px;
      margin-top: 28px;
      padding: 0 !important;
    }

    .dialog-actions button {
      flex: 1;
      height: 52px !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      border-radius: 10px !important;
    }

    .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg,#7c3aed 0%,#f97316 100%) !important;
      color: #ffffff !important;
      border: none !important;
      box-shadow: 0 4px 12px rgba(124,58,237,0.3) !important;

      &:disabled {
        background: rgba(255,255,255,0.07) !important;
        color: rgba(255,255,255,0.3) !important;
        box-shadow: none !important;
      }

      ::ng-deep .mat-mdc-progress-spinner circle {
        stroke: #ffffff !important;
      }
    }

    .btn-cancel {
      border: 1px solid rgba(255,255,255,0.15) !important;
      color: #ffffff !important;
      background: transparent !important;

      &:hover { background: rgba(255,255,255,0.05) !important; }
    }
  `,
  ],
})
export class VenueDialogComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<VenueDialogComponent>);
  private venueService = inject(VenueService);

  data: VenueDialogData = inject(MAT_DIALOG_DATA) ?? {};

  venueForm!: FormGroup;
  isSubmitting = false;
  errorMessage = "";
  VenueVisibility = VenueVisibility;

  get isEditMode(): boolean {
    return !!this.data?.venue;
  }

  ngOnInit(): void {
    const v = this.data?.venue;
    this.venueForm = this.fb.group({
      title: [v?.title ?? "", [Validators.required]],
      coordinates: [v?.coordinates ?? "", [Validators.required]],
      capacity: [v?.capacity ?? "", [Validators.required, Validators.min(1)]],
      visibility: [v?.visibility ?? VenueVisibility.PUBLIC, [Validators.required]],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.venueForm.invalid) return;
    this.isSubmitting = true;
    this.errorMessage = "";

    const { title, coordinates, capacity, visibility } = this.venueForm.value;

    const request: VenueCreateRequest | VenueUpdateRequest = {
      title,
      coordinates,
      capacity: Number(capacity),
      visibility,
    };

    const call$ = this.isEditMode
      ? this.venueService.updateVenue(this.data.venue!.id, request as VenueUpdateRequest)
      : this.venueService.createVenue(request as VenueCreateRequest);

    call$.subscribe({
      next: (venue: VenueResponse) => {
        this.isSubmitting = false;
        this.dialogRef.close(venue);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ?? "Ocurrió un error. Intentá de nuevo.";
      },
    });
  }
}
