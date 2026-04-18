import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { PermissionsService } from '../../../../services/permissions.service';
import { PermissionResponse } from '../../../../models/permission-response.model';
import { Page } from '../../../../models/page.model';

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.scss']
})
export class RoleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RoleDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private permissionsService = inject(PermissionsService);

  roleForm!: FormGroup;
  isEditMode: boolean = false;
  availablePermissions: PermissionResponse[] = [];

  ngOnInit(): void {
    this.isEditMode = !!this.data?.role;
    
    // Fetch available permissions mapping
    this.permissionsService.getPermissions(0, 100).subscribe({
      next: (page: Page<PermissionResponse>) => {
        this.availablePermissions = page.content;
      },
      error: (err: any) => console.error("Error loading permissions", err)
    });

    this.initForm();
  }

  private initForm(): void {
    const existingPermIds = this.isEditMode && this.data.role.permissions ? 
                             this.data.role.permissions.map((p: any) => p.id) : [];
                             
    this.roleForm = this.fb.group({
      roleName: [this.data?.role?.name || '', [Validators.required]],
      permissionIds: [existingPermIds]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      const result = {
        roleName: this.roleForm.get('roleName')?.value,
        permissionIds: this.roleForm.get('permissionIds')?.value
      };
      this.dialogRef.close(result);
    }
  }
}
