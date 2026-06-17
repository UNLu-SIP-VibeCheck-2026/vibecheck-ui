import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { AchievementService } from '../../services/achievement.service';
import { HistoryService } from '../../services/history.service';
import { EventService } from '../../services/event.service';
import { UserPublicResponse } from '../../models/user-public-response.model';
import { Achievement } from '../../models/achievement.model';
import { UserHistoryItem } from '../../models/user-history.model';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserUpdateRequest } from '../../models/user-update-request.model';
import { ChangeRoleDialogComponent } from '../shared/dialogs/change-role-dialog/change-role-dialog.component';
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AvatarComponent } from '../shared/avatar/avatar.component';
import { TierInfoDialogComponent } from '../shared/dialogs/tier-info-dialog/tier-info-dialog.component';

@Component({
  selector: 'app-perfil-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule,
    AvatarComponent
  ],
  templateUrl: './perfil-user.component.html',
  styleUrl: './perfil-user.component.scss'
})
export class PerfilUserComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private achievementService = inject(AchievementService);
  private historyService = inject(HistoryService);
  private eventService = inject(EventService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  profile = signal<UserPublicResponse | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);

  // Candy 1: Bio
  bio = signal<string>('');
  isEditingBio = signal<boolean>(false);

  // Candy 3: Achievements
  achievements = signal<Achievement[]>([]);
  isLoadingAchievements = signal<boolean>(false);

  // Candy 5: Owner history
  eventHistory = signal<UserHistoryItem[]>([]);
  isLoadingHistory = signal<boolean>(false);
  hasHistoryError = signal<boolean>(false);

  // Computed properties
  fullName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return `${p.name || ''} ${p.lastName || ''}`.trim();
  });

  isOwnProfile = computed(() => {
    const p = this.profile();
    const currentUser = this.authService.getCurrentUserValue();
    if (!p || !currentUser) return false;
    return p.username.toLowerCase() === currentUser.username.toLowerCase();
  });

  userTierName = computed(() => {
    const p = this.profile();
    if (!p) return 'Bronce';
    const tier = (p.tier || 'BRONZE').toUpperCase();
    switch (tier) {
      case 'SILVER': return 'Plata';
      case 'GOLD': return 'Oro';
      case 'PLATINUM': return 'Platino';
      case 'BRONZE':
      default:
        return 'Bronce';
    }
  });

  userTierKey = computed(() => {
    const p = this.profile();
    if (!p) return 'BRONZE';
    const tier = (p.tier || 'BRONZE').toUpperCase();
    
    // Map Spanish tier names to English for image loading
    const tierMap: Record<string, string> = {
      'BRONCE': 'BRONZE',
      'PLATA': 'SILVER',
      'ORO': 'GOLD',
      'PLATINO': 'PLATINUM',
      'SILVER': 'SILVER',
      'GOLD': 'GOLD',
      'PLATINUM': 'PLATINUM'
    };
    
    return tierMap[tier] || 'BRONZE';
  });

  userTierImage = computed(() => {
    const tier = this.userTierKey();
    return `/assets/VC-Tier${tier}.png`;
  });

  ngOnInit(): void {
    const username = this.route.snapshot.paramMap.get('username');
    if (!username) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.usersService.getPublicUser(username).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.isLoading.set(false);
        this.loadCandyData();
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  loadCandyData(): void {
    const p = this.profile();
    if (!p) return;

    // Load Bio
    this.bio.set(p.description || '');

    // Load achievements
    this.loadAchievements(p.username);

    // Load attendance history for the profile
    this.loadHistory(p.username);
  }

  loadAchievements(username: string): void {
    this.isLoadingAchievements.set(true);
    this.achievementService.getAchievementsForUser(username).subscribe({
      next: (data) => {
        this.processAchievements(data);
        this.isLoadingAchievements.set(false);
      },
      error: (err) => {
        console.error('Error al cargar logros del usuario:', err);
        this.loadMockAchievements();
        this.isLoadingAchievements.set(false);
      }
    });
  }

  viewAllAchievements(): void {
    const p = this.profile();
    if (p) {
      this.router.navigate(['/achievements', p.username]);
    }
  }

  processAchievements(data: Achievement[]): void {
    // Sort: Completed first (newest completedAt first), then incomplete by descending progress percentage
    const sorted = data.sort((a, b) => {
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      if (a.completed && b.completed) {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      }
      const pctA = a.progress / a.threshold;
      const pctB = b.progress / b.threshold;
      return pctB - pctA;
    });

    // Complete up to 4 achievements. If total sorted is less than 4, we use mock achievements to fill.
    let finalAchievements = sorted.slice(0, 4);
    if (finalAchievements.length < 4) {
      const mockPool = this.getMockAchievementsPool();
      for (const mock of mockPool) {
        if (finalAchievements.length >= 4) break;
        if (!finalAchievements.some(a => a.id === mock.id || a.name === mock.name)) {
          finalAchievements.push(mock);
        }
      }
    }
    this.achievements.set(finalAchievements);
  }

  loadMockAchievements(): void {
    this.achievements.set(this.getMockAchievementsPool().slice(0, 4));
  }

  getMockAchievementsPool(): Achievement[] {
    return [
      { id: 1, name: 'Melómano', description: 'Asististe a más de 5 conciertos de rock', progress: 5, threshold: 5, completed: true, completedAt: '2026-05-10T12:00:00Z', metric: 'events_attended' },
      { id: 2, name: 'Explorador Urbano', description: 'Visitaste 3 venues diferentes', progress: 3, threshold: 3, completed: true, completedAt: '2026-06-01T15:30:00Z', metric: 'events_attended' },
      { id: 3, name: 'Inversor Social', description: 'Apoyaste a organizadores locales', progress: 8, threshold: 10, completed: false, completedAt: null, metric: 'organizer_votes' },
      { id: 4, name: 'Creador de Vivas', description: 'Organiza tu primer festival masivo', progress: 1, threshold: 5, completed: false, completedAt: null, metric: 'events_created' }
    ];
  }

  loadHistory(username: string): void {
    this.isLoadingHistory.set(true);
    this.hasHistoryError.set(false);

    this.historyService.getUserHistory(username, 0, 4, "attendedAt,desc").subscribe({
      next: (page) => {
        const items = page.content ?? [];
        
        const itemsWithImages = items.map((item) => {
          return this.eventService.getEventImage(item.eventId).pipe(
            map((blob) => {
              const imageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
              return { ...item, imageUrl };
            }),
            catchError(() => of({ ...item, imageUrl: undefined }))
          );
        });

        if (itemsWithImages.length === 0) {
          this.eventHistory.set([]);
          this.isLoadingHistory.set(false);
        } else {
          forkJoin(itemsWithImages).subscribe({
            next: (results) => {
              this.eventHistory.set(results);
              this.isLoadingHistory.set(false);
            },
            error: () => {
              this.eventHistory.set(items);
              this.isLoadingHistory.set(false);
            }
          });
        }
      },
      error: () => {
        this.eventHistory.set([]);
        this.hasHistoryError.set(true);
        this.isLoadingHistory.set(false);
      }
    });
  }

  viewAllHistory(): void {
    const p = this.profile();
    if (p) {
      this.router.navigate(['/perfil-user', p.username, 'historial']);
    }
  }

  toggleVisibility(item: UserHistoryItem): void {
    if (!this.isOwnProfile() || !item.id) return;

    const newVisibility = !item.publicVisibility;
    this.historyService.updateVisibility(item.id, newVisibility).subscribe({
      next: (updatedItem) => {
        this.eventHistory.update((list) =>
          list.map((x) => (x.id === item.id ? { ...x, publicVisibility: updatedItem.publicVisibility } : x))
        );
        this.snackBar.open(
          updatedItem.publicVisibility
            ? 'Entrada configurada como pública'
            : 'Entrada configurada como privada',
          'Cerrar',
          { duration: 2500 }
        );
      },
      error: (err) => {
        console.error('Error al cambiar visibilidad:', err);
        const errMsg = err.error?.message || 'Error al cambiar la visibilidad de la entrada';
        this.snackBar.open(errMsg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  formatHistoryDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    const formatted = date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  shortHistoryValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return "—";
    const text = String(value);
    return text.length > 18 ? `${text.slice(0, 10)}...${text.slice(-6)}` : text;
  }

  getProgressPercentage(achievement: Achievement): number {
    if (achievement.completed) return 100;
    return Math.min(100, Math.round((achievement.progress / achievement.threshold) * 100));
  }

  getAchievementIcon(metric: string): string {
    switch (metric) {
      case 'events_created':
        return 'event';
      case 'events_attended':
        return 'confirmation_number';
      case 'organizer_votes':
        return 'thumb_up';
      default:
        return 'emoji_events';
    }
  }

  // Edit profile nav
  navigateToEditProfile(): void {
    this.router.navigate(['/perfil-config']);
  }

  // Change role implementation clone from dashboard
  openChangeRole(): void {
    const user = this.authService.getCurrentUserValue();
    if (!user?.username || !this.isOwnProfile()) return;

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
                // Re-fetch profile to display new role badge
                this.usersService.getPublicUser(user.username).subscribe(data => {
                  this.profile.set(data);
                });
              },
              error: (err) => {
                console.error('Error al refrescar el token:', err);
                this.snackBar.open('Rol cambiado. Reinicia sesión para ver los cambios.', 'Cerrar', { duration: 4000 });
              }
            });
          },
          error: (err) => {
            console.error('Error al cambiar el rol:', err);
            this.snackBar.open('Error al actualizar el rol', 'Cerrar', { duration: 3000 });
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  onProfilePhotoChanged(): void {
    const username = this.route.snapshot.paramMap.get('username');
    if (!username) return;

    this.usersService.getPublicUser(username).subscribe({
      next: (data) => {
        this.profile.set(data);
      }
    });
  }

  saveBio(): void {
    const p = this.profile();
    const currentUser = this.authService.getCurrentUserValue();
    if (!p || !currentUser || !this.isOwnProfile()) return;

    const updatedText = this.bio().trim();
    if (updatedText.length > 256) {
      this.snackBar.open('La descripción no puede superar los 256 caracteres', 'Cerrar', { duration: 3000 });
      return;
    }

    const updatePayload = {
      description: updatedText
    } as UserUpdateRequest;

    this.usersService.updateUser(p.username, updatePayload).subscribe({
      next: () => {
        this.isEditingBio.set(false);
        this.snackBar.open('Biografía actualizada', 'Cerrar', { duration: 2500 });
        
        this.usersService.getPublicUser(p.username).subscribe({
          next: (data) => {
            this.profile.set(data);
            this.bio.set(data.description || '');
          }
        });
      },
      error: (err) => {
        console.error('Error al actualizar la biografía:', err);
        const errMsg = err.error?.message || 'Error al actualizar la biografía';
        this.snackBar.open(errMsg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  openTierInfo(): void {
    this.dialog.open(TierInfoDialogComponent, {
      width: '540px',
      autoFocus: false
    });
  }
}
