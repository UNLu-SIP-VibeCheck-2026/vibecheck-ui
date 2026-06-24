import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
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
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
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
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  referralCode = "";

  showPassword = false;
  showRepeatPassword = false;
  isSubmitting = false;
  apiError = "";

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params["ref"]) {
        this.referralCode = params["ref"];
        document.cookie = `vibecheck_ref=${this.referralCode}; path=/; max-age=3600; SameSite=Lax`;
      }
    });
  }

  registerForm: FormGroup = this.fb.group(
    {
      username: ["", [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_.\-]+$/)]],
      email: ["", [Validators.required, Validators.email]],
      name: ["", [Validators.required]],
      lastName: ["", [Validators.required]],
      phoneNumber: ["", [this.phoneValidator]],
      password: ["", [Validators.required, Validators.minLength(8), this.passwordRequirementsValidator]],
      repeatPassword: ["", [Validators.required]],
      birthdate: [null, [Validators.required, this.birthdateAgeValidator]],
      role: ["comprar", [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  // Typed control getters for the template
  get usernameCtrl(): FormControl { return this.registerForm.get("username") as FormControl; }
  get emailCtrl(): FormControl { return this.registerForm.get("email") as FormControl; }
  get nameCtrl(): FormControl { return this.registerForm.get("name") as FormControl; }
  get lastNameCtrl(): FormControl { return this.registerForm.get("lastName") as FormControl; }
  get phoneCtrl(): FormControl { return this.registerForm.get("phoneNumber") as FormControl; }
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

  phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || "").toString().trim();
    if (!value) return null;
    if (!/^[0-9 +]+$/.test(value)) return { invalidPhoneFormat: true };
    const digits = value.replace(/[+\s]/g, "");
    if (digits.length < 10 || digits.length > 13) return { invalidPhoneLength: true };
    return null;
  }

  birthdateAgeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const birthdate = new Date(value);
    if (Number.isNaN(birthdate.getTime())) return { invalidBirthdate: true };

    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    if (birthdate > minAgeDate) return { underAge: true };
    
    const maxAgeDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    if (birthdate < maxAgeDate) return { tooOld: true };
    
    return null;
  }

  passwordRequirementsValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || "").toString();
    if (!value) return null;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);
    return hasUpper && hasLower && hasDigit && hasSpecial ? null : { passwordRequirements: true };
  }

  formatApiError(err: any): string {
    // Probar varias estructuras posibles del error
    const errorObj = err?.error || err;
    let message = errorObj?.message;
    let fields = errorObj?.fields;

    // Si no encontramos message en el nivel superior, buscar en error?.error
    if (!message) {
      message = errorObj?.error?.message;
      fields = errorObj?.error?.fields || fields;
    }

    if (message === "La solicitud contiene errores de validación" && fields && typeof fields === "object") {
      const fieldMessages = Object.values(fields)
        .filter((value: any) => !!value && typeof value === "string")
        .join(" / ");
      if (fieldMessages) {
        return `Error al registrarse: ${fieldMessages}`;
      }
    }

    if (message && typeof message === "string") {
      return `Error al registrarse: ${message}`;
    }

    return "Error al registrarse: Intentá de nuevo.";
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
      referralCode: this.referralCode || undefined,
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
        this.apiError = this.formatApiError(err);
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
