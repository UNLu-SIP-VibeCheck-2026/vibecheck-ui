import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Router } from "@angular/router";
import { EventDialogComponent } from "../shared/dialogs/event-dialog/event-dialog.component";
import { ResaleDialogComponent } from "../shared/dialogs/resale-dialog/resale-dialog.component";
import { EventService } from "../../services/event.service";
import { VenueService } from "../../services/venue.service";
import { EventResponse } from "../../models/event.model";
import { VenueResponse } from "../../models/venue.model";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";

@Component({
  selector: "app-admin-events",
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatSelectModule,
    FormsModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: "./admin-events.component.html",
  styleUrl: "./admin-events.component.scss",
})
export class AdminEventsComponent implements OnInit {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ["image", "event"];
  dataSource = new MatTableDataSource<EventResponse>([]);

  /** All events from backend (for client-side search) */
  private allEvents: EventResponse[] = [];

  /** Venue lookup map id → VenueResponse */
  venueMap = new Map<number, VenueResponse>();

  /** Image lookup map id → SafeUrl */
  imageMap = new Map<number, SafeUrl>();

  searchQuery = "";
  isLoading = false;
  deletingId: number | null = null;
  publishingId: number | null = null;

  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;

  /** Server-side paging state */
  private serverPage = 0;
  private serverSize = 100; // load enough for client-side search

  ngOnInit(): void {
    this.loadVenues();
    this.loadEvents();
  }

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  loadVenues(): void {
    this.venueService.findAllVenues(0, 500).subscribe({
      next: (page) => {
        this.venueMap.clear();
        page.content.forEach((v) => this.venueMap.set(v.id, v));
      },
      error: (err) => console.error("Error cargando venues:", err),
    });
  }

  loadEvents(): void {
    this.isLoading = true;
    this.eventService.findMyEvents(this.serverPage, this.serverSize).subscribe({
      next: (page) => {
        this.allEvents = page.content;
        this.loadEventImages(page.content);
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error cargando eventos:", err);
        this.isLoading = false;
        this.showSnack("Error al cargar los eventos", "error");
      },
    });
  }

  loadEventImages(events: EventResponse[]): void {
    events.forEach((event) => {
      if (event.hasImage) {
        this.eventService.getEventImage(event.id).subscribe({
          next: (blob) => {
            const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.imageMap.set(event.id, url);
          },
          error: (err) => console.warn(`Error loading image for event ${event.id}:`, err),
        });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Filtering & Pagination (client-side after full load)
  // -------------------------------------------------------------------------

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    const filtered = q
      ? this.allEvents.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.description ?? "").toLowerCase().includes(q) ||
            this.getVenueName(e.venueId).toLowerCase().includes(q) ||
            e.status.toLowerCase().includes(q)
        )
      : [...this.allEvents];

    this.totalElements = filtered.length;
    this.pageIndex = 0;

    const start = this.pageIndex * this.pageSize;
    this.dataSource.data = filtered.slice(start, start + this.pageSize);
    this._filtered = filtered;
  }

  private _filtered: EventResponse[] = [];

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    const start = this.pageIndex * this.pageSize;
    this.dataSource.data = this._filtered.slice(start, start + this.pageSize);
  }

  // -------------------------------------------------------------------------
  // Selection helpers
  // -------------------------------------------------------------------------

  isAllSelected(): boolean {
    return (
      this.dataSource.data.length > 0 &&
      this.dataSource.data.every((e: any) => e.selected)
    );
  }

  isAtLeastOneSelected(): boolean {
    return this.dataSource.data.some((e: any) => e.selected);
  }

  toggleAllSelection(checked: boolean): void {
    this.dataSource.data.forEach((e: any) => (e.selected = checked));
  }

  // -------------------------------------------------------------------------
  // Venue helper
  // -------------------------------------------------------------------------

  getVenueName(venueId: number | null | undefined): string {
    if (!venueId) return "Sin venue";
    const v = this.venueMap.get(venueId);
    return v ? v.title : `Venue #${venueId}`;
  }

  getEventImage(eventId: number): SafeUrl | null {
    return this.imageMap.get(eventId) || null;
  }

  // -------------------------------------------------------------------------
  // Status helpers
  // -------------------------------------------------------------------------

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case "SCHEDULED":
      case "PROGRAMADO":
        return "scheduled-chip";
      case "IN_PROGRESS":
      case "EN_CURSO":
        return "inprogress-chip";
      case "FINISHED":
      case "FINALIZADO":
        return "finished-chip";
      case "CANCELLED":
      case "CANCELADO":
        return "cancelled-chip";
      default:
        return "";
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: "PROGRAMADO",
      IN_PROGRESS: "EN CURSO",
      FINISHED: "FINALIZADO",
      CANCELLED: "CANCELADO",
      PROGRAMADO: "PROGRAMADO",
      EN_CURSO: "EN CURSO",
      FINALIZADO: "FINALIZADO",
      CANCELADO: "CANCELADO",
    };
    return map[status?.toUpperCase()] ?? status ?? "—";
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }

  createEvent(): void {
    this.router.navigate(["/create-event"]);
  }

  navigateToEvent(id: number): void {
    this.router.navigate(["/event", id]);
  }

  viewStats(event: EventResponse): void {
    this.router.navigate(["/admin-tickets", event.id]);
  }

  viewFinance(event: EventResponse): void {
    this.router.navigate(["/advertise-event", event.id]);
  }

  // -------------------------------------------------------------------------
  // Edit dialog
  // -------------------------------------------------------------------------

  editEvent(event: EventResponse): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: "660px",
      data: { event, venues: Array.from(this.venueMap.values()) },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((updated: EventResponse | undefined) => {
      if (updated) {
        const idx = this.allEvents.findIndex((e) => e.id === updated.id);
        if (idx !== -1) this.allEvents[idx] = updated;
        this.applyFilter();
        this.showSnack(`Evento "${updated.title}" actualizado`);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  deleteEvent(event: EventResponse): void {
    if (
      !confirm(
        `¿Eliminar el evento "${event.title}"? Esta acción no se puede deshacer.`
      )
    )
      return;

    this.deletingId = event.id;
    this.eventService.deleteEvent(event.id).subscribe({
      next: () => {
        this.allEvents = this.allEvents.filter((e) => e.id !== event.id);
        this.applyFilter();
        this.deletingId = null;
        this.showSnack(`Evento "${event.title}" eliminado`);
      },
      error: (err) => {
        this.deletingId = null;
        this.showSnack("Error al eliminar el evento", "error");
        console.error(err);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Publish
  // -------------------------------------------------------------------------

  publishEvent(event: EventResponse): void {
    if (
      !confirm(
        `¿Publicar el evento "${event.title}"? Esta acción hará visible el evento a los usuarios.`
      )
    )
      return;

    this.publishingId = event.id;
    this.eventService.publishEvent(event.id).subscribe({
      next: (updated) => {
        const idx = this.allEvents.findIndex((e) => e.id === updated.id);
        if (idx !== -1) this.allEvents[idx] = updated;
        this.applyFilter();
        this.publishingId = null;
        this.showSnack(`Evento "${event.title}" publicado correctamente`);
      },
      error: (err) => {
        this.publishingId = null;
        const errorMsg = err?.error?.message || err?.message || 'Error al publicar el evento';
        this.showSnack(errorMsg, "error");
        console.error(err);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Resale dialog (unchanged from original)
  // -------------------------------------------------------------------------

  openSettings(event: EventResponse): void {
    const dialogRef = this.dialog.open(ResaleDialogComponent, {
      width: "440px",
      data: { event },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.showSnack("Configuración de reventa actualizada");
      }
    });
  }

  // -------------------------------------------------------------------------
  // Snackbar
  // -------------------------------------------------------------------------

  private showSnack(msg: string, type: "success" | "error" = "success"): void {
    this.snackBar.open(msg, "✕", {
      duration: 4000,
      panelClass: type === "error" ? ["snack-error"] : ["snack-success"],
      horizontalPosition: "end",
      verticalPosition: "top",
    });
  }
}
