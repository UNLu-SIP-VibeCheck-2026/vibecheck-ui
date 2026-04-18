import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialog } from "@angular/material/dialog";
import { AuthService } from "../../services/auth.service";
import { LoginRequest } from "../../models/login-request.model";

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
  ],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loginForm: FormGroup = this.fb.group({
    username: ["", [Validators.required]],
    password: ["", [Validators.required]],
  });

  isSubmitting = false;

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
          errorMessage = "La contraseña es incorrecta. Por favor, verifica tus credenciales.";
        } else if (error.status === 404) {
          errorMessage = "El usuario no existe. Por favor, verifica tu nombre de usuario.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.snackBar.open(errorMessage, "Cerrar", {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      },
    });
  }

  navigateToRegister(): void {
    this.router.navigate(["/register"]);
  }

  loginWithGoogle(): void {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  }
}
