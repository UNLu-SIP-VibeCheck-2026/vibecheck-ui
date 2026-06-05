import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { ChangeRoleDialogComponent } from '../shared/dialogs/change-role-dialog/change-role-dialog.component';
import { UserUpdateRequest } from '../../models/user-update-request.model';
import { UserPublicResponse } from '../../models/user-public-response.model';
import { AvatarComponent } from '../shared/avatar/avatar.component';
import { ErrorService } from '../../services/error.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, AvatarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  usersService = inject(UsersService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private errorService = inject(ErrorService);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  user$ = this.authService.currentUser$;
  fullUserProfile: UserPublicResponse | null = null;

  ngOnInit(): void {
    this.loadFullUserProfile();
  }

  private loadFullUserProfile(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.username) {
      this.usersService.getUserByUsername(user.username).subscribe({
        next: (profile) => {
          this.fullUserProfile = profile;
        },
        error: () => {
          // If we can't load the full profile, we'll just use the basic user info
        }
      });
    }
  }

  onProfilePhotoChanged(): void {
    this.loadFullUserProfile();
  }

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

  get canChangeRole(): boolean {
    return this.isCliente || this.isOrganizador || this.isValidador;
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

  openChangeRole(): void {
    const user = this.authService.getCurrentUserValue();
    if (!user?.username) return;

    this.usersService.getUserByUsername(user.username).subscribe({
      next: (fullUser) => {
        const dialogRef = this.dialog.open(ChangeRoleDialogComponent, {
          width: '440px',
          data: { user: fullUser },
          autoFocus: false
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.roleId) {
            this.snackBar.open('Actualizando rol...', 'Cerrar', { duration: 2000 });

            let formattedBirthdate = fullUser.birthdate;
            if (Array.isArray(fullUser.birthdate)) {
              const [year, month, day] = fullUser.birthdate;
              formattedBirthdate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }

            const updatePayload: UserUpdateRequest = {
              username: fullUser.username,
              name: fullUser.name,
              lastName: fullUser.lastName,
              email: fullUser.email,
              phoneNumber: fullUser.phoneNumber,
              birthdate: formattedBirthdate,
              roleId: result.roleId
            };

            this.usersService.updateUser(user.username, updatePayload).subscribe({
              next: () => {
                this.authService.refreshToken().subscribe({
                  next: () => {
                    this.snackBar.open('Rol actualizado y sesión sincronizada', 'Cerrar', { duration: 3000 });
                  },
                  error: (err) => {
                    console.error('Error al refrescar el token:', err);
                    this.errorService.handleError(err, 'Rol actualizado, por favor reinicia sesión para ver los cambios');
                  }
                });
              },
              error: (err) => {
                console.error('Error al cambiar el rol:', err);
                this.errorService.handleError(err, 'Error al actualizar el rol');
              }
            });
          }
        });
      },
      error: (err) => this.errorService.handleError(err, 'Error al obtener perfil para cambio de rol:')
    });
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

  navigateToStatistics() {
    this.router.navigate(['/admin/statistics']);
  }
}
