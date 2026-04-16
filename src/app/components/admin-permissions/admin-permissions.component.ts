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
import { PermissionDialogComponent } from '../shared/dialogs/permission-dialog/permission-dialog.component';

export interface PermissionAdmin {
  idp: string;
  description: string;
}

const MOCK_DATA: PermissionAdmin[] = Array.from({ length: 10 }, (_, i) => ({
  idp: `PERMISO0${i + 1}`,
  description: '...'
}));

@Component({
  selector: 'app-admin-permissions',
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
  templateUrl: './admin-permissions.component.html',
  styleUrl: './admin-permissions.component.scss' // Syncing to scss
})
export class AdminPermissionsComponent implements OnInit {
  private dialog = inject(MatDialog);
  
  displayedColumns: string[] = ['select', 'idp', 'description', 'actions'];
  dataSource = new MatTableDataSource<PermissionAdmin>(MOCK_DATA);
  selection = new SelectionModel<PermissionAdmin>(true, []);
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

  addPermission() {
    const dialogRef = this.dialog.open(PermissionDialogComponent, {
      width: '440px',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Add permission data:', result);
      }
    });
  }

  editPermission(permission: PermissionAdmin) {
    const dialogRef = this.dialog.open(PermissionDialogComponent, {
      width: '440px',
      data: { permission },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Edit permission data:', result);
      }
    });
  }

  deletePermission(permission: PermissionAdmin) {
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
        console.log('Deleting permission:', permission.idp);
      }
    });
  }

  importPermissions() {
    console.log('Import clicked');
  }

  exportPermissions() {
    console.log('Export clicked');
  }
}
