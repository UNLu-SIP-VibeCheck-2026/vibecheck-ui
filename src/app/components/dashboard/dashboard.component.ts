import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { ChangeRoleDialogComponent } from '../shared/dialogs/change-role-dialog/change-role-dialog.component';
import { UserUpdateRequest } from '../../models/user-update-request.model';
import { UserPublicResponse } from '../../models/user-public-response.model';
import { EventResponse } from '../../models/event.model';
import { AvatarComponent } from '../shared/avatar/avatar.component';
import { ErrorService } from '../../services/error.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, AvatarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  usersService = inject(UsersService);
  private userPreferencesService = inject(UserPreferencesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private errorService = inject(ErrorService);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  user$ = this.authService.currentUser$;
  fullUserProfile: UserPublicResponse | null = null;
  assignedEvent: EventResponse | null = null;
  showRoleChangeHint = true;

  // Personalized Organizer invitations for Clients
  readonly organizerInviteMessages = [
    "¿Listo para llevar tu experiencia al siguiente nivel? Conviértete en Organizador y crea tus propios eventos.",
    "¡Hola! ¿Sabías que podés vender entradas para tus propios shows o conferencias? Convertite en Organizador hoy.",
    "¡Lanza tu primer evento! Cambia tu rol a Organizador desde tu perfil y empieza a gestionar tus tickets con Web3.",
    "¿Tenés un espacio o querés armar un show? Transfórmate en Organizador y publica tu evento gratis en VibeCheck."
  ];
  selectedInviteMessage = "";

  ngOnInit(): void {
    this.loadFullUserProfile();
    // Load user preferences only if user is not a validator
    if (!this.isValidador) {
      this.loadUserPreferences();
    }
    // Select a random invitation message
    this.selectedInviteMessage = this.organizerInviteMessages[Math.floor(Math.random() * this.organizerInviteMessages.length)];

    // Load assigned event if user is a validator
    if (this.isValidador) {
      this.loadAssignedEvent();
    }
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

  private loadAssignedEvent(): void {
    this.usersService.getAssignedEvent().subscribe({
      next: (event) => {
        this.assignedEvent = event;
      },
      error: () => {
        // If we can't load the assigned event, we'll just leave it as null
        this.assignedEvent = null;
      }
    });
  }

  private loadUserPreferences(): void {
    this.userPreferencesService.getPreferences().subscribe({
      next: (prefs) => {
        this.showRoleChangeHint = prefs.showRoleChangeHint;
      },
      error: () => {
        // If we can't load preferences, default to showing the hint
        this.showRoleChangeHint = true;
      }
    });
  }

  dismissRoleChangeHint(): void {
    this.userPreferencesService.updatePreferences({ showRoleChangeHint: false }).subscribe({
      next: () => {
        this.showRoleChangeHint = false;
      },
      error: (err) => {
        console.error('Error al actualizar preferencias:', err);
        this.errorService.handleError(err, 'Error al actualizar preferencias');
      }
    });
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
    return this.isCliente || this.isOrganizador;
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  get isCeo(): boolean {
    return this.userRole === 'ceo';
  }

  get isAdminVenues(): boolean {
    return this.userRole === 'admin_venues';
  }

  get isAdminUsuarios(): boolean {
    return this.userRole === 'admin_usuarios';
  }

  get isAdminEventos(): boolean {
    return this.userRole === 'admin_eventos';
  }

  // General check to identify any type of administrator/auditor role
  get isCualquierAdmin(): boolean {
    return this.isAdmin || this.isAdminUsuarios || this.isAdminEventos || this.isAdminVenues || this.isCeo;
  }

  // Check if any quick actions should be shown for the current user
  get hasQuickActions(): boolean {
    // Mi Perfil: shown if not admin and not validator
    const showPerfil = !this.isCualquierAdmin && !this.isValidador;
    // Mis Entradas: shown if cliente and not admin
    const showEntradas = this.isCliente && !this.isCualquierAdmin;
    // Mis Reventas: shown if cliente and not admin
    const showReventas = this.isCliente && !this.isCualquierAdmin;
    // Mi Billetera VC: shown if not admin and not validator
    const showBilletera = !this.isCualquierAdmin && !this.isValidador;
    // Configuraciones: shown if not cliente and not validator
    const showConfig = !this.isCliente && !this.isValidador;

    return showPerfil || showEntradas || showReventas || showBilletera || showConfig;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  openChangeRole(): void {
    const user = this.authService.getCurrentUserValue();
    if (!user?.username) return;

    const dialogRef = this.dialog.open(ChangeRoleDialogComponent, {
      width: '440px',
      data: { username: user.username, initialRole: user.role },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.roleId && result.fullUser) {
        const fullUser = result.fullUser;
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

  navigateToCronJobs() {
    this.router.navigate(['/cron-jobs']);
  }

  openCameraScanner(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.errorService.handleError(
        { message: 'Tu navegador no soporta acceso a la cámara' },
        'Error al acceder a la cámara'
      );
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // Stop the stream immediately since we're just checking permission
        stream.getTracks().forEach(track => track.stop());
        
        // Navigate to the scanner page
        this.router.navigate(['/scanner']);
      })
      .catch((err) => {
        console.error('Error al acceder a la cámara:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.errorService.handleError(
            { message: 'Permiso de cámara denegado. Por favor habilita el acceso a la cámara en tu navegador.' },
            'Permiso de cámara denegado'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          this.errorService.handleError(
            { message: 'No se encontró ninguna cámara en el dispositivo.' },
            'Cámara no encontrada'
          );
        } else {
          this.errorService.handleError(
            { message: 'Error al acceder a la cámara: ' + err.message },
            'Error al acceder a la cámara'
          );
        }
      });
  }
}

