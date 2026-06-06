import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../services/event.service';
import { ValidatorCreateRequest, ValidatorPasswordRotateRequest, ValidatorResponse } from '../../models/validator-request.model';
import { ConfirmDialogComponent } from '../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { ErrorService } from '../../services/error.service';

@Component({
  selector: 'app-validator-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './validator-management.component.html',
  styleUrl: './validator-management.component.scss'
})
export class ValidatorManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private eventService = inject(EventService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private errorService = inject(ErrorService);

  eventId: number | null = null;
  validators: ValidatorResponse[] = [];
  isLoading = false;
  isCreating = false;
  isRotating = false;

  createValidatorForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
    name: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    birthdate: ['', [Validators.required]]
  });

  rotatePasswordForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
  });

  displayedColumns: string[] = ['username', 'name', 'email', 'active', 'actions'];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.eventId = +id;
        this.loadValidators();
      }
    });
  }

  loadValidators(): void {
    if (!this.eventId) return;
    
    this.isLoading = true;
    // Note: The API contract doesn't specify a GET endpoint for validators,
    // but we'll assume one exists or we'll need to add it to the backend
    // For now, we'll use the users service to get validators by role
    // This is a placeholder - adjust based on actual API implementation
    this.isLoading = false;
  }

  onCreateValidator(): void {
    if (this.createValidatorForm.invalid || !this.eventId) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Crear Validador',
        message: '¿Crear cuenta de validador? El correo electrónico se generará automáticamente.',
        confirmText: 'Crear',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.isCreating = true;
      const request: ValidatorCreateRequest = this.createValidatorForm.getRawValue();

      this.eventService.createValidator(this.eventId, request).subscribe({
        next: (validator) => {
          this.validators.push(validator);
          this.createValidatorForm.reset();
          this.isCreating = false;
          this.snackBar.open(`Validador "${validator.username}" creado exitosamente`, 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.isCreating = false;
          this.errorService.handleError(err, 'Error al crear validador');
        }
      });
    });
  }

  onRotatePassword(validator: ValidatorResponse): void {
    this.rotatePasswordForm.patchValue({ username: validator.username });
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Rotar Contraseña',
        message: `¿Cambiar la contraseña del validador "${validator.username}"? Esta acción afectará a todo el staff que comparte esta cuenta.`,
        confirmText: 'Cambiar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.eventId) return;

      this.isRotating = true;
      const request: ValidatorPasswordRotateRequest = this.rotatePasswordForm.getRawValue();

      this.eventService.rotateValidatorPassword(this.eventId, request).subscribe({
        next: () => {
          this.rotatePasswordForm.reset();
          this.isRotating = false;
          this.snackBar.open('Contraseña rotada exitosamente', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.isRotating = false;
          this.errorService.handleError(err, 'Error al rotar contraseña');
        }
      });
    });
  }

  goBack(): void {
    if (this.eventId) {
      this.router.navigate(['/admin-tickets', this.eventId]);
    } else {
      this.router.navigate(['/admin-events']);
    }
  }
}
