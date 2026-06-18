import { Component, OnInit, inject } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { EventService } from "../../services/event.service";
import { EventResponse } from "../../models/event.model";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-purchase-options",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: "./purchase-options.component.html",
  styleUrl: "./purchase-options.component.scss",
})
export class PurchaseOptionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private eventService = inject(EventService);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  eventId: number | null = null;
  event: EventResponse | null = null;
  isLoading = false;
  errorMessage = "";

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get("id");
    this.eventId = rawId ? Number(rawId) : null;

    if (!this.eventId || isNaN(this.eventId)) {
      this.errorMessage = "ID de evento inválido.";
      return;
    }

    this.checkRoleAndLoad();
  }

  private checkRoleAndLoad(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUserValue();
      const currentRole = user?.role?.toLowerCase() || "";
      const isClient = currentRole === "cliente" || currentRole === "comprar" || currentRole === "user";

      if (!isClient) {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          width: "400px",
          disableClose: true,
          data: {
            title: "Cambiar rol a Cliente",
            message: "Para comprar entradas necesitas estar en tu rol de Cliente. ¿Querés cambiar tu rol ahora?",
            confirmText: "Sí, cambiar",
            cancelText: "Cancelar",
            success: true,
          },
        });

        dialogRef.afterClosed().subscribe((confirmed) => {
          if (confirmed) {
            this.isLoading = true;
            this.authService.switchUserRole("cliente").subscribe({
              next: () => {
                this.snackBar.open("Rol cambiado a Cliente con éxito", "Cerrar", { duration: 3000 });
                this.loadEvent(this.eventId!);
              },
              error: (err) => {
                this.isLoading = false;
                this.errorMessage = "No se pudo cambiar el rol. Intentá de nuevo o contactá a soporte.";
                console.error("Error changing role:", err);
              },
            });
          } else {
            this.goBack();
          }
        });
        return;
      }
    }

    this.loadEvent(this.eventId!);
  }

  private loadEvent(id: number): void {
    this.isLoading = true;
    this.eventService.findByIdEvent(id).subscribe({
      next: (event) => {
        this.event = event;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = "Error al cargar el evento.";
        console.error("Error loading event:", err);
      },
    });
  }

  goToOfficialTickets(): void {
    this.router.navigate(["/select-tickets", this.eventId]);
  }

  goToMarketplace(): void {
    if (this.event && this.event.eventNftAddress) {
      this.router.navigate(["/marketplace"], {
        queryParams: { eventNftAddress: this.event.eventNftAddress }
      });
    } else {
      this.router.navigate(["/marketplace"]);
    }
  }

  goBack(): void {
    this.location.back();
  }
}
