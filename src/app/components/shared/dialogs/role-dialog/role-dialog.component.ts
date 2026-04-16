import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

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

  roleForm!: FormGroup;
  isEditMode: boolean = false;
  addedPermissions: string[] = [];

  availablePermissions = [
    'Ver Usuarios',
    'Crear Usuarios',
    'Editar Usuarios',
    'Eliminar Usuarios',
    'Ver Roles',
    'Crear Roles',
    'Editar Roles',
    'Eliminar Roles',
    'Ver Permisos',
    'Crear Eventos',
    'Validar Entradas'
  ];

  ngOnInit(): void {
    this.isEditMode = !!this.data?.role;
    if (this.isEditMode && this.data.role.permissions) {
      // Logic to parse permissions string if necessary, but assuming array for internal management
      this.addedPermissions = this.data.role.permissions.split(', ');
    }
    this.initForm();
  }

  private initForm(): void {
    this.roleForm = this.fb.group({
      roleName: [this.data?.role?.roleName || '', this.isEditMode ? [] : [Validators.required]],
      tempPermission: ['']
    });
  }

  addPermission(): void {
    const permission = this.roleForm.get('tempPermission')?.value;
    if (permission && !this.addedPermissions.includes(permission)) {
      this.addedPermissions.push(permission);
      this.roleForm.get('tempPermission')?.setValue('');
    }
  }

  removePermission(index: number): void {
    this.addedPermissions.splice(index, 1);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.roleForm.valid && this.addedPermissions.length > 0) {
      const result = {
        roleName: this.roleForm.get('roleName')?.value,
        permissions: this.addedPermissions.join(', ')
      };
      this.dialogRef.close(result);
    }
  }
}
