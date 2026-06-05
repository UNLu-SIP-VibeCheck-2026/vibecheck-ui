import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";

import { ListingResponse } from "../../models/listing.model";
import { EventResponse } from "../../models/event.model";
import { TicketTypeResponse } from "../../models/ticket-type.model";
import { MarketplaceService } from "../../services/marketplace.service";
import { EventService } from "../../services/event.service";
import { VenueService } from "../../services/venue.service";
import { TicketTypeService } from "../../services/ticket-type.service";
import { ContractsService } from "../../services/contracts.service";
import { Web3Service } from "../../services/web3.service";
import { BuyListingComponent } from "../buy-listing/buy-listing.component";

@Component({
  selector: "app-marketplace-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    BuyListingComponent
  ],
  templateUrl: "./marketplace-detail.component.html",
  styleUrl: "./marketplace-detail.component.scss"
})
export class MarketplaceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private marketplaceService = inject(MarketplaceService);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private ticketTypeService = inject(TicketTypeService);
  private contractsService = inject(ContractsService);
  private web3Service = inject(Web3Service);

  // States
  listing = signal<ListingResponse | null>(null);
  event = signal<EventResponse | null>(null);
  venueName = signal<string>("Cargando...");
  venueAddress = signal<string>("Cargando...");
  tierName = signal<string>("Cargando...");
  eventImageUrl = signal<SafeUrl | null>(null);
  walletAddress = signal<string | null>(null);

  isLoading = signal<boolean>(true);
  errorMessage = signal<string>("");

  ngOnInit(): void {
    this.web3Service.connectedAddress$.subscribe((addr) => {
      this.walletAddress.set(addr);
    });

    const listingId = this.route.snapshot.paramMap.get("listingId");
    if (listingId) {
      this.loadListingDetails(Number(listingId));
    } else {
      this.errorMessage.set("ID de publicación no proporcionado.");
      this.isLoading.set(false);
    }
  }

  loadListingDetails(listingId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set("");

    this.marketplaceService.getListingById(listingId).subscribe({
      next: (l) => {
        this.listing.set(l);
        this.loadEnrichmentData(l);
      },
      error: (err) => {
        console.error("Error fetching listing details", err);
        this.errorMessage.set("No se pudieron cargar los detalles de la publicación.");
        this.isLoading.set(false);
      }
    });
  }

  loadEnrichmentData(l: ListingResponse): void {
    // 1. Fetch Event by EventNFTAddress (Search through event list or fetch by address)
    this.eventService.findAllEvents(0, 100).subscribe({
      next: (eventsPage) => {
        const events = eventsPage.content || [];
        const matchedEvent = events.find(
          (e) => e.eventNftAddress?.toLowerCase() === l.eventNftAddress.toLowerCase()
        );

        if (matchedEvent) {
          this.event.set(matchedEvent);

          // 2. Fetch venue info
          if (matchedEvent.venueId) {
            this.venueService.findVenueById(matchedEvent.venueId).subscribe({
              next: (v) => {
                this.venueName.set(v.title);
                this.venueAddress.set(v.coordinates || "Dirección no registrada");
              },
              error: () => {
                this.venueName.set("Dirección no disponible");
                this.venueAddress.set("No disponible");
              }
            });
          } else {
            this.venueName.set("Sin sede asignada");
            this.venueAddress.set("No disponible");
          }

          // 3. Get event image
          this.eventService.getEventImage(matchedEvent.id).subscribe({
            next: (blob) => {
              this.eventImageUrl.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)));
            },
            error: () => console.log("No image found for event id", matchedEvent.id)
          });

          // 4. Load ticket types to resolve on-chain tier
          this.resolveOnChainTier(matchedEvent, l);
        } else {
          // Event not found in DB
          this.isLoading.set(false);
          this.venueName.set("Desconocida");
          this.venueAddress.set("No disponible");
          this.tierName.set("Entrada General");
        }
      },
      error: (err) => {
        console.error("Error searching event list", err);
        this.isLoading.set(false);
      }
    });
  }

  async resolveOnChainTier(evt: EventResponse, l: ListingResponse) {
    try {
      const ticketTypes = await this.ticketTypeService.findTicketTypesByEvent(evt.id).toPromise() || [];
      const eventNFT = this.contractsService.getEventNFT(l.eventNftAddress);
      
      let tierIdxVal: any = null;
      try {
        tierIdxVal = await eventNFT["tokenTier"](l.tokenId);
      } catch {
        try {
          tierIdxVal = await eventNFT["tierOf"](l.tokenId);
        } catch (err) {
          console.warn("Could not retrieve token tier from contract", err);
        }
      }

      if (tierIdxVal !== null && tierIdxVal !== undefined) {
        const tierIdx = Number(tierIdxVal);
        const matchedType = ticketTypes.find((t) => t.tierIndex === tierIdx);
        if (matchedType) {
          this.tierName.set(matchedType.name);
        } else {
          this.tierName.set(`Tier #${tierIdx}`);
        }
      } else {
        this.tierName.set("Entrada");
      }
    } catch (err) {
      console.error("Error resolving tier on-chain", err);
      this.tierName.set("Entrada");
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try {
      const formatted = new Date(dateStr).toLocaleString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return dateStr;
    }
  }

  truncateAddress(address: string | null): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  navigateToMyListings(): void {
    this.router.navigate(["/my-listings"]);
  }

  goBack(): void {
    this.router.navigate(["/marketplace"]);
  }

  onPurchased(event: any): void {
    this.router.navigate(["/my-tickets"]);
  }
}
