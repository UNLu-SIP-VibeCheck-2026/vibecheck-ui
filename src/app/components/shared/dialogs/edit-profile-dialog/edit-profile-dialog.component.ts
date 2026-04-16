import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { User } from '../../../../models/user.model';

@Component({
  selector: 'app-edit-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './edit-profile-dialog.component.html',
  styleUrls: ['./edit-profile-dialog.component.scss']
})
export class EditProfileDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditProfileDialogComponent>);
  public data = inject<User>(MAT_DIALOG_DATA);

  editForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    name: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    birthDay: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
    birthMonth: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
    birthYear: ['', [Validators.required, Validators.min(1900), Validators.max(2026)]]
  });

  ngOnInit(): void {
    if (this.data) {
      this.editForm.patchValue({
        username: this.data.id || '',
        email: this.data.email || '',
        name: this.data.firstName || '',
        lastName: this.data.lastName || '',
        // These might need manual mapping if not in the initial model
        phoneNumber: (this.data as any).phoneNumber || '',
        birthDay: (this.data as any).birthDay || '',
        birthMonth: (this.data as any).birthMonth || '',
        birthYear: (this.data as any).birthYear || ''
      });
    }
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
