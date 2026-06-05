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
  ],
  templateUrl: "./purchase-options.component.html",
  styleUrl: "./purchase-options.component.scss",
})
export class PurchaseOptionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private eventService = inject(EventService);

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

    this.loadEvent(this.eventId);
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
