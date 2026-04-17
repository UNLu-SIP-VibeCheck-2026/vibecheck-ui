import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { EditProfileDialogComponent } from '../shared/dialogs/edit-profile-dialog/edit-profile-dialog.component';
import { ChangeRoleDialogComponent } from '../shared/dialogs/change-role-dialog/change-role-dialog.component';
import { ChangePasswordDialogComponent } from '../shared/dialogs/change-pass-dialog/change-pass-dialog.component';

@Component({
  selector: 'app-perfil-user',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './perfil-user.component.html',
  styleUrl: './perfil-user.component.scss'
})
export class PerfilUserComponent {
  private authService = inject(AuthService);
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

  get greeting(): string {
    return this.isAdmin ? 'Administrador Usuario' : 'Usuario';
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

  openEditProfile() {
    const user = this.authService.getCurrentUserValue();
    const dialogRef = this.dialog.open(EditProfileDialogComponent, {
      width: '440px',
      data: user,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Profile update data:', result);
      }
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
