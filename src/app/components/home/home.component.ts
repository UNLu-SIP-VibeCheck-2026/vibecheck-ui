import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToRecovery() {
    this.router.navigate(['/pass-recovery']);
  }

  navigateToUserProfile() {
    this.router.navigate(['/perfil-config']);
  }

  navigateToAdminUsers() {
    this.router.navigate(['/admin-users']);
  }

  navigateToAdminRoles() {
    this.router.navigate(['/admin-roles']);
  }

  navigateToAdminPermissions() {
    this.router.navigate(['/admin-permissions']);
  }
}
