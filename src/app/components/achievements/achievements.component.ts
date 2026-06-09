import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { AchievementService } from '../../services/achievement.service';
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

  achievements = signal<Achievement[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAchievements();
  }

  loadAchievements(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.achievementService.getMyAchievements().subscribe({
      next: (data) => {
        // Ordenar: Completados primero (por completedAt más reciente) y luego no completados
        const sorted = data.sort((a, b) => {
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          if (a.completed && b.completed) {
            const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return dateB - dateA; // Más reciente primero
          }
          // Si ninguno está completado, ordenar por progreso (%) descendente
          const pctA = a.progress / a.threshold;
          const pctB = b.progress / b.threshold;
          return pctB - pctA;
        });
        this.achievements.set(sorted);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar logros:', err);
        this.error.set('No se pudieron cargar los logros. Por favor, intenta de nuevo más tarde.');
        this.isLoading.set(false);
      }
    });
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
}
