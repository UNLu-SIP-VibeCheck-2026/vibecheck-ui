import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule, MatDividerModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private router = inject(Router);
  authService = inject(AuthService);

  user$ = this.authService.currentUser$;

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToPerfilConfig(): void {
    this.router.navigate(['/perfil-config']);
  }

  navigateToMyPublicProfile(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.username) {
      this.router.navigate(['/perfil-user', user.username]);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
