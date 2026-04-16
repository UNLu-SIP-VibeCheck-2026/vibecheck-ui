import {Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {MatSnackBar} from '@angular/material/snack-bar';
import {AuthService} from '../../services/auth.service';
import {LoginRequest} from '../../models/login-request.model';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        CommonModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

    loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
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
                this.snackBar.open('Inicio de sesión exitoso', 'Cerrar', {
                    duration: 3000
                });
                this.router.navigate(['/']);
            },
            error: (error) => {
                this.isSubmitting = false;
                this.snackBar.open('Error al iniciar sesión: ' + error.message, 'Cerrar', {
                    duration: 5000
                });
            }
        });
    }

    navigateToRegister(): void {
        this.router.navigate(['/register']);
    }
}
