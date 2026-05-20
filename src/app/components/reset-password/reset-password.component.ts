import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private snackBar = inject(MatSnackBar);

  resetForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  token: string | null = null;
  isSubmitting = false;
  hasTokenError = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.hasTokenError = true;
      this.snackBar.open('Token de recuperación no válido o inexistente.', 'Cerrar', {
        duration: 5000
      });
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token) {
      return;
    }

    this.isSubmitting = true;
    const newPassword = this.resetForm.value.newPassword;

    this.usersService.resetPassword({ token: this.token, newPassword }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('¡Contraseña restablecida con éxito!', 'Cerrar', {
          duration: 3000
        });
        this.router.navigate(['/login'], { queryParams: { passwordReset: 'true' } });
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || 'Error al restablecer la contraseña. Es posible que el token haya expirado o ya se haya utilizado.';
        this.snackBar.open(msg, 'Cerrar', {
          duration: 5000
        });
      }
    });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }
}
