import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { UserSummaryResponse } from '../../../../models/user-summary-response.model';

@Component({
  selector: 'app-edit-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './edit-profile-dialog.component.html',
  styleUrls: ['./edit-profile-dialog.component.scss']
})
export class EditProfileDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditProfileDialogComponent>);
  public data = inject<UserSummaryResponse>(MAT_DIALOG_DATA);

  showPassword = false;

  editForm: FormGroup = this.fb.group({
    username:    ['', [Validators.required]],
    email:       ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    name:        ['', [Validators.required]],
    lastName:    ['', [Validators.required]],
    birthDay:    ['', [Validators.required, Validators.min(1), Validators.max(31)]],
    birthMonth:  ['', [Validators.required, Validators.min(1), Validators.max(12)]],
    birthYear:   ['', [Validators.required, Validators.min(1900), Validators.max(2026)]],
    password:    ['', [Validators.required]]
  });

  ngOnInit(): void {
    if (this.data) {
      // Pre-llenar los campos con los datos actuales del usuario
      this.editForm.patchValue({
        username:    this.data.username    || '',
        email:       this.data.email       || '',
        name:        this.data.name        || '',
        lastName:    this.data.lastName    || '',
        phoneNumber: this.data.phoneNumber || ''
      });

      // Pre-llenar la fecha de nacimiento si existe (formato esperado: "YYYY-MM-DD")
      if (this.data.birthdate) {
        const parts = this.data.birthdate.split('-');
        if (parts.length === 3) {
          this.editForm.patchValue({
            birthYear:  parseInt(parts[0], 10),
            birthMonth: parseInt(parts[1], 10),
            birthDay:   parseInt(parts[2], 10)
          });
        }
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.editForm.valid) {
      this.dialogRef.close(this.editForm.value);
    }
  }
}
