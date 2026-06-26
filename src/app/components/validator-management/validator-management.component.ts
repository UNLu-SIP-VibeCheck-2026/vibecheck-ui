import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../services/event.service';
import { ValidatorCreateRequest, ValidatorPasswordRotateRequest, ValidatorResponse } from '../../models/validator-request.model';
import { ConfirmDialogComponent } from '../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { RotatePasswordDialogComponent } from '../shared/dialogs/rotate-password-dialog/rotate-password-dialog.component';
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
  dataSource = new MatTableDataSource<ValidatorResponse>([]);
  isLoading = false;
  isCreating = false;
  isRotating = false;
  showPassword = false;
  showCreateRepeatPassword = false;
  showRotatePassword = false;
  showRotateRepeatPassword = false;

  createValidatorForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9_.\-]+$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100), this.passwordRequirementsValidator]],
    repeatPassword: ['', [Validators.required]],
    name: ['', [Validators.required]],
    lastName: ['', [Validators.required]]
  }, { validators: this.createPasswordMatchValidator });

  rotatePasswordForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100), this.passwordRequirementsValidator]],
    repeatPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  displayedColumns: string[] = ['username', 'name', 'email', 'active', 'actions'];

  // Typed control getters for the template
  get usernameCtrl(): FormControl { return this.createValidatorForm.get('username') as FormControl; }
  get passwordCtrl(): FormControl { return this.createValidatorForm.get('password') as FormControl; }
  get nameCtrl(): FormControl { return this.createValidatorForm.get('name') as FormControl; }
  get lastNameCtrl(): FormControl { return this.createValidatorForm.get('lastName') as FormControl; }
  get repeatPasswordCtrl(): FormControl { return this.createValidatorForm.get('repeatPassword') as FormControl; }
  
  get rotatePasswordCtrl(): FormControl { return this.rotatePasswordForm.get('newPassword') as FormControl; }
  get rotateRepeatPasswordCtrl(): FormControl { return this.rotatePasswordForm.get('repeatPassword') as FormControl; }

  get createPasswordMismatch(): boolean {
    return (
      this.createValidatorForm.hasError('passwordMismatch') &&
      (this.repeatPasswordCtrl.dirty || this.repeatPasswordCtrl.touched)
    );
  }

  get passwordMismatch(): boolean {
    return (
      this.rotatePasswordForm.hasError('passwordMismatch') &&
      (this.rotateRepeatPasswordCtrl.dirty || this.rotateRepeatPasswordCtrl.touched)
    );
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const v = this.passwordCtrl.value as string;
    if (!v) return null;
    const hasUpper = /[A-Z]/.test(v);
    const hasNumber = /\d/.test(v);
    const hasSpecial = /[@$!%*?&.#_/-]/.test(v);
    const score = [v.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score === 3) return 'medium';
    return 'strong';
  }

  get rotatePasswordStrength(): 'weak' | 'medium' | 'strong' | null {
    const v = this.rotatePasswordCtrl.value as string;
    if (!v) return null;
    const hasUpper = /[A-Z]/.test(v);
    const hasNumber = /\d/.test(v);
    const hasSpecial = /[@$!%*?&.#_/-]/.test(v);
    const score = [v.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score === 3) return 'medium';
    return 'strong';
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pw = control.get('newPassword');
    const rp = control.get('repeatPassword');
    if (pw && rp && pw.value !== rp.value) return { passwordMismatch: true };
    return null;
  }

  createPasswordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pw = control.get('password');
    const rp = control.get('repeatPassword');
    if (pw && rp && pw.value !== rp.value) return { passwordMismatch: true };
    return null;
  }

  toggleCreateRepeatPassword(): void {
    this.showCreateRepeatPassword = !this.showCreateRepeatPassword;
  }

  passwordRequirementsValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').toString();
    if (!value) return null;
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_/-])[A-Za-z\d@$!%*?&.#_/-]+$/;
    return pattern.test(value) ? null : { passwordRequirements: true };
  }

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
    this.eventService.getEventValidators(this.eventId).subscribe({
      next: (validators) => {
        this.validators = validators;
        this.dataSource.data = validators;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorService.handleError(err, 'Error al cargar validadores');
      }
    });
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
      const rawForm = this.createValidatorForm.getRawValue();
      const request: ValidatorCreateRequest = {
        username: rawForm.username,
        password: rawForm.password,
        name: rawForm.name,
        lastName: rawForm.lastName
      };

      this.eventService.createValidator(this.eventId!, request).subscribe({
        next: (validator) => {
          this.validators.push(validator);
          this.dataSource.data = this.validators;
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
    this.rotatePasswordForm.patchValue({ username: validator.username, newPassword: '', repeatPassword: '' });
    
    const dialogRef = this.dialog.open(RotatePasswordDialogComponent, {
      width: '500px',
      data: {
        title: 'Rotar Contraseña',
        message: `¿Cambiar la contraseña del validador "${validator.username}"? Esta acción afectará a todo el staff que comparte esta cuenta.`,
        confirmText: 'Cambiar',
        cancelText: 'Cancelar',
        passwordForm: this.rotatePasswordForm,
        showPassword: this.showRotatePassword,
        showRepeatPassword: this.showRotateRepeatPassword,
        passwordStrength: this.rotatePasswordStrength,
        passwordMismatch: this.passwordMismatch,
        togglePassword: () => this.toggleRotatePassword(),
        toggleRepeatPassword: () => this.toggleRotateRepeatPassword()
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.eventId) return;

      this.isRotating = true;
      const request: ValidatorPasswordRotateRequest = {
        username: this.rotatePasswordForm.value.username,
        password: this.rotatePasswordForm.value.newPassword
      };

      this.eventService.rotateValidatorPassword(this.eventId!, request).subscribe({
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
    this.router.navigate(['/admin-events']);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleRotatePassword(): void {
    this.showRotatePassword = !this.showRotatePassword;
  }

  toggleRotateRepeatPassword(): void {
    this.showRotateRepeatPassword = !this.showRotateRepeatPassword;
  }
}
