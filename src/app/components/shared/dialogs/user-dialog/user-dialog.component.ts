import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { RolesService } from '../../../../services/roles.service';
import { RoleResponse } from '../../../../models/role-response.model';
import { Page } from '../../../../models/page.model';

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
  private rolesService = inject(RolesService);

  userForm!: FormGroup;
  isEditMode: boolean = false;

  roles: RoleResponse[] = [];

  ngOnInit(): void {
    this.isEditMode = !!this.data?.user;
    this.initForm();
    
    this.rolesService.getRoles(0, 100).subscribe({
      next: (page: Page<RoleResponse>) => {
        this.roles = page.content;
        if (this.isEditMode && this.data.user.role) {
          const matchingRole = this.roles.find(r => r.name === this.data.user.role);
          if (matchingRole) {
            this.userForm.patchValue({ roleId: matchingRole.id });
          }
        }
      },
      error: (err: any) => console.error("Error cargando roles", err)
    });
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      username: [this.data?.user?.username || '', [Validators.required]],
      email: [this.data?.user?.email || '', [Validators.required, Validators.email]],
      phone: [this.data?.user?.phoneNumber || '', [Validators.required]],
      birthDay: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      birthMonth: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      birthYear: ['', [Validators.required, Validators.min(1900), Validators.max(2026)]],
      firstName: [this.data?.user?.name || '', [Validators.required]],
      lastName: [this.data?.user?.lastName || '', [Validators.required]],
      roleId: ['', [Validators.required]]
    });

    if (!this.isEditMode) {
      // Add mode specific fields
      this.userForm.addControl('password', this.fb.control('', [Validators.required, Validators.minLength(8)]));
      this.userForm.addControl('confirmPassword', this.fb.control('', [Validators.required]));
      this.userForm.setValidators(this.passwordMatchValidator);
    } else {
      // Add active field in edit mode
      this.userForm.addControl('active', this.fb.control(this.data?.user?.active, [Validators.required]));
    }

    // Pre-fill birth date if editing
    if (this.isEditMode && this.data.user.birthdate) {
      // Expecting format like "YYYY-MM-DD"
      const dateParts = this.data.user.birthdate.split('-');
      if (dateParts.length === 3) {
        this.userForm.patchValue({
          birthYear: parseInt(dateParts[0], 10),
          birthMonth: parseInt(dateParts[1], 10),
          birthDay: parseInt(dateParts[2], 10)
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
