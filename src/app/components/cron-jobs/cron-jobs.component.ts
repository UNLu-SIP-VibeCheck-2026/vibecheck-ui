import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CronJobService, CronJobExecutionResponse } from '../../services/cron-job.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface CronJob {
  id: string;
  name: string;
  description: string;
  icon: string;
  method: () => void;
  loading: boolean;
  lastExecution?: CronJobExecutionResponse;
}

@Component({
  selector: 'app-cron-jobs',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatSnackBarModule],
  templateUrl: './cron-jobs.component.html',
  styleUrl: './cron-jobs.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class CronJobsComponent implements OnInit {
  private cronJobService = inject(CronJobService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  cronJobs: CronJob[] = [
    {
      id: 'cleanup-expired-tokens',
      name: 'Limpieza de Tokens Expirados',
      description: 'Elimina los refresh tokens expirados de la base de datos para mantener la seguridad.',
      icon: 'delete_sweep',
      method: () => this.executeJob('cleanup-expired-tokens'),
      loading: false
    },
    {
      id: 'cleanup-expired-verification-tokens',
      name: 'Limpieza de Tokens de Verificación',
      description: 'Elimina los tokens de verificación de email expirados que no fueron utilizados.',
      icon: 'verified_user',
      method: () => this.executeJob('cleanup-expired-verification-tokens'),
      loading: false
    },
    {
      id: 'cleanup-expired-password-reset-tokens',
      name: 'Limpieza de Tokens de Reset',
      description: 'Elimina los tokens de reset de contraseña expirados que no fueron utilizados.',
      icon: 'lock_reset',
      method: () => this.executeJob('cleanup-expired-password-reset-tokens'),
      loading: false
    },
    {
      id: 'cleanup-expired-advertisements',
      name: 'Limpieza de Publicidades Expiradas',
      description: 'Limpia los planes de publicidad expirados, actualizando su estado o eliminándolos.',
      icon: 'campaign',
      method: () => this.executeJob('cleanup-expired-advertisements'),
      loading: false
    },
    {
      id: 'update-completed-events',
      name: 'Actualización de Eventos Completados',
      description: 'Actualiza eventos cuya fecha de fin pasó a estado COMPLETED para permitir calificaciones.',
      icon: 'event_available',
      method: () => this.executeJob('update-completed-events'),
      loading: false
    },
    {
      id: 'reconcile-stuck-transactions',
      name: 'Reconciliación de Transacciones',
      description: 'Reconcilia transacciones de staking atascadas en estados CLAIMING y PENDING.',
      icon: 'sync',
      method: () => this.executeJob('reconcile-stuck-transactions'),
      loading: false
    },
    {
      id: 'run-blockchain-indexer',
      name: 'Indexador de Blockchain',
      description: 'Ejecuta el indexador de blockchain para sincronizar datos con la base de datos local.',
      icon: 'link',
      method: () => this.executeJob('run-blockchain-indexer'),
      loading: false
    },
    {
      id: 'send-upcoming-event-reminders',
      name: 'Recordatorios de Eventos Próximos',
      description: 'Envía un recordatorio por correo a los fans con entradas activas 24 horas antes del inicio.',
      icon: 'notifications_active',
      method: () => this.executeJob('send-upcoming-event-reminders'),
      loading: false
    },
    {
      id: 'cleanup-expired-validators',
      name: 'Limpieza de Validadores Expirados',
      description: 'Desactiva los validadores de eventos que ya finalizaron o fueron completados/cancelados.',
      icon: 'person_remove',
      method: () => this.executeJob('cleanup-expired-validators'),
      loading: false
    }
  ];

  ngOnInit(): void {
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  executeJob(jobId: string): void {
    const job = this.cronJobs.find(j => j.id === jobId);
    if (!job) return;

    job.loading = true;

    let observable: Observable<CronJobExecutionResponse>;

    switch (jobId) {
      case 'cleanup-expired-tokens':
        observable = this.cronJobService.cleanupExpiredTokens();
        break;
      case 'cleanup-expired-verification-tokens':
        observable = this.cronJobService.cleanupExpiredVerificationTokens();
        break;
      case 'cleanup-expired-password-reset-tokens':
        observable = this.cronJobService.cleanupExpiredPasswordResetTokens();
        break;
      case 'cleanup-expired-advertisements':
        observable = this.cronJobService.cleanupExpiredAdvertisements();
        break;
      case 'update-completed-events':
        observable = this.cronJobService.updateCompletedEvents();
        break;
      case 'reconcile-stuck-transactions':
        observable = this.cronJobService.reconcileStuckTransactions();
        break;
      case 'run-blockchain-indexer':
        observable = this.cronJobService.runBlockchainIndexer();
        break;
      case 'send-upcoming-event-reminders':
        observable = this.cronJobService.sendUpcomingEventReminders();
        break;
      case 'cleanup-expired-validators':
        observable = this.cronJobService.cleanupExpiredValidators();
        break;
      default:
        job.loading = false;
        return;
    }

    observable.subscribe({
      next: (response) => {
        job.loading = false;
        job.lastExecution = response;
        
        if (response.status === 'SUCCESS') {
          this.snackBar.open(`${job.name} ejecutado exitosamente`, 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(`Error: ${response.message}`, 'Cerrar', { duration: 5000 });
        }
      },
      error: (error) => {
        job.loading = false;
        this.snackBar.open(`Error al ejecutar ${job.name}`, 'Cerrar', { duration: 5000 });
        console.error('Error executing cron job:', error);
      }
    });
  }
}
