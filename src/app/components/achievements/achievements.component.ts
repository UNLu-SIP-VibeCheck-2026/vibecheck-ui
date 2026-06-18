import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { AchievementService } from '../../services/achievement.service';
import { AuthService } from '../../services/auth.service';
import { Achievement } from '../../models/achievement.model';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule
  ],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss']
})
export class AchievementsComponent implements OnInit {
  private achievementService = inject(AchievementService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  achievements = signal<Achievement[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  profileUsername = signal<string | null>(null);

  isOwnAchievements = computed(() => {
    const username = this.profileUsername();
    const currentUser = this.authService.getCurrentUserValue();
    if (!username || !currentUser) return true;
    return username.toLowerCase() === currentUser.username.toLowerCase();
  });

  ngOnInit(): void {
    const usernameParam = this.route.snapshot.paramMap.get('username');
    this.profileUsername.set(usernameParam);
    this.loadAchievements();
  }

  loadAchievements(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const username = this.profileUsername();
    const obs$ = username 
      ? this.achievementService.getAchievementsForUser(username)
      : this.achievementService.getMyAchievements();

    obs$.subscribe({
      next: (data) => {
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

        if (sorted.length === 0) {
          this.achievements.set(this.getMockAchievementsPool());
        } else {
          this.achievements.set(sorted);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar logros:', err);
        this.achievements.set(this.getMockAchievementsPool());
        this.isLoading.set(false);
      }
    });
  }

  getMockAchievementsPool(): Achievement[] {
    return [
      { id: 1, name: 'Melómano', description: 'Asististe a más de 5 conciertos de rock', progress: 5, threshold: 5, completed: true, completedAt: '2026-05-10T12:00:00Z', metric: 'events_attended' },
      { id: 2, name: 'Explorador Urbano', description: 'Visitaste 3 venues diferentes', progress: 3, threshold: 3, completed: true, completedAt: '2026-06-01T15:30:00Z', metric: 'events_attended' },
      { id: 3, name: 'Inversor Social', description: 'Apoyaste a organizadores locales', progress: 8, threshold: 10, completed: false, completedAt: null, metric: 'organizer_votes' },
      { id: 4, name: 'Creador de Vivas', description: 'Organiza tu primer festival masivo', progress: 1, threshold: 5, completed: false, completedAt: null, metric: 'events_created' }
    ];
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

  goBack(): void {
    this.location.back();
  }
}
