import { Component, inject, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog } from "@angular/material/dialog";
import { AuthService } from "../../services/auth.service";
import { LoginRequest } from "../../models/login-request.model";
import { environment } from "../../../environments/environment";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
  
    MatSnackBarModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loginForm: FormGroup = this.fb.group({
    username: ["", [Validators.required]],
    password: ["", [Validators.required]],
  });

  isSubmitting = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      let openedDialog = false;

      if (params["verified"] === "true") {
        this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: "¡Cuenta verificada!",
            message: "Tu cuenta ha sido verificada con éxito. Ya podés iniciar sesión.",
            confirmText: "Aceptar",
            hideCancel: true
          },
          width: "400px"
        });
        openedDialog = true;
      }

      if (params["passwordReset"] === "true") {
        this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: "¡Contraseña restablecida!",
            message: "Tu contraseña ha sido restablecida con éxito. Ya podés iniciar sesión con tu nueva contraseña.",
            confirmText: "Aceptar",
            hideCancel: true
          },
          width: "400px"
        });
        openedDialog = true;
      }

      if (openedDialog) {
        // Limpiar los parámetros de la URL para evitar que vuelvan a aparecer al recargar la página
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { verified: null, passwordReset: null },
          queryParamsHandling: "merge",
          replaceUrl: true
        });
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const credentials: LoginRequest = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.snackBar.open("Inicio de sesión exitoso", "Cerrar", {
          duration: 3000,
        });
        this.router.navigate(["/dashboard"]);
      },
      error: (error) => {
        this.isSubmitting = false;
        let errorMessage = "Usuario o contraseña incorrectos";

        if (error.status === 401) {
          errorMessage =
            "La contraseña es incorrecta. Por favor, verifica tus credenciales.";
        } else if (error.status === 404) {
          errorMessage =
            "El usuario no existe. Por favor, verifica tu nombre de usuario.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.snackBar.open(errorMessage, "Cerrar", {
          duration: 5000,
          panelClass: ["error-snackbar"],
        });
      },
    });
  }

  navigateToRegister(): void {
    this.router.navigate(["/register"]);
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.backendUrl}/oauth2/authorization/google`;
  }

  loginWithGitHub(): void {
    window.location.href = `${environment.backendUrl}/oauth2/authorization/github`;
  }
}
