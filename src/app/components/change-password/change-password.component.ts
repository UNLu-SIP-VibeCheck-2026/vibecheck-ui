import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private router = inject(Router);

  recoveryForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  isSubmitting = false;

  ngOnInit() {
    const user = this.authService.getCurrentUserValue();
    if (user) {
      this.recoveryForm.patchValue({ username: user.username });
      this.recoveryForm.get('username')?.disable(); // Lock if user is known
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.recoveryForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const { username, oldPassword, newPassword } = this.recoveryForm.getRawValue();

    this.usersService.changePassword(username, { oldPassword, newPassword }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('¡Contraseña actualizada con éxito!', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.open('Error al cambiar contraseña. Verifica tus datos.', 'Cerrar', { duration: 5000 });
      }
    });
  }
}
