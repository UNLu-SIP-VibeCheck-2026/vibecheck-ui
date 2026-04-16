import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<UserDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);

  userForm!: FormGroup;
  isEditMode: boolean = false;

  roles = [
    { value: 'comprar', label: 'Comprar entradas' },
    { value: 'crear', label: 'Crear Eventos' },
    { value: 'validar', label: 'Validar entradas en puerta' },
    { value: 'admin', label: 'Administrador' }
  ];

  ngOnInit(): void {
    this.isEditMode = !!this.data?.user;
    this.initForm();
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      username: [this.data?.user?.username || '', [Validators.required]],
      email: [this.data?.user?.email || '', [Validators.required, Validators.email]],
      phone: [this.data?.user?.phoneNumber || '', [Validators.required]],
      birthDay: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      birthMonth: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      birthYear: ['', [Validators.required, Validators.min(1900), Validators.max(2026)]],
      firstName: [this.data?.user?.firstName || '', [Validators.required]],
      lastName: [this.data?.user?.lastName || '', [Validators.required]]
    });

    if (!this.isEditMode) {
      // Add mode specific fields
      this.userForm.addControl('password', this.fb.control('', [Validators.required, Validators.minLength(8)]));
      this.userForm.addControl('confirmPassword', this.fb.control('', [Validators.required]));
      this.userForm.addControl('role', this.fb.control('', [Validators.required]));
      this.userForm.setValidators(this.passwordMatchValidator);
    }

    // Pre-fill birth date if editing
    if (this.isEditMode && this.data.user.birthDate) {
      // Assuming ISO format or similar
      const date = new Date(this.data.user.birthDate);
      if (!isNaN(date.getTime())) {
        this.userForm.patchValue({
          birthDay: date.getDate(),
          birthMonth: date.getMonth() + 1,
          birthYear: date.getFullYear()
        });
      }
    }
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.dialogRef.close(this.userForm.value);
    }
  }
}
