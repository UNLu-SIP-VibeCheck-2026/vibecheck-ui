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
import { UserDialogComponent } from '../shared/dialogs/user-dialog/user-dialog.component';

export interface UserAdmin {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  status: string;
}

const MOCK_DATA: UserAdmin[] = Array.from({ length: 10 }, (_, i) => ({
  id: `USUARIO0${i + 1}`,
  username: 'MattZander',
  email: 'matt@gmail.com',
  firstName: 'Matt',
  lastName: 'Zander',
  phoneNumber: '54 9 11 1234 5678',
  role: 'ADMIN',
  status: 'Activo'
}));

@Component({
  selector: 'app-admin-users',
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
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  private dialog = inject(MatDialog);
  
  displayedColumns: string[] = ['select', 'id', 'username', 'email', 'firstName', 'lastName', 'phoneNumber', 'role', 'status', 'actions'];
  dataSource = new MatTableDataSource<UserAdmin>(MOCK_DATA);
  selection = new SelectionModel<UserAdmin>(true, []);
  searchQuery: string = '';

  ngOnInit(): void {}

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: UserAdmin): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
  }

  addUser() {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '440px',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Add user data:', result);
      }
    });
  }

  importUsers() {
    console.log('Import clicked');
  }

  exportUsers() {
    console.log('Export clicked');
  }

  editUser(user: UserAdmin) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '440px',
      data: { user },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Edit user data:', result);
      }
    });
  }

  deleteUser(user: UserAdmin) {
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
        console.log('Deleting user:', user.username);
      }
    });
  }
}
