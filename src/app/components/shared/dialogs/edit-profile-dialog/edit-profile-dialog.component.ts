import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { UserSummaryResponse } from '../../../../models/user-summary-response.model';
import { BirthdatePickerComponent } from '../../birthdate-picker/birthdate-picker.component';

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
    MatIconModule,
    BirthdatePickerComponent
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
    birthdate:   [null, [Validators.required]],
    password:    ['', [Validators.required]]
  });

  ngOnInit(): void {
    if (this.data) {
      this.editForm.patchValue({
        username:    this.data.username    || '',
        email:       this.data.email       || '',
        name:        this.data.name        || '',
        lastName:    this.data.lastName    || '',
        phoneNumber: this.data.phoneNumber || '',
        birthdate:   this.data.birthdate   || null
      });
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
