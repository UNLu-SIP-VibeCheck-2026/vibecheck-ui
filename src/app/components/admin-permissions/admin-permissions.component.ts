import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConfirmDialogComponent } from '../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { PermissionDialogComponent } from '../shared/dialogs/permission-dialog/permission-dialog.component';
import { PermissionsService } from '../../services/permissions.service';
import { PermissionResponse } from '../../models/permission-response.model';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';
import { trackLoading } from '../../utils/loading.operator';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatPaginatorModule,
    MatSnackBarModule,
    FormsModule,
    MatDialogModule,
    LoadingStateComponent,
    EmptyStateComponent,
    MatTooltipModule
  ],
  templateUrl: './admin-permissions.component.html',
  styleUrl: './admin-permissions.component.scss'
})
export class AdminPermissionsComponent implements OnInit {
  private dialog = inject(MatDialog);
  private permissionsService = inject(PermissionsService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['id', 'name', 'description', 'actions'];
  dataSource = new MatTableDataSource<PermissionResponse>([]);
  selection = new SelectionModel<PermissionResponse>(true, []);
  searchQuery: string = '';
  isLoading: boolean = false;

  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.checkRole();
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadPermissions();
    });
    this.loadPermissions();
  }

  private checkRole(): void {
    const user = this.authService.getCurrentUserValue();
    const role = user?.role?.toLowerCase();
    if (role !== 'admin' && role !== 'admin_usuarios') {
      this.snackBar.open('No tienes permiso para acceder a esta página', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    }
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  loadPermissions(): void {
    this.permissionsService.getPermissions(this.pageIndex, this.pageSize, this.searchQuery)
      .pipe(trackLoading(loading => this.isLoading = loading))
      .subscribe({
        next: (page) => {
          this.dataSource.data = page.content;
          this.totalElements = page.totalElements;
        },
        error: (err: any) => {
          console.error('Error cargando permisos:', err);
          this.snackBar.open('Error al cargar permisos', 'Cerrar', { duration: 3000 });
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPermissions();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchChange();
  }

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
        this.permissionsService.createPermission({ name: result.name, description: result.description }).subscribe({
          next: () => {
            this.snackBar.open('Permiso creado correctamente', 'Cerrar', { duration: 3000 });
            this.pageIndex = 0;
            this.loadPermissions();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Error al crear el permiso';
            this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }

  editPermission(permission: PermissionResponse) {
    const dialogRef = this.dialog.open(PermissionDialogComponent, {
      width: '440px',
      data: { permission },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.permissionsService.updatePermission(permission.id, { name: result.name, description: result.description }).subscribe({
          next: () => {
            this.snackBar.open('Permiso actualizado correctamente', 'Cerrar', { duration: 3000 });
            this.loadPermissions();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Error al actualizar el permiso';
            this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }

  deletePermission(permission: PermissionResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        message: `¿Eliminar el permiso "${permission.name}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.permissionsService.deletePermission(permission.id).subscribe({
          next: () => {
            this.snackBar.open('Permiso eliminado correctamente', 'Cerrar', { duration: 3000 });
            this.loadPermissions();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Error al eliminar el permiso';
            this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
