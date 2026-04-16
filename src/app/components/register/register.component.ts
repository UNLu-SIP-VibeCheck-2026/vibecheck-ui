import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/register-request.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    name: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phoneNumber: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    repeatPassword: ['', [Validators.required]],
    birthDay: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
    birthMonth: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
    birthYear: ['', [Validators.required, Validators.min(1900), Validators.max(2026)]],
    role: ['comprar', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  isSubmitting = false;

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const repeatPassword = control.get('repeatPassword');
    if (password && repeatPassword && password.value !== repeatPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  setRole(role: string): void {
    this.registerForm.get('role')?.setValue(role);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.snackBar.open('Por favor, revisa los campos obligatorios', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    
    // Combine fields for the mapping if needed, though we keep existing RegisterRequest structure
    const formValue = this.registerForm.value;
    const data: RegisterRequest = {
      username: formValue.username,
      email: formValue.email,
      name: formValue.name,
      lastName: formValue.lastName,
      phoneNumber: formValue.phoneNumber,
      password: formValue.password
      // Note: birthDate and role are collected but not in the current RegisterRequest model.
      // They are kept in the form for future API updates or internal logic.
    };

    this.authService.register(data).subscribe({
      next: () => {
        this.snackBar.open('Registro exitoso', 'Cerrar', {
          duration: 3000
        });
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.snackBar.open('Error al registrarse: ' + error.message, 'Cerrar', {
          duration: 5000
        });
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
