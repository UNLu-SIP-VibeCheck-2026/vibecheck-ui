import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-email-verify',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './email-verify.component.html',
  styleUrls: ['./email-verify.component.scss']
})
export class EmailVerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);

  status: 'loading' | 'success' | 'error' = 'loading';
  message: string = 'Verificando tu correo electrónico...';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status = 'error';
      this.message = 'Token de verificación no encontrado.';
      this.autoRedirect();
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

  private autoRedirect(): void {
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 4000);
  }
}
