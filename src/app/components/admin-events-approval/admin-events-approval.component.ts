import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { EventService } from '../../services/event.service';
import { EventResponse } from '../../models/event.model';
import { Page } from '../../models/page.model';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-admin-events-approval',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './admin-events-approval.component.html',
  styleUrls: ['./admin-events-approval.component.scss']
})
export class AdminEventsApprovalComponent implements OnInit {
  events: EventResponse[] = [];
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  error: string | null = null;

  selectedEvent: EventResponse | null = null;
  showRejectDialog = false;
  rejectionReason = '';

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkRole();
    this.loadPendingEvents();
  }

  private checkRole(): void {
    const user = this.authService.getCurrentUserValue();
    const role = user?.role?.toLowerCase();
    if (role !== 'admin' && role !== 'admin_eventos') {
      this.snackBar.open('No tienes permiso para acceder a esta página', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    }
  }

  loadPendingEvents(): void {
    this.loading = true;
    this.error = null;
    this.eventService.findPendingEvents(this.currentPage, this.pageSize).subscribe({
      next: (page: Page<EventResponse>) => {
        this.events = page.content;
        this.totalPages = page.totalPages;
        this.totalElements = page.totalElements;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar eventos pendientes de aprobación';
        this.loading = false;
        console.error(err);
      }
    });
  }

  approveEvent(event: EventResponse): void {
    this.loading = true;
    this.eventService.approveEvent(event.id).subscribe({
      next: () => {
        this.loadPendingEvents();
      },
      error: (err) => {
        this.error = 'Error al aprobar el evento';
        this.loading = false;
        console.error(err);
      }
    });
  }

  openRejectDialog(event: EventResponse): void {
    this.selectedEvent = event;
    this.showRejectDialog = true;
    this.rejectionReason = '';
  }

  closeRejectDialog(): void {
    this.selectedEvent = null;
    this.showRejectDialog = false;
    this.rejectionReason = '';
  }

  rejectEvent(): void {
    if (!this.selectedEvent || !this.rejectionReason.trim()) {
      return;
    }

    this.loading = true;
    this.eventService.rejectEvent(this.selectedEvent.id, this.rejectionReason).subscribe({
      next: () => {
        this.closeRejectDialog();
        this.loadPendingEvents();
      },
      error: (err) => {
        this.error = 'Error al rechazar el evento';
        this.loading = false;
        console.error(err);
      }
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadPendingEvents();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadPendingEvents();
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return '';
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
