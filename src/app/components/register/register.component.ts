import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Router, RouterModule } from "@angular/router";
import { RegisterRequest } from "../../models/register-request.model";
import { AuthService } from "../../services/auth.service";
import { environment } from "../../../environments/environment";
import { BirthdatePickerComponent } from "../shared/birthdate-picker/birthdate-picker.component";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    BirthdatePickerComponent,
  ],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.scss"],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  showPassword = false;
  showRepeatPassword = false;
  isSubmitting = false;
  apiError = "";

  registerForm: FormGroup = this.fb.group(
    {
      username: ["", [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_.\-]+$/)]],
      email: ["", [Validators.required, Validators.email]],
      name: ["", [Validators.required]],
      lastName: ["", [Validators.required]],
      phoneNumber: [""],
      password: ["", [Validators.required, Validators.minLength(8)]],
      repeatPassword: ["", [Validators.required]],
      birthdate: [null, [Validators.required]],
      role: ["comprar", [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  // Typed control getters for the template
  get usernameCtrl(): FormControl { return this.registerForm.get("username") as FormControl; }
  get emailCtrl(): FormControl { return this.registerForm.get("email") as FormControl; }
  get nameCtrl(): FormControl { return this.registerForm.get("name") as FormControl; }
  get lastNameCtrl(): FormControl { return this.registerForm.get("lastName") as FormControl; }
  get passwordCtrl(): FormControl { return this.registerForm.get("password") as FormControl; }
  get repeatPasswordCtrl(): FormControl { return this.registerForm.get("repeatPassword") as FormControl; }
  get birthdateCtrl(): FormControl { return this.registerForm.get("birthdate") as FormControl; }

  get passwordMismatch(): boolean {
    return (
      this.registerForm.hasError("passwordMismatch") &&
      (this.repeatPasswordCtrl.dirty || this.repeatPasswordCtrl.touched)
    );
  }

  get passwordStrength(): "weak" | "medium" | "strong" | null {
    const v = this.passwordCtrl.value as string;
    if (!v) return null;
    const hasUpper = /[A-Z]/.test(v);
    const hasNumber = /\d/.test(v);
    const hasSpecial = /[^a-zA-Z0-9]/.test(v);
    const score = [v.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return "weak";
    if (score === 3) return "medium";
    return "strong";
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pw = control.get("password");
    const rp = control.get("repeatPassword");
    if (pw && rp && pw.value !== rp.value) return { passwordMismatch: true };
    return null;
  }

  setRole(role: string): void {
    this.registerForm.get("role")?.setValue(role);
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }
  toggleRepeatPassword(): void { this.showRepeatPassword = !this.showRepeatPassword; }

  onSubmit(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;

    this.isSubmitting = true;
    this.apiError = "";

    const fv = this.registerForm.value;
    const data: RegisterRequest = {
      username: fv.username,
      email: fv.email,
      name: fv.name,
      lastName: fv.lastName,
      phoneNumber: fv.phoneNumber,
      password: fv.password,
      birthdate: fv.birthdate,
      role: fv.role,
    };

    this.authService.register(data).subscribe({
      next: () => {
        this.authService.clearLocalSession();
        this.snackBar.open("¡Registro exitoso! Por favor, verifica tu correo electrónico.", "✕", {
          duration: 6000,
          panelClass: ["snack-success"],
        });
        this.router.navigate(["/verify-email"]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.apiError = err?.error?.message ?? "Error al registrarse. Intentá de nuevo.";
      },
    });
  }

  navigateToLogin(): void {
    this.router.navigate(["/login"]);
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.backendUrl}/oauth2/authorization/google`;
  }

  loginWithGitHub(): void {
    window.location.href = `${environment.backendUrl}/oauth2/authorization/github`;
  }
}
