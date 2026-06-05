import { Component, inject, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { RolesService } from "../../../../services/roles.service";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ErrorService } from "../../../../services/error.service";

@Component({
  selector: "app-change-role-dialog",
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: "./change-role-dialog.component.html",
  styleUrls: ["./change-role-dialog.component.scss"],
})
export class ChangeRoleDialogComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private rolesService = inject(RolesService);
  private errorService = inject(ErrorService);
  private dialogRef = inject(MatDialogRef<ChangeRoleDialogComponent>);
  public data = inject<any>(MAT_DIALOG_DATA);
  private cdr = inject(ChangeDetectorRef);

  isLoadingRoles: boolean = true;
  roles: any[] = [];
  selectedRole: string = '';

  ngOnInit(): void {
    // Inicializar visualmente rápido sin esperar a la API
    if (this.data?.user?.role) {
      const currentRole = this.data.user.role.toLowerCase();
      if (currentRole.includes("cliente"))
        this.selectedRole = "comprar";
      else if (currentRole.includes("organizador"))
        this.selectedRole = "crear";
      else if (currentRole.includes("validador"))
        this.selectedRole = "validar";
    }

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
    if (this.selectedRole) {
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
        case "validar":
          targetNames = ["validador", "Validador", "VALIDADOR"];
          fallbackId = 7;
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
      this.dialogRef.close({ roleId: finalRoleId });
    }
  }
}
