import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { UserUpdateRequest } from '../../models/user-update-request.model';
import { Observable, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { EditProfileDialogComponent } from '../shared/dialogs/edit-profile-dialog/edit-profile-dialog.component';
import { ChangeRoleDialogComponent } from '../shared/dialogs/change-role-dialog/change-role-dialog.component';

@Component({
  selector: 'app-perfil-config',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './perfil-config.component.html',
  styleUrl: './perfil-config.component.css'
})
export class PerfilConfigComponent {
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  currentUser$: Observable<{ username: string; role: string } | null> = this.authService.currentUser$;

  get isAdmin(): boolean {
    const roleParam = this.route.snapshot.queryParamMap.get('role');
    if (roleParam === 'admin') return true;
    const user = this.authService.getCurrentUserValue();
    return user?.role === 'admin' || user?.role === 'ADMIN';
  }

  get isCeo(): boolean {
    const roleParam = this.route.snapshot.queryParamMap.get('role');
    if (roleParam === 'ceo') return true;
    const user = this.authService.getCurrentUserValue();
    return user?.role === 'ceo' || user?.role === 'CEO';
  }

  get greeting(): string {
    return this.authService.getCurrentUserValue()?.username ?? 'Usuario';
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

  openEditProfile() {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser?.username) return;

    this.usersService.getUserByUsername(currentUser.username).subscribe({
      next: (fullUser) => {
        const dialogRef = this.dialog.open(EditProfileDialogComponent, {
          width: '440px',
          data: fullUser,
          autoFocus: false
        });

        dialogRef.afterClosed().subscribe(result => {
          if (!result) return;

          const updatePayload: UserUpdateRequest = {
            username:    result.username,
            name:        result.name,
            lastName:    result.lastName,
            email:       result.email,
            phoneNumber: result.phoneNumber,
            birthdate:   `${result.birthYear}-${String(result.birthMonth).padStart(2, '0')}-${String(result.birthDay).padStart(2, '0')}`
          };

          this.usersService.updateUser(currentUser.username, updatePayload).pipe(
            switchMap(() => {
              this.authService.logout();
              return this.authService.login({
                username: result.username,
                password: result.password
              });
            })
          ).subscribe({
            next: () => this.router.navigate(['/perfil-config']),
            error: (err) => console.error('Error al renovar la sesión:', err)
          });
        });
      },
      error: (err) => console.error('Error al obtener el perfil del usuario:', err)
    });
  }

  openChangeRole() {
    const user = this.authService.getCurrentUserValue();
    const dialogRef = this.dialog.open(ChangeRoleDialogComponent, {
      width: '440px',
      data: { role: (user as any)?.role || 'comprar' },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Role change data:', result);
      }
    });
  }

  openChangePassword() {
    this.router.navigate(['/change-password']);
  }
}
