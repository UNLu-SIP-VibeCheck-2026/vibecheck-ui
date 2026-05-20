import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.scss'
})
export class PasswordRecoveryComponent {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private usersService = inject(UsersService);
  private router = inject(Router);

  recoveryForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isSubmitting = false;
  emailSent = false;

  onSubmit(): void {
    if (this.recoveryForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const email = this.recoveryForm.value.email;

    this.usersService.forgotPassword(email).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.emailSent = true;
        this.snackBar.open('Si el correo es válido, se ha enviado un enlace de recuperación.', 'Cerrar', {
          duration: 5000
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.open(err?.error?.message || 'Error al enviar el correo. Reintentá de nuevo.', 'Cerrar', {
          duration: 5000
        });
      }
    });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }
}
