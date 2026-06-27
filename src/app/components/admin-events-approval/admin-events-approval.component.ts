import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { EventService } from '../../services/event.service';
import { TicketTypeService } from '../../services/ticket-type.service';
import { TicketTypeResponse } from '../../models/ticket-type.model';
import { EventResponse } from '../../models/event.model';
import { Page } from '../../models/page.model';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-admin-events-approval',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './admin-events-approval.component.html',
  styleUrls: ['./admin-events-approval.component.scss']
})
export class AdminEventsApprovalComponent implements OnInit {
  private eventService = inject(EventService);
  private ticketTypeService = inject(TicketTypeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  events: EventResponse[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  loading = false;
  error: string | null = null;
  activeTab: 'events' | 'cancellations' = 'events';
  ticketTypesMap = new Map<number, TicketTypeResponse[]>();

  rejectingEvent: EventResponse | null = null;
  rejectionReason = '';

  ngOnInit(): void {
    this.checkRole();
    this.switchTab('events');
  }

  private checkRole(): void {
    const user = this.authService.getCurrentUserValue();
    const role = user?.role?.toLowerCase();
    if (role !== 'admin' && role !== 'admin_eventos') {
      this.snackBar.open('No tienes permiso para acceder a esta página', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    }
  }

  switchTab(tab: 'events' | 'cancellations'): void {
    this.activeTab = tab;
    this.currentPage = 0;
    this.events = [];
    this.totalElements = 0;
    if (tab === 'events') {
      this.loadPendingEvents();
    } else {
      this.loadPendingCancellations();
    }
  }

  loadPendingEvents(): void {
    this.loading = true;
    this.error = null;
    this.eventService.findPendingEvents(this.currentPage, this.pageSize).subscribe({
      next: (page: Page<EventResponse>) => {
        this.events = page.content;
        this.totalElements = page.totalElements;
        this.loadTicketTypesForEvents(page.content);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar eventos pendientes de aprobación';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadPendingCancellations(): void {
    this.loading = true;
    this.error = null;
    this.eventService.findPendingCancellations(this.currentPage, this.pageSize).subscribe({
      next: (page: Page<EventResponse>) => {
        this.events = page.content;
        this.totalElements = page.totalElements;
        this.loadTicketTypesForEvents(page.content);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar solicitudes de cancelación';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadTicketTypesForEvents(events: EventResponse[]): void {
    events.forEach(event => {
      this.ticketTypeService.findTicketTypesByEvent(event.id).subscribe({
        next: (types) => {
          this.ticketTypesMap.set(event.id, types);
        },
        error: (err) => {
          console.error(`Error al cargar tipos de entradas para el evento ${event.id}:`, err);
        }
      });
    });
  }

  approveEvent(event: EventResponse): void {
    this.loading = true;
    this.eventService.approveEvent(event.id).subscribe({
      next: () => {
        this.snackBar.open('Evento aprobado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadPendingEvents();
      },
      error: (err) => {
        this.snackBar.open('Error al aprobar el evento', 'Cerrar', { duration: 3000 });
        this.loading = false;
        console.error(err);
      }
    });
  }

  approveCancellation(event: EventResponse): void {
    this.loading = true;
    this.eventService.approveCancellation(event.id).subscribe({
      next: () => {
        this.snackBar.open('Solicitud de cancelación aprobada exitosamente', 'Cerrar', { duration: 3000 });
        this.loadPendingCancellations();
      },
      error: (err) => {
        this.snackBar.open('Error al aprobar la cancelación', 'Cerrar', { duration: 3000 });
        this.loading = false;
        console.error(err);
      }
    });
  }

  openRejectDialog(event: EventResponse): void {
    this.rejectingEvent = event;
    this.rejectionReason = '';
  }

  cancelReject(): void {
    this.rejectingEvent = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.rejectingEvent || !this.rejectionReason.trim()) {
      this.snackBar.open('Por favor ingresa un motivo de rechazo', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;
    if (this.activeTab === 'events') {
      this.eventService.rejectEvent(this.rejectingEvent.id, this.rejectionReason).subscribe({
        next: () => {
          this.snackBar.open('Evento rechazado exitosamente', 'Cerrar', { duration: 3000 });
          this.rejectingEvent = null;
          this.rejectionReason = '';
          this.loadPendingEvents();
        },
        error: (err) => {
          this.snackBar.open('Error al rechazar el evento', 'Cerrar', { duration: 3000 });
          this.loading = false;
          console.error(err);
        }
      });
    } else {
      this.eventService.rejectCancellation(this.rejectingEvent.id, this.rejectionReason).subscribe({
        next: () => {
          this.snackBar.open('Solicitud de cancelación rechazada exitosamente. El evento vuelve a PUBLIC.', 'Cerrar', { duration: 3000 });
          this.rejectingEvent = null;
          this.rejectionReason = '';
          this.loadPendingCancellations();
        },
        error: (err) => {
          this.snackBar.open('Error al rechazar la cancelación', 'Cerrar', { duration: 3000 });
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    if (this.activeTab === 'events') {
      this.loadPendingEvents();
    } else {
      this.loadPendingCancellations();
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL':
      case 'PENDING_CANCELLATION':
        return 'status-pending';
      case 'APPROVED':
      case 'CANCELLATION_APPROVED':
        return 'status-approved';
      case 'REJECTED':
      case 'CANCELLED':
        return 'status-rejected';
      default:
        return '';
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
