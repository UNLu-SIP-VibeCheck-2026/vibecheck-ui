import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-change-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './change-role-dialog.component.html',
  styleUrls: ['./change-role-dialog.component.scss']
})
export class ChangeRoleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ChangeRoleDialogComponent>);
  public data = inject<any>(MAT_DIALOG_DATA);

  roleForm: FormGroup = this.fb.group({
    role: ['', [Validators.required]]
  });

  ngOnInit(): void {
    if (this.data && this.data.role) {
      this.roleForm.patchValue({
        role: this.data.role
      });
    }
  }

  setRole(role: string): void {
    this.roleForm.get('role')?.setValue(role);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      this.dialogRef.close(this.roleForm.value);
    }
  }
}
