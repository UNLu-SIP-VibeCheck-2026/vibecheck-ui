import { Component, OnInit, inject } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { EventService } from "../../services/event.service";
import { TicketTypeService } from "../../services/ticket-type.service";
import { VenueService } from "../../services/venue.service";
import { UsersService } from "../../services/users.service";
import { AuthService } from "../../services/auth.service";
import { OrganizerRatingService } from "../../services/organizer-rating.service";
import { EventResponse } from "../../models/event.model";
import { TicketTypeResponse } from "../../models/ticket-type.model";
import { VenueResponse } from "../../models/venue.model";
import { UserPublicResponse } from "../../models/user-public-response.model";
import { parseDateRobust } from "../events/events.component";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { RatingDialogComponent, RatingDialogData } from "../shared/dialogs/rating-dialog/rating-dialog.component";

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
    MatSnackBarModule,
  ],
  templateUrl: "./event.component.html",
  styleUrl: "./event.component.scss",
})
export class EventComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private eventService = inject(EventService);
  private ticketTypeService = inject(TicketTypeService);
  private venueService = inject(VenueService);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private dialog = inject(MatDialog);
  private organizerRatingService = inject(OrganizerRatingService);

  event: EventResponse | null = null;
  venue: VenueResponse | null = null;
  owner: UserPublicResponse | null = null;
  eventImage: SafeUrl | null = null;
  cheapestTicketPrice: number | null = null;
  myRating: number | null = null;

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
        if (event.ownerId) {
          this.loadOwner(event.ownerId);
        }
        this.loadCheapestTicketPrice(event.id);
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
      error: (err) =>  this.snackBar.open(err?.error?.message || "Ocurrió un error", "Cerrar", { duration: 4000 }),
    });
  }

  private loadVenue(venueId: number): void {
    this.venueService.findVenueById(venueId).subscribe({
      next: (v) => (this.venue = v),
      error: (err) =>  this.snackBar.open(err?.error?.message || "Ocurrió un error", "Cerrar", { duration: 4000 }),
    });
  }

  private loadOwner(ownerId: number): void {
    console.log("Fetching owner for ID:", ownerId);
    this.usersService.getPublicUserById(ownerId).subscribe({
      next: (user: UserPublicResponse) => {
        console.log("Owner response received:", user);
        this.owner = user;
        this.loadMyRating();
      },
      error: (err: any) => {
        console.error("Error fetching owner:", err);
      },
    });
  }

  private loadMyRating(): void {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser || !this.event || !this.owner) return;

    this.organizerRatingService.getUserRatingForEvent(this.event.ownerId, this.event.id).subscribe({
      next: (rating) => {
        this.myRating = rating.ratingValue;
      },
      error: () => {
        this.myRating = null;
      },
    });
  }

  private loadCheapestTicketPrice(eventId: number): void {
    this.cheapestTicketPrice = null;
    const now = new Date();

    this.ticketTypeService.findTicketTypesByEvent(eventId).subscribe({
      next: (ticketTypes: TicketTypeResponse[]) => {
        const availableTickets = ticketTypes.filter((ticket) => {
          const starts = new Date(ticket.saleStartDate);
          const ends = new Date(ticket.saleEndDate);
          return (
            ticket.active &&
            starts <= now &&
            ends >= now
          );
        });

        if (availableTickets.length === 0) {
          return;
        }

        this.cheapestTicketPrice = Math.min(...availableTickets.map((ticket) => ticket.priceUsdc));
      },
      error: () => {
        this.cheapestTicketPrice = null;
      },
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
      const date = parseDateRobust(dateStr);
      return date.toLocaleString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateStr);
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

  get isEventOwner(): boolean {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser || !this.owner) return false;
    return currentUser.username === this.owner.username;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  buyTickets(): void {
    this.router.navigate(["/event", this.event!.id, "purchase-options"]);
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
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  // -------------------------------------------------------------------------
  // Rating functionality
  // -------------------------------------------------------------------------

  openRatingDialog(): void {
    if (!this.event || !this.owner) return;

    const dialogData: RatingDialogData = {
      organizerName: this.owner.username,
      eventId: this.event.id,
      organizerId: this.event.ownerId,
      currentRating: this.myRating || undefined,
    };

    const dialogRef = this.dialog.open(RatingDialogComponent, {
      data: dialogData,
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== undefined && result !== null) {
        this.submitRating(result);
      }
    });
  }

  submitRating(ratingValue: number): void {
    if (!this.event) return;

    const request = {
      organizerId: this.event.ownerId,
      eventId: this.event.id,
      ratingValue: ratingValue,
    };

    this.organizerRatingService.rateOrganizer(request).subscribe({
      next: (response) => {
        this.myRating = response.ratingValue;
        this.snackBar.open('Calificación enviada exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Error al enviar calificación', 'Cerrar', { duration: 4000 });
      },
    });
  }

  get canRateOrganizer(): boolean {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser || !this.event || !this.owner) return false;
    
    // User cannot rate themselves
    if (currentUser.username === this.owner.username) return false;
    
    // Event must be completed
    if (this.event.status?.toUpperCase() !== 'COMPLETED') return false;
    
    return true;
  }

  get organizerRating(): number | null {
    return this.event?.organizerRating || null;
  }

  get organizerRatingCount(): number | null {
    return this.event?.organizerRatingCount || null;
  }
}
