import { SelectionModel } from "@angular/cdk/collections";
import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { UserDialogComponent } from "../shared/dialogs/user-dialog/user-dialog.component";
import { UserSummaryResponse } from "../../models/user-summary-response.model";
import { UsersService } from "../../services/users.service";

@Component({
  selector: "app-admin-users",
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
    MatDialogModule,
    MatPaginatorModule,
  ],
  templateUrl: "./admin-users.component.html",
  styleUrl: "./admin-users.component.scss",
})
export class AdminUsersComponent implements OnInit {
  private dialog = inject(MatDialog);
  private usersService = inject(UsersService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    "select",
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
  selection = new SelectionModel<UserSummaryResponse>(true, []);
  searchQuery: string = "";

  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.getUsers(this.pageIndex, this.pageSize).subscribe({
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
  checkboxLabel(row?: UserSummaryResponse): string {
    if (!row) {
      return `${this.isAllSelected() ? "deselect" : "select"} all`;
    }
    return `${this.selection.isSelected(row) ? "deselect" : "select"} row ${row.id}`;
  }

  addUser() {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: "440px",
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log("Add user data:", result);
        this.loadUsers();
      }
    });
  }

  importUsers() {
    console.log("Import clicked");
  }

  exportUsers() {
    console.log("Export clicked");
  }

  editUser(user: UserSummaryResponse) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: "440px",
      data: { user },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log("Edit user data:", result);
        this.loadUsers();
      }
    });
  }

  deleteUser(user: UserSummaryResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "400px",
      data: {
        message: "¿Confirma eliminación?",
        confirmText: "Eliminar",
        cancelText: "Cancelar",
      },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log("Deleting user:", user.username);
        // todo call delete endpoint then this.loadUsers()
      }
    });
  }
}
