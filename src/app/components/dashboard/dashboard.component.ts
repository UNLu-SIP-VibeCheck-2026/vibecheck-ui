import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  authService = inject(AuthService);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  user$ = this.authService.currentUser$;

  get userRole(): string {
    const roleParam = this.route.snapshot.queryParamMap.get('role');
    if (roleParam) return roleParam.toLowerCase();
    return this.authService.getCurrentUserValue()?.role?.toLowerCase() || '';
  }

  get isCliente(): boolean {
    return this.userRole === 'cliente' || this.userRole === 'comprar' || this.userRole === 'user';
  }

  get isOrganizador(): boolean {
    return this.userRole === 'organizador';
  }

  get isValidador(): boolean {
    return this.userRole === 'validador';
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  get isCeo(): boolean {
    return this.userRole === 'ceo';
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
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

  navigateToSystemLogs() {
    this.router.navigate(['/system-logs']);
  }
}
