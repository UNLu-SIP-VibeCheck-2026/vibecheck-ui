import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { UserUpdateRequest } from '../../models/user-update-request.model';
import { Observable, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { EditProfileDialogComponent } from '../shared/dialogs/edit-profile-dialog/edit-profile-dialog.component';
import { ChangeRoleDialogComponent } from '../shared/dialogs/change-role-dialog/change-role-dialog.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-perfil-config',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatIconModule
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
  private snackBar = inject(MatSnackBar);

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
            birthdate:   result.birthdate   // BirthdatePicker emits 'YYYY-MM-DD'
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
            error: (err) =>  this.snackBar.open(err?.error?.message || "Error al renovar la sesión:", "Cerrar", { duration: 4000 }),});
        });
      },
      error: (err) =>  this.snackBar.open(err?.error?.message || "Error al obtener el perfil del usuario:", "Cerrar", { duration: 4000 }),});
  }

  openChangeRole() {
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

            // Formatear la fecha de nacimiento de array [YYYY, MM, DD] a string 'YYYY-MM-DD' si es necesario
            let formattedBirthdate = fullUser.birthdate;
            if (Array.isArray(fullUser.birthdate)) {
              const [year, month, day] = fullUser.birthdate;
              formattedBirthdate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
            
            const updatePayload: UserUpdateRequest = {
              username:    fullUser.username,
              name:        fullUser.name,
              lastName:    fullUser.lastName,
              email:       fullUser.email,
              phoneNumber: fullUser.phoneNumber,
              birthdate:   formattedBirthdate,
              roleId:      result.roleId
            };

            this.usersService.updateUser(user.username, updatePayload).subscribe({
              next: () => {
                // Refresh tokens to get the new role claim without logging out
                this.authService.refreshToken().subscribe({
                  next: () => {
                    this.snackBar.open('Rol actualizado y sesión sincronizada', 'Cerrar', { duration: 3000 });
                  },
                  error: (err) => {
                    console.error('Error al refrescar el token:', err);
                    this.snackBar.open('Rol actualizado, por favor reinicia sesión para ver los cambios', 'Cerrar', { duration: 5000 });
                  }
                });
              },
              error: (err) => {
                console.error('Error al cambiar el rol:', err);
                this.snackBar.open('Error al actualizar el rol', 'Cerrar', { duration: 5000 });
              }
            });
          }
        });
      },
      error: (err) =>  this.snackBar.open(err?.error?.message || "Error al obtener perfil para cambio de rol:", "Cerrar", { duration: 4000 }),});
  }

  openChangePassword() {
    this.router.navigate(['/change-password']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
