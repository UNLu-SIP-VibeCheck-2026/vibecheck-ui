import { Component, inject, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { FormsModule } from "@angular/forms";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { RoleDialogComponent } from "../shared/dialogs/role-dialog/role-dialog.component";
import { RoleResponse } from "../../models/role-response.model";
import { RolesService } from "../../services/roles.service";
import {
  RoleCreateRequest,
  RoleUpdateRequest,
} from "../../models/role-requests.model";
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from "@angular/material/paginator";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { LoadingStateComponent } from "../shared/loading-state/loading-state.component";
import { EmptyStateComponent } from "../shared/empty-state/empty-state.component";
import { trackLoading } from "../../utils/loading.operator";
import { AuthService } from "../../services/auth.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-admin-roles",
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
    MatSnackBarModule,
    LoadingStateComponent,
    EmptyStateComponent,
    MatTooltipModule
  ],
  templateUrl: "./admin-roles.component.html",
  styleUrl: "./admin-roles.component.scss",
})
export class AdminRolesComponent implements OnInit {
  private dialog = inject(MatDialog);
  private rolesService = inject(RolesService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ["roleName", "permissions", "actions"];
  dataSource = new MatTableDataSource<RoleResponse>([]);
  searchQuery: string = "";
  isLoading: boolean = false;

  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.checkRole();
    this.loadRoles();
  }

  private checkRole(): void {
    const user = this.authService.getCurrentUserValue();
    const role = user?.role?.toLowerCase();
    if (role !== 'admin' && role !== 'admin_usuarios') {
      this.snackBar.open('No tienes permiso para acceder a esta página', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    }
  }

  loadRoles(): void {
    this.rolesService.getAllRoles(this.pageIndex, this.pageSize)
      .pipe(trackLoading((loading) => (this.isLoading = loading)))
      .subscribe({
        next: (page) => {
          this.dataSource.data = page.content;
          this.totalElements = page.totalElements;
        },
        error: (err) =>  this.snackBar.open(err?.error?.message || "Error cargando roles:", "Cerrar", { duration: 4000 }),
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRoles();
  }

  getPermissionsString(role: RoleResponse): string {
    if (!role.permissions || role.permissions.length === 0)
      return "Sin permisos";
    return role.permissions.map((p) => p.name).join(", ");
  }

  addRole() {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: "440px",
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const payload: RoleCreateRequest = {
          name: result.roleName,
          permissionIds: result.permissionIds || [],
        };
        this.rolesService.createRole(payload).subscribe({
          next: () => {
            this.snackBar.open("Rol creado exitosamente.", "Cerrar", {
              duration: 3000,
            });
            this.loadRoles();
          },
          error: (err) =>  this.snackBar.open(err?.error?.message || "Error al crear rol", "Cerrar", { duration: 4000 }),
        });
      }
    });
  }

  editRole(role: RoleResponse) {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: "440px",
      data: { role },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const payload: RoleUpdateRequest = {
          name: result.roleName,
          permissionIds: result.permissionIds || [],
        };
        this.rolesService.updateRole(role.id, payload).subscribe({
          next: () => {
            this.snackBar.open("Rol actualizado exitosamente.", "Cerrar", {
              duration: 3000,
            });
            this.loadRoles();
          },
          error: (err) =>  this.snackBar.open(err?.error?.message || "Error al actualizar rol", "Cerrar", { duration: 4000 }),
        });
      }
    });
  }

  deleteRole(role: RoleResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "400px",
      data: {
        message: `¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        cancelText: "Cancelar",
      },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.rolesService.deleteRole(role.id).subscribe({
          next: () => {
            this.snackBar.open("Rol eliminado exitosamente.", "Cerrar", {
              duration: 3000,
            });
            this.loadRoles();
          },
          error: (err) => {
            if (err.status === 409) {
              this.snackBar.open(
                "No se puede eliminar el rol porque está en uso por algún usuario.",
                "Cerrar",
                {
                  duration: 5000,
                  panelClass: ["error-snackbar"],
                },
              );
            } else {
              console.error("Error al eliminar rol", err);
            }
          },
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
