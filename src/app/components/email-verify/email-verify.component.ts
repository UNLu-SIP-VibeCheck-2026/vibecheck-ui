import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-email-verify',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './email-verify.component.html',
  styleUrls: ['./email-verify.component.scss']
})
export class EmailVerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);

  status: 'loading' | 'success' | 'error' | 'pending-check' = 'loading';
  message: string = 'Verificando tu correo electrónico...';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status = 'pending-check';
      this.message = 'Te enviamos un correo de verificación. Por favor, revisá tu casilla para activar tu cuenta e ingresar al sistema.';
      return;
    }

    this.usersService.verifyEmail(token).subscribe({
      next: () => {
        this.status = 'success';
        this.message = '¡Email verificado con éxito!';
        this.autoRedirect();
      },
      error: (err) => {
        this.status = 'error';
        this.message = err.error?.message || 'Error al verificar el correo electrónico.';
        this.autoRedirect();
      }
    });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }

  private autoRedirect(): void {
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 4000);
  }
}
