import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { AchievementService } from '../../services/achievement.service';
import { TicketService } from '../../services/ticket.service';
import { EventService } from '../../services/event.service';
import { VenueService } from '../../services/venue.service';
import { UserPublicResponse } from '../../models/user-public-response.model';
import { Achievement } from '../../models/achievement.model';
import { UserUpdateRequest } from '../../models/user-update-request.model';
import { ChangeRoleDialogComponent } from '../shared/dialogs/change-role-dialog/change-role-dialog.component';
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AvatarComponent } from '../shared/avatar/avatar.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

export interface UserEventUI {
  id: number;
  title: string;
  startDate: string;
  venue: string;
  categories: string[];
  imageUrl?: SafeUrl | string;
  location: string; // Seat row/number or general entry
}

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
  private ticketService = inject(TicketService);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);

  profile = signal<UserPublicResponse | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);

  // Candy 1: Bio
  bio = signal<string>('');
  isEditingBio = signal<boolean>(false);

  // Candy 3: Achievements
  achievements = signal<Achievement[]>([]);
  isLoadingAchievements = signal<boolean>(false);

  // Candy 4: Events
  attendedEvents = signal<UserEventUI[]>([]);
  isLoadingEvents = signal<boolean>(false);

  private eventCache = new Map<number, Observable<any>>();
  private venueCache = new Map<number, Observable<any>>();

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
      case 'PLATINUM':
      case 'DIAMOND':
      case 'DIAMANTE':
        return 'Diamante';
      case 'BRONZE':
      default:
        return 'Bronce';
    }
  });

  userTierKey = computed(() => {
    const p = this.profile();
    if (!p) return 'BRONZE';
    const tier = (p.tier || 'BRONZE').toUpperCase();
    if (tier === 'DIAMOND' || tier === 'DIAMANTE') return 'PLATINUM';
    return tier;
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
    this.bio.set('¡Hola! Soy un apasionado por la música y los eventos tecnológicos. Nos vemos en el próximo show.');

    // Load achievements
    this.loadAchievements(p.username);

    // Load events
    this.loadEvents(p.username);
  }

  loadAchievements(username: string): void {
    this.isLoadingAchievements.set(true);
    if (this.isOwnProfile()) {
      this.achievementService.getMyAchievements().subscribe({
        next: (data) => {
          this.processAchievements(data);
          this.isLoadingAchievements.set(false);
        },
        error: () => {
          this.loadMockAchievements();
          this.isLoadingAchievements.set(false);
        }
      });
    } else {
      this.loadMockAchievements();
      this.isLoadingAchievements.set(false);
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

  loadEvents(username: string): void {
    this.isLoadingEvents.set(true);
    if (this.isOwnProfile()) {
      this.ticketService.getMyTickets(0, 20).subscribe({
        next: (page) => {
          if (!page.content || page.content.length === 0) {
            this.loadMockEvents();
            this.isLoadingEvents.set(false);
            return;
          }

          // Fetch details for the latest tickets (limit 4 unique events)
          const uniqueEventTickets: any[] = [];
          page.content.forEach((t) => {
            if (uniqueEventTickets.length < 4 && !uniqueEventTickets.some(et => et.ticketType.eventId === t.ticketType.eventId)) {
              uniqueEventTickets.push(t);
            }
          });

          const eventRequests = uniqueEventTickets.map((t) => {
            const eventId = t.ticketType.eventId;
            const locationStr = t.ticketType.hasSeats
              ? `Fila ${t.seatRow} - Asiento ${t.seatNumber}`
              : "Entrada General";

            return this.getEventWithImageAndVenue(eventId).pipe(
              map((details) => ({
                id: eventId,
                title: details.event.title,
                startDate: this.formatEventDate(details.event.startDate),
                venue: details.venueName,
                categories: details.event.realCategories || ["Música"],
                imageUrl: details.imageUrl,
                location: locationStr
              })),
              catchError(() => of({
                id: eventId,
                title: "Evento ID: " + eventId,
                startDate: "Fecha no disponible",
                venue: "Venue no disponible",
                categories: ["Música"],
                imageUrl: undefined,
                location: locationStr
              }))
            );
          });

          if (eventRequests.length === 0) {
            this.loadMockEvents();
            this.isLoadingEvents.set(false);
          } else {
            forkJoin(eventRequests).subscribe({
              next: (results) => {
                this.attendedEvents.set(results);
                this.isLoadingEvents.set(false);
              },
              error: () => {
                this.loadMockEvents();
                this.isLoadingEvents.set(false);
              }
            });
          }
        },
        error: () => {
          this.loadMockEvents();
          this.isLoadingEvents.set(false);
        }
      });
    } else {
      this.loadMockEvents();
      this.isLoadingEvents.set(false);
    }
  }

  getEventWithImageAndVenue(eventId: number): Observable<any> {
    if (!this.eventCache.has(eventId)) {
      const obs = forkJoin({
        event: this.eventService.findByIdEvent(eventId),
        image: this.eventService.getEventImage(eventId).pipe(
          map(blob => this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob))),
          catchError(() => of(undefined))
        )
      }).pipe(
        switchMap((res: any) => {
          if (res.event.venueId) {
            return this.getVenueName(res.event.venueId).pipe(
              map(venueName => ({
                event: res.event,
                imageUrl: res.image,
                venueName
              }))
            );
          }
          return of({
            event: res.event,
            imageUrl: res.image,
            venueName: "Sin sede asignada"
          });
        }),
        shareReplay(1)
      );
      this.eventCache.set(eventId, obs);
    }
    return this.eventCache.get(eventId)!;
  }

  getVenueName(venueId: number): Observable<string> {
    if (!this.venueCache.has(venueId)) {
      const obs = this.venueService.findVenueById(venueId).pipe(
        map(venue => venue.title),
        catchError(() => of("Sede no disponible")),
        shareReplay(1)
      );
      this.venueCache.set(venueId, obs);
    }
    return this.venueCache.get(venueId)!;
  }

  loadMockEvents(): void {
    this.attendedEvents.set([
      {
        id: 101,
        title: 'WOS DESCARTABLE',
        startDate: 'Sáb, 20 Junio 2026',
        venue: 'Estadio Racing Club',
        categories: ['Música'],
        location: 'Fila A - Asiento 14'
      },
      {
        id: 102,
        title: 'FESTIVAL LATIDO SEGUNDO',
        startDate: 'Dom, 12 Julio 2026',
        venue: 'Complejo Art Media',
        categories: ['Festival', 'Arte'],
        location: 'Entrada General'
      },
      {
        id: 103,
        title: 'OCTUBRE ELECTRÓNICO',
        startDate: 'Vie, 09 Octubre 2026',
        venue: 'Crobar Club',
        categories: ['Música', 'Electrónica'],
        location: 'VIP de Pie'
      },
      {
        id: 104,
        title: 'CONGRESO WEB3 Y DEFI',
        startDate: 'Lun, 16 Noviembre 2026',
        venue: 'Centro de Convenciones UBA',
        categories: ['Tecnología'],
        location: 'Fila M - Asiento 05'
      }
    ]);
  }

  formatEventDate(dateStr: string): string {
    if (!dateStr) return "—";
    try {
      const formatted = new Date(dateStr).toLocaleString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return dateStr;
    }
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
}

