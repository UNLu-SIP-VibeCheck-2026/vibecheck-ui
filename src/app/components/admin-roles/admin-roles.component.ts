import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { RoleDialogComponent } from '../shared/dialogs/role-dialog/role-dialog.component';
import { RoleResponse } from '../../models/role-response.model';
import { RolesService } from '../../services/roles.service';
import { RoleCreateRequest, RoleUpdateRequest } from '../../models/role-requests.model';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    FormsModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.scss'
})
export class AdminRolesComponent implements OnInit {
  private dialog = inject(MatDialog);
  private rolesService = inject(RolesService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['roleName', 'permissions', 'actions'];
  dataSource = new MatTableDataSource<RoleResponse>([]);
  searchQuery: string = '';

  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.rolesService.getRoles(this.pageIndex, this.pageSize).subscribe({
      next: (page) => {
        this.dataSource.data = page.content;
        this.totalElements = page.totalElements;
      },
      error: (err) => console.error("Error cargando roles:", err)
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRoles();
  }

  getPermissionsString(role: RoleResponse): string {
    if (!role.permissions || role.permissions.length === 0) return 'Sin permisos';
    return role.permissions.map(p => p.name).join(', ');
  }

  addRole() {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '440px',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const payload: RoleCreateRequest = {
          name: result.roleName,
          permissionIds: result.permissionIds || []
        };
        this.rolesService.createRole(payload).subscribe({
          next: () => {
            this.snackBar.open('Rol creado exitosamente.', 'Cerrar', { duration: 3000 });
            this.loadRoles();
          },
          error: (err) => console.error("Error al crear rol", err)
        });
      }
    });
  }

  editRole(role: RoleResponse) {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '440px',
      data: { role },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const payload: RoleUpdateRequest = {
          name: result.roleName,
          permissionIds: result.permissionIds || []
        };
        this.rolesService.updateRole(role.id, payload).subscribe({
          next: () => {
            this.snackBar.open('Rol actualizado exitosamente.', 'Cerrar', { duration: 3000 });
            this.loadRoles();
          },
          error: (err) => console.error("Error al actualizar rol", err)
        });
      }
    });
  }

  deleteRole(role: RoleResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { 
        message: '¿Confirma eliminación?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.rolesService.deleteRole(role.id).subscribe({
          next: () => {
            this.snackBar.open('Rol eliminado exitosamente.', 'Cerrar', { duration: 3000 });
            this.loadRoles();
          },
          error: (err) => {
            if (err.status === 409) {
              this.snackBar.open('No se puede eliminar el rol porque está en uso por algún usuario.', 'Cerrar', {
                duration: 5000,
                panelClass: ['error-snackbar']
              });
            } else {
              console.error("Error al eliminar rol", err);
            }
          }
        });
      }
    });
  }

}
