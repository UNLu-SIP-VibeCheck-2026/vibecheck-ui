import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

export interface RotatePasswordDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  passwordForm: FormGroup;
  showPassword: boolean;
  showRepeatPassword: boolean;
  passwordStrength: 'weak' | 'medium' | 'strong' | null;
  passwordMismatch: boolean;
  togglePassword: () => void;
  toggleRepeatPassword: () => void;
}

@Component({
  selector: 'app-rotate-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  templateUrl: './rotate-password-dialog.component.html',
  styleUrl: './rotate-password-dialog.component.scss'
})
export class RotatePasswordDialogComponent {
  public data = inject<RotatePasswordDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RotatePasswordDialogComponent>);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (this.data.passwordForm.invalid) {
      this.data.passwordForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(true);
  }
}
