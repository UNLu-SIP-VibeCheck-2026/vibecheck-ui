import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { SelectionModel } from '@angular/cdk/collections';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { RoleDialogComponent } from '../shared/dialogs/role-dialog/role-dialog.component';

export interface RoleAdmin {
  id: string;
  roleName: string;
  permissions: string;
}

const MOCK_DATA: RoleAdmin[] = Array.from({ length: 10 }, (_, i) => ({
  id: `ROLE0${i + 1}`,
  roleName: `Rol ${i + 1}`,
  permissions: 'Permiso 1, Permiso 2, ..., Permiso N'
}));

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.scss'
})
export class AdminRolesComponent implements OnInit {
  private dialog = inject(MatDialog);
  
  displayedColumns: string[] = ['select', 'roleName', 'permissions', 'actions'];
  dataSource = new MatTableDataSource<RoleAdmin>(MOCK_DATA);
  selection = new SelectionModel<RoleAdmin>(true, []);
  searchQuery: string = '';

  ngOnInit(): void {}

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.data);
  }

  addRole() {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '440px',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Add role data:', result);
      }
    });
  }

  editRole(role: RoleAdmin) {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '440px',
      data: { role },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Edit role data:', result);
      }
    });
  }

  deleteRole(role: RoleAdmin) {
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
        console.log('Deleting role:', role.roleName);
      }
    });
  }

  importRoles() {
    console.log('Import clicked');
  }

  exportRoles() {
    console.log('Export clicked');
  }
}
