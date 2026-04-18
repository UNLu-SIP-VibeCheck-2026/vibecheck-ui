import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatSortModule, Sort } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatSelectModule } from "@angular/material/select";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { UserDialogComponent } from "../shared/dialogs/user-dialog/user-dialog.component";
import { UserSummaryResponse } from "../../models/user-summary-response.model";
import { UserUpdateRequest } from "../../models/user-update-request.model";
import { UsersService } from "../../services/users.service";
import { RolesService } from "../../services/roles.service";
import { RoleResponse } from "../../models/role-response.model";

@Component({
  selector: "app-admin-users",
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatSelectModule,
    FormsModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  templateUrl: "./admin-users.component.html",
  styleUrl: "./admin-users.component.scss",
})
export class AdminUsersComponent implements OnInit {
  private dialog = inject(MatDialog);
  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    "id",
    "username",
    "email",
    "name",
    "lastName",
    "phoneNumber",
    "role",
    "active",
    "actions",
  ];
  dataSource = new MatTableDataSource<UserSummaryResponse>([]);
  searchQuery: string = "";
  
  filterRole: string = "";
  filterActive: string = "";
  availableRoles: RoleResponse[] = [];

  sortBy: string = "id";
  sortDirection: string = "asc";

  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadUsers();
    this.rolesService.getRoles(0, 100).subscribe({
      next: (page: any) => this.availableRoles = page.content,
      error: (err: any) => console.error("Error cargando roles:", err)
    });
  }

  loadUsers(): void {
    const activeParam = this.filterActive === 'true' ? true : this.filterActive === 'false' ? false : undefined;
    this.usersService.getUsers(this.pageIndex, this.pageSize, this.searchQuery, this.filterRole, activeParam, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.dataSource.data = page.content;
        this.totalElements = page.totalElements;
      },
      error: (err) => console.error("Error cargando usuarios:", err)
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  applyFilter(): void {
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadUsers();
  }

  onSortChange(sortState: Sort) {
    this.sortBy = sortState.active;
    this.sortDirection = sortState.direction || 'asc';
    this.pageIndex = 0;
    this.loadUsers();
  }

  editUser(user: UserSummaryResponse) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: "440px",
      data: { user },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // construct update payload
        const updatePayload: UserUpdateRequest = {
          username: result.username,
          name: result.firstName,
          lastName: result.lastName,
          email: result.email,
          phoneNumber: result.phone,
          active: result.active,
          roleId: result.roleId,
          birthdate: `${result.birthYear}-${String(result.birthMonth).padStart(2, '0')}-${String(result.birthDay).padStart(2, '0')}`
        };

        this.usersService.updateUser(user.username, updatePayload).subscribe({
          next: () => {
            console.log("Usuario actualizado con éxito");
            this.loadUsers();
          },
          error: (err) => console.error("Error al actualizar usuario:", err)
        });
      }
    });
  }
}
