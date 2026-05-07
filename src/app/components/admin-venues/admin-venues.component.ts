import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { VenueService } from "../../services/venue.service";
import { VenueResponse } from "../../models/venue.model";
import {
  VenueDialogComponent,
  VenueDialogData,
} from "../shared/dialogs/venue-dialog/venue-dialog.component";

@Component({
  selector: "app-admin-venues",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: "./admin-venues.component.html",
  styleUrl: "./admin-venues.component.scss",
})
export class AdminVenuesComponent implements OnInit {
  private venueService = inject(VenueService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  venues: VenueResponse[] = [];
  filteredVenues: VenueResponse[] = [];
  pagedVenues: VenueResponse[] = [];

  searchQuery = "";
  isLoading = false;
  deletingId: number | null = null;

  totalVenues = 0;
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadVenues();
  }

  loadVenues(): void {
    this.isLoading = true;
    this.venueService.findAllVenues(0, 500).subscribe({
      next: (page) => {
        this.venues = page.content;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error cargando venues:", err);
        this.isLoading = false;
        this.showSnack("Error al cargar venues", "error");
      },
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredVenues = this.venues.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.coordinates.toLowerCase().includes(q)
    );
    this.totalVenues = this.filteredVenues.length;
    this.pageIndex = 0;
    this.updatePaged();
  }

  updatePaged(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedVenues = this.filteredVenues.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaged();
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(VenueDialogComponent, {
      width: "500px",
      data: {} as VenueDialogData,
    });
    ref.afterClosed().subscribe((venue: VenueResponse | undefined) => {
      if (venue) {
        this.venues.unshift(venue);
        this.applyFilter();
        this.showSnack(`Venue "${venue.title}" creado correctamente`);
      }
    });
  }

  openEditDialog(venue: VenueResponse): void {
    const ref = this.dialog.open(VenueDialogComponent, {
      width: "500px",
      data: { venue } as VenueDialogData,
    });
    ref.afterClosed().subscribe((updated: VenueResponse | undefined) => {
      if (updated) {
        const idx = this.venues.findIndex((v) => v.id === updated.id);
        if (idx !== -1) this.venues[idx] = updated;
        this.applyFilter();
        this.showSnack(`Venue "${updated.title}" actualizado`);
      }
    });
  }

  deleteVenue(venue: VenueResponse): void {
    if (
      !confirm(
        `¿Eliminar el venue "${venue.title}"? Esta acción no se puede deshacer.`
      )
    )
      return;

    this.deletingId = venue.id;
    this.venueService.deleteVenue(venue.id).subscribe({
      next: () => {
        this.venues = this.venues.filter((v) => v.id !== venue.id);
        this.applyFilter();
        this.deletingId = null;
        this.showSnack(`Venue "${venue.title}" eliminado`);
      },
      error: (err) => {
        this.deletingId = null;
        this.showSnack("Error al eliminar el venue", "error");
        console.error(err);
      },
    });
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }

  visibilityLabel(v: string): string {
    return v === "PUBLIC" ? "Público" : "Privado";
  }

  private showSnack(msg: string, type: "success" | "error" = "success"): void {
    this.snackBar.open(msg, "✕", {
      duration: 4000,
      panelClass: type === "error" ? ["snack-error"] : ["snack-success"],
      horizontalPosition: "end",
      verticalPosition: "top",
    });
  }
}
