import { Component, inject, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { RolesService } from "../../../../services/roles.service";
import { UsersService } from "../../../../services/users.service";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ErrorService } from "../../../../services/error.service";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-change-role-dialog",
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: "./change-role-dialog.component.html",
  styleUrls: ["./change-role-dialog.component.scss"],
})
export class ChangeRoleDialogComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private rolesService = inject(RolesService);
  private usersService = inject(UsersService);
  private errorService = inject(ErrorService);
  private dialogRef = inject(MatDialogRef<ChangeRoleDialogComponent>);
  public data = inject<any>(MAT_DIALOG_DATA);
  private cdr = inject(ChangeDetectorRef);

  isLoadingUser: boolean = true;
  isLoadingRoles: boolean = true;
  roles: any[] = [];
  selectedRole: string = '';
  fullUser: any = null;

  ngOnInit(): void {
    // Set an initial quick fallback using data passed from the dashboard
    if (this.data?.initialRole) {
      const currentRole = this.data.initialRole.toLowerCase();
      if (currentRole.includes("cliente") || currentRole.includes("comprar") || currentRole.includes("user"))
        this.selectedRole = "comprar";
      else if (currentRole.includes("organizador"))
        this.selectedRole = "crear";
    }

    // Fetch the full user profile inside the dialog or use the passed one
    if (this.data?.user) {
      this.fullUser = this.data.user;
      if (this.fullUser.role) {
        const currentRole = this.fullUser.role.toLowerCase();
        if (currentRole.includes("cliente") || currentRole.includes("comprar") || currentRole.includes("user"))
          this.selectedRole = "comprar";
        else if (currentRole.includes("organizador"))
          this.selectedRole = "crear";
      }
      this.isLoadingUser = false;
    } else if (this.data?.username) {
      this.usersService.getUserByUsername(this.data.username).subscribe({
        next: (profile) => {
          this.fullUser = profile;
          if (profile.role) {
            const currentRole = profile.role.toLowerCase();
            if (currentRole.includes("cliente") || currentRole.includes("comprar") || currentRole.includes("user"))
              this.selectedRole = "comprar";
            else if (currentRole.includes("organizador"))
              this.selectedRole = "crear";
          }
          this.isLoadingUser = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Error al cargar perfil en el diálogo:", err);
          this.isLoadingUser = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isLoadingUser = false;
    }

    // Fetch roles list
    this.rolesService.getFinalRoles().subscribe({
      next: (roles: any) => {
        this.roles = roles;
        this.isLoadingRoles = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al cargar roles en el diálogo:", err);
        this.isLoadingRoles = false;
        this.errorService.handleError(err, "No se pudieron cargar los roles.");
        this.cdr.detectChanges();
      },
    });
  }

  setRole(role: string): void {
    this.selectedRole = role;
    this.cdr.detectChanges();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.selectedRole && this.fullUser) {
      let targetNames: string[] = [];
      let fallbackId = 2;

      switch (this.selectedRole) {
        case "comprar":
          targetNames = ["cliente", "Cliente", "CLIENTE"];
          fallbackId = 5;
          break;
        case "crear":
          targetNames = ["organizador", "Organizador", "ORGANIZADOR"];
          fallbackId = 6;
          break;
      }

      // Try to find the role in the fetched list
      const matchingRole = this.roles.find((r) =>
        targetNames.some((name) => r.name.toUpperCase().includes(name.toUpperCase())),
      );

      const finalRoleId = matchingRole ? matchingRole.id : fallbackId;

      console.log(
        "Submiting role change. Selected:",
        this.selectedRole,
        "Determined RoleID:",
        finalRoleId,
      );
      this.dialogRef.close({ roleId: finalRoleId, fullUser: this.fullUser });
    }
  }
}

