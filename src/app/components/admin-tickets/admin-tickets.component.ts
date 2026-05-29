import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { Router, ActivatedRoute } from "@angular/router";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatNativeDateModule } from "@angular/material/core";
import { TicketDialogComponent } from "../shared/dialogs/ticket-dialog/ticket-dialog.component";
import { ResaleDialogComponent } from "../shared/dialogs/resale-dialog/resale-dialog.component";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { TicketTypeService } from "../../services/ticket-type.service";
import { EventService } from "../../services/event.service";
import { TicketTypeResponse } from "../../models/ticket-type.model";
import { EventResponse } from "../../models/event.model";
import { LoadingStateComponent } from "../shared/loading-state/loading-state.component";
import { EmptyStateComponent } from "../shared/empty-state/empty-state.component";
import { trackLoading } from "../../utils/loading.operator";

@Component({
  selector: "app-admin-tickets",
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatPaginatorModule,
    MatDialogModule,
    FormsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatNativeDateModule,
    LoadingStateComponent,
    EmptyStateComponent
  ],
  templateUrl: "./admin-tickets.component.html",
  styleUrl: "./admin-tickets.component.scss",
})
export class AdminTicketsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private ticketTypeService = inject(TicketTypeService);
  private eventService = inject(EventService);
  private snackBar = inject(MatSnackBar);

  eventId: number = 0;
  eventStartDate: string | null = null;
  dataSource = new MatTableDataSource<TicketTypeResponse>([]);
  displayedColumns: string[] = [
    "id",
    "name",
    "priceUsdc",
    "maxPrice",
    "royalties",
    "maxQuantity",
    "maxPerUser",
    "saleStartDate",
    "saleEndDate",
    "active",
    "actions"
  ];

  isLoading = false;
  deletingId: number | null = null;

  ngOnInit(): void {
    const eventIdParam = this.route.snapshot.paramMap.get('id');
    this.eventId = eventIdParam ? +eventIdParam : 0;
    if (this.eventId) {
      this.loadTicketTypes();
      this.loadEventStartDate();
    }
  }

  private loadEventStartDate(): void {
    this.eventService.findByIdEvent(this.eventId).subscribe({
      next: (event: EventResponse) => {
        this.eventStartDate = event.startDate;
      },
      error: (err) => {
        console.error('Error loading event start date:', err);
      },
    });
  }

  loadTicketTypes(): void {
    this.ticketTypeService.findTicketTypesByEvent(this.eventId)
      .pipe(trackLoading(loading => this.isLoading = loading))
      .subscribe({
        next: (ticketTypes) => {
          this.dataSource.data = ticketTypes;
        },
        error: (err) => {
          console.error("Error cargando categorías:", err);
          this.showSnack("Error al cargar categorías", "error");
        },
      });
  }

  goBack() {
    this.router.navigate(['/admin-events']);
  }

  addTicket() {
    const dialogRef = this.dialog.open(TicketDialogComponent, {
      width: "900px",
      maxWidth: "95vw",
      data: {
        eventId: this.eventId,
        eventStartDate: this.eventStartDate,
      },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dataSource.data = [...this.dataSource.data, result];
        this.showSnack(`Categoría "${result.name}" creada correctamente`);
      }
    });
  }

  editTicket(ticket: TicketTypeResponse) {
    const dialogRef = this.dialog.open(TicketDialogComponent, {
      width: "1000px",
      maxWidth: "95vw",
      data: { ticket },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.dataSource.data.findIndex(t => t.id === ticket.id);
        if (index !== -1) {
          const updatedData = [...this.dataSource.data];
          updatedData[index] = result;
          this.dataSource.data = updatedData;
          this.showSnack(`Categoría "${result.name}" actualizada`);
        }
      }
    });
  }

  deleteTicket(ticket: TicketTypeResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Eliminar Categoría",
        message: `¿Estás seguro que deseas eliminar la categoría "${ticket.name}"?`,
        confirmText: "Eliminar",
        cancelText: "Cancelar"
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deletingId = ticket.id;
        this.ticketTypeService.deleteTicketType(ticket.id).subscribe({
          next: () => {
            this.dataSource.data = this.dataSource.data.filter(t => t.id !== ticket.id);
            this.deletingId = null;
            this.showSnack(`Categoría "${ticket.name}" eliminada`);
          },
          error: (err) => {
            this.deletingId = null;
            this.showSnack("Error al eliminar la categoría", "error");
            console.error(err);
          },
        });
      }
    });
  }

  openResaleConfig(ticket: TicketTypeResponse) {
    const dialogRef = this.dialog.open(ResaleDialogComponent, {
      width: "440px",
      data: {
        event: {
          title: ticket.name,
          maxResalePrice: ticket.maxPrice
        }
      },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.dataSource.data.findIndex(t => t.id === ticket.id);
        if (index !== -1) {
          const updatedData = [...this.dataSource.data];
          updatedData[index].maxPrice = result.maxResalePrice;
          this.dataSource.data = updatedData;
          this.showSnack(`Precio de reventa actualizado para "${ticket.name}"`);
        }
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
