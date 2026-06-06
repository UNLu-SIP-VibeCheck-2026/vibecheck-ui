import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VenueService } from '../../services/venue.service';
import { VenueResponse, VenueStatus } from '../../models/venue.model';
import { Page } from '../../models/page.model';

import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-admin-venues-approval',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDialogModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './admin-venues-approval.component.html',
  styleUrl: './admin-venues-approval.component.scss'
})
export class AdminVenuesApprovalComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private venueService = inject(VenueService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  venues: VenueResponse[] = [];
  isLoading = false;
  pageIndex = 0;
  pageSize = 10;
  totalVenues = 0;
  rejectingVenue: VenueResponse | null = null;
  rejectionReason = '';

  ngOnInit(): void {
    this.checkRole();
    this.loadPendingVenues();
  }

  private checkRole(): void {
    const user = this.authService.getCurrentUserValue();
    const role = user?.role?.toLowerCase();
    if (role !== 'admin' && role !== 'admin_venues') {
      this.snackBar.open('No tienes permiso para acceder a esta página', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    }
  }

  loadPendingVenues(): void {
    this.isLoading = true;
    this.venueService.findPendingVenues(this.pageIndex, this.pageSize).subscribe({
      next: (page: Page<VenueResponse>) => {
        this.venues = page.content;
        this.totalVenues = page.totalElements;
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar venues pendientes', 'Cerrar', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  approveVenue(venue: VenueResponse): void {
    this.venueService.approveVenue(venue.id).subscribe({
      next: () => {
        this.snackBar.open('Venue aprobado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadPendingVenues();
      },
      error: () => {
        this.snackBar.open('Error al aprobar venue', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openRejectDialog(venue: VenueResponse): void {
    this.rejectingVenue = venue;
    this.rejectionReason = '';
  }

  cancelReject(): void {
    this.rejectingVenue = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.rejectingVenue || !this.rejectionReason.trim()) {
      this.snackBar.open('Por favor ingresa un motivo de rechazo', 'Cerrar', { duration: 3000 });
      return;
    }

    this.venueService.rejectVenue(this.rejectingVenue.id, this.rejectionReason).subscribe({
      next: () => {
        this.snackBar.open('Venue rechazado exitosamente', 'Cerrar', { duration: 3000 });
        this.rejectingVenue = null;
        this.rejectionReason = '';
        this.loadPendingVenues();
      },
      error: () => {
        this.snackBar.open('Error al rechazar venue', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPendingVenues();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
