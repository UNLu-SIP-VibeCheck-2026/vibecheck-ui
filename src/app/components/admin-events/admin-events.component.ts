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
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";
import { Router } from "@angular/router";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { EventDialogComponent } from "../shared/dialogs/event-dialog/event-dialog.component";
import { ResaleDialogComponent } from "../shared/dialogs/resale-dialog/resale-dialog.component";
import { PublishConfirmDialogComponent } from "../shared/dialogs/publish-confirm-dialog/publish-confirm-dialog.component";
import { EventService } from "../../services/event.service";
import { VenueService } from "../../services/venue.service";
import { TicketTypeService } from "../../services/ticket-type.service";
import { Web3Service } from "../../services/web3.service";
import { EventResponse } from "../../models/event.model";
import { VenueResponse } from "../../models/venue.model";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { UsersService } from "../../services/users.service";
import { LoadingStateComponent } from "../shared/loading-state/loading-state.component";
import { EmptyStateComponent } from "../shared/empty-state/empty-state.component";
import { trackLoading } from "../../utils/loading.operator";
import { environment } from "../../../environments/environment";
import { parseUnits } from "viem";
import { MatNativeDateModule } from "@angular/material/core";

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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
    LoadingStateComponent,
    EmptyStateComponent,
    MatNativeDateModule,
  ],
  templateUrl: "./admin-events.component.html",
  styleUrl: "./admin-events.component.scss",
})
export class AdminEventsComponent implements OnInit {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private usersService = inject(UsersService);
  private ticketTypeService = inject(TicketTypeService);
  private web3Service = inject(Web3Service);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ["image", "event"];
  dataSource = new MatTableDataSource<EventResponse>([]);

  /** All events from backend (for client-side search) */
  private allEvents: EventResponse[] = [];

  /** Venue lookup map id → VenueResponse */
  venueMap = new Map<number, VenueResponse>();

  // Image lookup map id → SafeUrl
  imageMap = new Map<number, SafeUrl>();

  // Owner lookup map id → username
  ownerMap = new Map<number, string>();

  // Ticket types count map: eventId → number
  ticketTypesCountMap = new Map<number, number>();

  searchQuery = "";
  isLoading = false;
  deletingId: number | null = null;
  publishingId: number | null = null;
  cancellingId: number | null = null;
  requestingCancelEventId: number | null = null;
  cancellationReason = "";

  /** Tracks which event image is being uploaded */
  uploadingImageId: number | null = null;
  /** Holds the event whose image is being replaced (set before opening the file picker) */
  private _pendingImageEvent: EventResponse | null = null;

  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;

  /** Server-side paging state */
  serverPage = 0;
  serverSize = 500;

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
      error: (err) =>  this.snackBar.open(err?.error?.message || "Error cargando venues:", "Cerrar", { duration: 4000 }),
    });
  }

  loadEvents(): void {
    this.eventService.findMyEvents(this.serverPage, this.serverSize)
      .pipe(trackLoading(loading => this.isLoading = loading))
      .subscribe({
        next: (page) => {
          this.allEvents = page.content;
          this.loadEventImages(page.content);
          this.loadOwners(page.content);
          this.loadTicketTypesCount(page.content);
          this.applyFilter();
        },
        error: (err) => {
          console.error("Error cargando eventos:", err);
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
          error: (err) =>  this.snackBar.open(err?.error?.message || "Ocurrió un error", "Cerrar", { duration: 4000 }),
        });
      }
    });
  }

  loadOwners(events: EventResponse[]): void {
    const ownerIds = new Set(events.map((e) => e.ownerId));
    ownerIds.forEach((id) => {
      if (id && !this.ownerMap.has(id)) {
        this.usersService.getPublicUserById(id).subscribe({
          next: (user) => this.ownerMap.set(id, user.username),
          error: () => this.ownerMap.set(id, "Usuario"),
        });
      }
    });
  }

  loadTicketTypesCount(events: EventResponse[]): void {
    events.forEach((event) => {
      this.ticketTypeService.findTicketTypesByEvent(event.id).subscribe({
        next: (ticketTypes) => {
          this.ticketTypesCountMap.set(event.id, ticketTypes.length);
        },
        error: (err) => {
          console.error(`Error cargando ticket types para evento ${event.id}:`, err);
          this.ticketTypesCountMap.set(event.id, 0);
        }
      });
    });
  }

  hasTicketTypes(eventId: number): boolean {
    return (this.ticketTypesCountMap.get(eventId) ?? 0) > 0;
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

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
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
      case "DRAFT":
      case "BORRADOR":
        return "draft-chip";
      case "PENDING_APPROVAL":
      case "PENDIENTE":
      case "PENDIENTE_APROBACION":
        return "pending-chip";
      case "APPROVED":
      case "APROBADO":
        return "approved-chip";
      case "REJECTED":
      case "RECHAZADO":
        return "rejected-chip";
      case "DEPLOYED":
      case "DEPLOYADO":
        return "deployed-chip";
      case "PUBLIC":
      case "PÚBLICO":
      case "SCHEDULED":
      case "PROGRAMADO":
      case "IN_PROGRESS":
      case "EN_CURSO":
        return "inprogress-chip";
      case "FINISHED":
      case "FINALIZADO":
      case "COMPLETED":
        return "finished-chip";
      case "CANCELLED":
      case "CANCELADO":
        return "cancelled-chip";
      case "PENDING_CANCELLATION":
      case "PENDIENTE_CANCELACION":
        return "pending-cancellation-chip";
      case "CANCELLATION_APPROVED":
      case "CANCELACION_APROBADA":
        return "cancellation-approved-chip";
      default:
        return "";
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: "BORRADOR",
      PENDING_APPROVAL: "PENDIENTE DE APROBACIÓN",
      APPROVED: "APROBADO",
      REJECTED: "RECHAZADO",
      DEPLOYED: "DEPLOYADO",
      PUBLIC: "PÚBLICO",
      SCHEDULED: "PÚBLICO",
      IN_PROGRESS: "EN CURSO",
      FINISHED: "FINALIZADO",
      COMPLETED: "FINALIZADO",
      CANCELLED: "CANCELADO",
      PENDING_CANCELLATION: "PENDIENTE DE CANCELACIÓN",
      CANCELLATION_APPROVED: "CANCELACIÓN APROBADA",
      BORRADOR: "BORRADOR",
      PENDIENTE: "PENDIENTE DE APROBACIÓN",
      PENDIENTE_APROBACION: "PENDIENTE DE APROBACIÓN",
      APROBADO: "APROBADO",
      RECHAZADO: "RECHAZADO",
      DEPLOYADO: "DEPLOYADO",
      PÚBLICO: "PÚBLICO",
      PROGRAMADO: "PÚBLICO",
      EN_CURSO: "EN CURSO",
      FINALIZADO: "FINALIZADO",
      CANCELADO: "CANCELADO",
      PENDIENTE_CANCELACION: "PENDIENTE DE CANCELACIÓN",
      CANCELACION_APROBADA: "CANCELACIÓN APROBADA",
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

  viewEventMetrics(event: EventResponse): void {
    this.router.navigate(["/admin-events", event.id, "metrics"]);
  }

  viewFinance(event: EventResponse): void {
    this.router.navigate(["/advertise-event", event.id]);
  }

  manageValidators(event: EventResponse): void {
    this.router.navigate(["/admin-events", event.id, "validators"]);
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "400px",
      data: {
        title: "Eliminar evento",
        message: `¿Eliminar el evento "${event.title}"? Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        cancelText: "Cancelar",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.deletingId = event.id;
      this.eventService.deleteEvent(event.id).subscribe({
        next: () => {
          const idx = this.allEvents.findIndex((e) => e.id === event.id);
          if (idx !== -1) {
            this.allEvents[idx] = { ...this.allEvents[idx], active: false };
          }
          this.applyFilter();
          this.deletingId = null;
          this.showSnack(`Evento "${event.title}" dado de baja`);
        },
        error: (err) => {
          this.deletingId = null;
          const msg = err?.error?.message || "Error al eliminar el evento";
          this.showSnack(msg, "error");
          console.error(err);
        },
      });
    });
  }

  // -------------------------------------------------------------------------
  // Publish
  // -------------------------------------------------------------------------

  publishEvent(event: EventResponse): void {
    if (event.status === 'DRAFT' || event.status === 'REJECTED') {
      this.requestApproval(event);
      return;
    }

    if (event.status === 'APPROVED') {
      this.publishingId = event.id;
      this.ticketTypeService.findTicketTypesByEvent(event.id).subscribe({
        next: (ticketTypes) => {
          this.publishingId = null;
          if (ticketTypes.length === 0) {
            this.showSnack("Error: El evento debe tener al menos una categoría de entrada antes de publicarse.", "error");
            return;
          }

          const dialogRef = this.dialog.open(PublishConfirmDialogComponent, {
            width: "500px",
            data: {
              eventTitle: event.title,
              onChain: true,
              executeDeploy: () => this.deployAndPublishEvent(event, ticketTypes)
            },
            autoFocus: false
          });

          dialogRef.afterClosed().subscribe((confirmed) => {
            if (!confirmed) return;
            this.publishingId = event.id;
          });
        },
        error: (err) => {
          this.publishingId = null;
          this.showSnack("Error al consultar las categorías de entrada del evento.", "error");
          console.error(err);
        }
      });
      return;
    }

    if (event.status === 'DEPLOYED') {
      const dialogRef = this.dialog.open(PublishConfirmDialogComponent, {
        width: "500px",
        data: {
          eventTitle: event.title,
          onChain: false
        },
        autoFocus: false
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (!confirmed) return;

        this.publishingId = event.id;
        this.executePublishOnly(event);
      });
      return;
    }
  }

  private requestApproval(event: EventResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",
      data: {
        title: "Solicitar Aprobación",
        message: `¿Enviar el evento "${event.title}" a aprobación? Una vez enviado, no podrás modificar sus datos ni categorías de entradas hasta que sea revisado por un administrador.`,
        confirmText: "Enviar a Aprobar",
        cancelText: "Cancelar",
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.publishingId = event.id;
      this.executePublishOnly(event);
    });
  }

  private deployAndPublishEvent(event: EventResponse, ticketTypes: any[]): void {
    // Regla 1: connectWallet sin await — Safari invalida el gesto en el primer await.
    // Regla 3: chainId leído sincrónico dentro del .then() — sin await adicional antes de launchEventOnChain.
    this.web3Service.connectWallet().then(() => {
      const chainId = this.web3Service.chainId$.getValue();
      if (chainId !== 11155111) {
        this.showSnack("Por favor cambia la red a Sepolia.", "error");
        this.publishingId = null;
        return;
      }

      const symbol = event.title.slice(0, 4).toUpperCase().replace(/\s/g, 'E');
      const eventDateTimestamp = Math.floor(new Date(event.startDate).getTime() / 1000);
      
      const params = {
        name: event.title,
        symbol: symbol,
        eventDate: eventDateTimestamp,
        maxResalePriceBps: event.maxResalePriceBps || 12000,
        royaltyBps: event.royaltyBps || 500,
        venueSigner: this.web3Service.VENUE_SIGNER_ADDRESS,
        baseURI: `${environment.backendUrl}/api/events/public/${event.id}/metadata/`
      };

      const tiers = ticketTypes.map(tt => ({
        name: tt.name,
        priceUSDC: parseUnits(tt.priceUsdc.toString(), 6),
        supply: tt.maxQuantity,
        sold: 0
      }));

      this.web3Service.launchEventOnChain(params, tiers).then(({ eventNftAddress, deployTxHash }) => {
        this.eventService.registerDeploy(event.id, { eventNftAddress, deployTxHash }).subscribe({
          next: (registeredEvent) => {
            this.eventService.publishEvent(event.id).subscribe({
              next: (publishedEvent) => {
                const idx = this.allEvents.findIndex((e) => e.id === publishedEvent.id);
                if (idx !== -1) this.allEvents[idx] = publishedEvent;
                this.applyFilter();
                this.publishingId = null;
                this.showSnack(`Evento "${event.title}" deployado y publicado correctamente`);
              },
              error: (err) => {
                this.publishingId = null;
                const errorMsg = err?.error?.message || err?.message || 'Error al publicar el evento post-deploy';
                this.showSnack(errorMsg, "error");
                console.error(err);
              }
            });
          },
          error: (err) => {
            this.publishingId = null;
            const errorMsg = err?.error?.message || err?.message || 'Error al registrar el despliegue del evento';
            this.showSnack(errorMsg, "error");
            console.error(err);
          }
        });

      }).catch((err) => {
        this.publishingId = null;
        const errorMsg = err?.message || 'Error en la transacción';
        this.showSnack(errorMsg, "error");
        console.error(err);
      });

    }).catch((err) => {
      this.publishingId = null;
      this.showSnack("Error al conectar la billetera.", "error");
      console.error(err);
    });
  }
  private executePublishOnly(event: EventResponse): void {
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
  // Cancel
  // -------------------------------------------------------------------------

  cancelEvent(event: EventResponse): void {
    this.requestingCancelEventId = event.id;
    this.cancellationReason = "";
  }

  cancelRequestingCancel(): void {
    this.requestingCancelEventId = null;
    this.cancellationReason = "";
  }

  confirmRequestingCancel(event: EventResponse): void {
    if (!this.cancellationReason.trim()) return;

    this.isLoading = true;
    this.eventService.requestCancellation(event.id, this.cancellationReason).subscribe({
      next: (updated) => {
        const idx = this.allEvents.findIndex((e) => e.id === updated.id);
        if (idx !== -1) this.allEvents[idx] = updated;
        this.applyFilter();
        this.requestingCancelEventId = null;
        this.cancellationReason = "";
        this.isLoading = false;
        this.showSnack(`Solicitud de cancelación para "${event.title}" enviada correctamente`);
      },
      error: (err) => {
        this.isLoading = false;
        this.showSnack(err?.error?.message || "Error al solicitar la cancelación", "error");
        console.error(err);
      }
    });
  }

  confirmCancellation(event: EventResponse): void {
    const dialogRef1 = this.dialog.open(ConfirmDialogComponent, {
      width: "400px",
      data: {
        title: "Confirmar Cancelación Irreversible",
        message: `¿Estás seguro de que deseas CONFIRMAR la cancelación del evento "${event.title}"? Esta acción no se puede deshacer y es completamente IRREVERSIBLE.`,
        confirmText: "Confirmar",
        cancelText: "Volver",
      },
    });

    dialogRef1.afterClosed().subscribe((confirmed1) => {
      if (!confirmed1) return;

      const dialogRef2 = this.dialog.open(ConfirmDialogComponent, {
        width: "400px",
        data: {
          title: "⚠️ ÚLTIMA ADVERTENCIA",
          message: `Al proceder se iniciarán los reembolsos automáticos y se cancelará el contrato inteligente. ¿Estás absolutamente seguro de continuar?`,
          confirmText: "Sí, cancelar definitivamente",
          cancelText: "No, volver atrás",
        },
      });

      dialogRef2.afterClosed().subscribe((confirmed2) => {
        if (!confirmed2) return;

        this.cancellingId = event.id;
        this.isLoading = true;
        this.eventService.confirmCancellation(event.id).subscribe({
          next: (res) => {
            this.loadEvents();
            this.cancellingId = null;
            this.isLoading = false;
            this.showSnack(`Cancelación del evento "${event.title}" ejecutada correctamente`);
          },
          error: (err) => {
            this.cancellingId = null;
            this.isLoading = false;
            this.showSnack(err?.error?.message || "Error al confirmar la cancelación", "error");
            console.error(err);
          }
        });
      });
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
  // Image upload (DRAFT only)
  // -------------------------------------------------------------------------

  /** Opens the hidden file input, storing the target event for later use. */
  triggerImageUpload(event: EventResponse, fileInput: HTMLInputElement): void {
    this._pendingImageEvent = event;
    fileInput.value = '';   // reset so the same file can be re-selected
    fileInput.click();
  }

  /** Called when the user picks a file from the OS dialog. */
  onImageFileSelected(domEvent: Event): void {
    const input = domEvent.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this._pendingImageEvent) return;

    const eventToUpdate = this._pendingImageEvent;
    this._pendingImageEvent = null;

    // Validations
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.showSnack('Solo se permiten imágenes JPEG, PNG o WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showSnack('La imagen no puede superar los 5 MB.', 'error');
      return;
    }

    this.uploadingImageId = eventToUpdate.id;

    this.eventService.uploadEventImage(eventToUpdate.id, file).subscribe({
      next: () => {
        // Refresh image from backend
        this.eventService.getEventImage(eventToUpdate.id).subscribe({
          next: (blob) => {
            const safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.imageMap.set(eventToUpdate.id, safeUrl);
            this.uploadingImageId = null;
            this.showSnack('Imagen actualizada correctamente');
          },
          error: () => {
            this.uploadingImageId = null;
            this.showSnack('Imagen subida, pero no se pudo refrescar la vista.', 'error');
          }
        });
      },
      error: (err) => {
        this.uploadingImageId = null;
        const msg = err?.error?.message || 'Error al subir la imagen';
        this.showSnack(msg, 'error');
        console.error(err);
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
