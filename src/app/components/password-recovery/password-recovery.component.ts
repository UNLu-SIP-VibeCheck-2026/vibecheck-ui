import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.scss'
})
export class PasswordRecoveryComponent {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  recoveryForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]]
  });

  isSubmitting = false;

  onSubmit(): void {
    if (this.recoveryForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    console.log('Recovery requested for:', this.recoveryForm.value.username);
    
    // Simulate API call
    setTimeout(() => {
      this.isSubmitting = false;
      this.snackBar.open('Si el usuario existe, se ha enviado un enlace de recuperación.', 'Cerrar', {
        duration: 5000
      });
    }, 1500);
  }
}
