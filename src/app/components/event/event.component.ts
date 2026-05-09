import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ActivatedRoute, Router } from "@angular/router";
import { EventService } from "../../services/event.service";
import { VenueService } from "../../services/venue.service";
import { EventResponse } from "../../models/event.model";
import { VenueResponse } from "../../models/venue.model";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";

@Component({
  selector: "app-event",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: "./event.component.html",
  styleUrl: "./event.component.scss",
})
export class EventComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private sanitizer = inject(DomSanitizer);

  event: EventResponse | null = null;
  venue: VenueResponse | null = null;
  eventImage: SafeUrl | null = null;

  isLoading = false;
  errorMessage = "";

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get("id");
    const id = rawId ? Number(rawId) : null;

    if (!id || isNaN(id)) {
      this.errorMessage = "ID de evento inválido.";
      return;
    }

    this.loadEvent(id);
  }

  private loadEvent(id: number): void {
    this.isLoading = true;
    this.errorMessage = "";

    this.eventService.findByIdEvent(id).subscribe({
      next: (event) => {
        this.event = event;
        this.isLoading = false;

        if (event.hasImage) {
          this.loadEventImage(id);
        }

        if (event.venueId) {
          this.loadVenue(event.venueId);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 404) {
          this.errorMessage = "El evento no fue encontrado.";
        } else {
          this.errorMessage = "Error al cargar el evento. Intentá de nuevo.";
        }
        console.error("Error loading event:", err);
      },
    });
  }

  private loadEventImage(id: number): void {
    this.eventService.getEventImage(id).subscribe({
      next: (blob) => {
        this.eventImage = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      },
      error: (err) => console.warn(`Error loading image for event ${id}:`, err),
    });
  }

  private loadVenue(venueId: number): void {
    this.venueService.findVenueById(venueId).subscribe({
      next: (v) => (this.venue = v),
      error: (err) => console.warn("Venue no encontrado:", err),
    });
  }

  // -------------------------------------------------------------------------
  // Computed helpers
  // -------------------------------------------------------------------------

  get statusLabel(): string {
    if (!this.event) return "";
    const map: Record<string, string> = {
      SCHEDULED: "PROGRAMADO",
      IN_PROGRESS: "EN CURSO",
      FINISHED: "FINALIZADO",
      CANCELLED: "CANCELADO",
    };
    return map[this.event.status?.toUpperCase()] ?? this.event.status ?? "—";
  }

  get statusClass(): string {
    const s = this.event?.status?.toUpperCase() ?? "";
    if (s === "SCHEDULED" || s === "PROGRAMADO") return "status-scheduled";
    if (s === "IN_PROGRESS" || s === "EN_CURSO") return "status-inprogress";
    if (s === "FINISHED" || s === "FINALIZADO") return "status-finished";
    if (s === "CANCELLED" || s === "CANCELADO") return "status-cancelled";
    return "";
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  get venueName(): string {
    return this.venue?.title ?? (this.event?.venueId ? `Venue #${this.event.venueId}` : "Sin venue");
  }

  get venueAddress(): string {
    return this.venue?.coordinates ?? "";
  }

  get venueCapacity(): number | null {
    return this.venue?.capacity ?? this.event?.capacity ?? null;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  buyTickets(): void {
    this.router.navigate(["/select-tickets", this.event!.id]);
  }

  shareEvent(): void {
    if (navigator.share) {
      navigator.share({
        title: this.event?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  goBack(): void {
    this.router.navigate(["/events"]);
  }
}
