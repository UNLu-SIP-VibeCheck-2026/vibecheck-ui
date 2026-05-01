import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RolesService } from '../../../../services/roles.service';

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
  private rolesService = inject(RolesService);

  isLoadingRoles: boolean = true;
  roles: any[] = [];
  roleForm: FormGroup = this.fb.group({
    role: ['', [Validators.required]]
  });

  ngOnInit(): void {
    // Fetch available roles to map names to IDs
    this.rolesService.getRoles(0, 50).subscribe({
      next: (page: any) => {
        this.roles = page.content;
        this.isLoadingRoles = false;
        
        // Initial selection based on current user role name
        if (this.data?.user?.role) {
          const currentRole = this.data.user.role.toLowerCase();
          if (currentRole.includes('comprador') || currentRole.includes('buyer')) this.roleForm.patchValue({ role: 'comprar' });
          else if (currentRole.includes('organizador') || currentRole.includes('organizer')) this.roleForm.patchValue({ role: 'crear' });
          else if (currentRole.includes('validador') || currentRole.includes('validator')) this.roleForm.patchValue({ role: 'validar' });
        }
      },
      error: (err) => {
        console.error('Error al cargar roles en el diálogo:', err);
        this.isLoadingRoles = false;
      }
    });
  }

  setRole(role: string): void {
    this.roleForm.get('role')?.setValue(role);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      const selectedRoleType = this.roleForm.get('role')?.value;
      let targetNames: string[] = [];
      let fallbackId = 2;
      
      switch(selectedRoleType) {
        case 'comprar': 
          targetNames = ['cliente', 'Cliente', 'CLIENTE']; 
          fallbackId = 2;
          break;
        case 'crear': 
          targetNames = ['organizador', 'Organizador', 'ORGANIZADOR']; 
          fallbackId = 3;
          break;
        case 'validar': 
          targetNames = ['validador', 'Validador', 'VALIDADOR']; 
          fallbackId = 4;
          break;
      }

      // Try to find the role in the fetched list
      const matchingRole = this.roles.find(r => 
        targetNames.some(name => r.name.toUpperCase().includes(name))
      );
      
      const finalRoleId = matchingRole ? matchingRole.id : fallbackId;
      
      console.log('Submiting role change. Selected:', selectedRoleType, 'Determined RoleID:', finalRoleId);
      this.dialogRef.close({ roleId: finalRoleId });
    }
  }
}
