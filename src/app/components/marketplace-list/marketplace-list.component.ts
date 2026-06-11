import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router, ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";

import { ListingResponse } from "../../models/listing.model";
import { EventResponse } from "../../models/event.model";
import { TicketTypeResponse } from "../../models/ticket-type.model";
import { MarketplaceService } from "../../services/marketplace.service";
import { EventService } from "../../services/event.service";
import { TicketTypeService } from "../../services/ticket-type.service";
import { ContractsService } from "../../services/contracts.service";
import { Web3Service } from "../../services/web3.service";


@Component({
  selector: "app-marketplace-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,

  ],
  templateUrl: "./marketplace-list.component.html",
  styleUrl: "./marketplace-list.component.scss"
})
export class MarketplaceListComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private marketplaceService = inject(MarketplaceService);
  private eventService = inject(EventService);
  private ticketTypeService = inject(TicketTypeService);
  private contractsService = inject(ContractsService);
  private web3Service = inject(Web3Service);
  private snackBar = inject(MatSnackBar);

  // Pagination and lists state
  listings = signal<ListingResponse[]>([]);
  events = signal<EventResponse[]>([]);
  eventsMap = signal<Record<string, EventResponse>>({});
  ticketTypesMap = signal<Record<string, TicketTypeResponse[]>>({});
  tokenTiersCache = signal<Record<string, string>>({}); // cache key: "eventNftAddress_tokenId" -> tierName

  // Filters
  selectedEventNftAddress = "";
  currentPage = 0;
  pageSize = 12;
  totalPages = 0;
  totalElements = 0;

  // View state
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>("");
  
  walletAddress = signal<string | null>(null);

  ngOnInit(): void {
    this.web3Service.connectedAddress$.subscribe((addr) => {
      this.walletAddress.set(addr);
    });

    this.activatedRoute.queryParams.subscribe((params) => {
      if (params["eventNftAddress"]) {
        this.selectedEventNftAddress = params["eventNftAddress"];
      }
      this.loadEventsAndListings();
    });
  }

  loadEventsAndListings(): void {
    this.isLoading.set(true);
    this.errorMessage.set("");

    // Fetch public events to populate filters and event mapping
    this.eventService.findAllEvents(0, 100).subscribe({
      next: (eventsPage) => {
        const eventsList = eventsPage.content || [];
        this.events.set(eventsList);

        const map: Record<string, EventResponse> = {};
        eventsList.forEach((e) => {
          if (e.eventNftAddress) {
            map[e.eventNftAddress.toLowerCase()] = e;
          }
        });
        this.eventsMap.set(map);

        // Load listings page
        this.loadListings();
      },
      error: (err) => {
        console.error("Error loading events", err);
        this.errorMessage.set("No se pudieron cargar los eventos del sistema.");
        this.isLoading.set(false);
      }
    });
  }

  loadListings(): void {
    this.isLoading.set(true);
    const filterAddress = this.selectedEventNftAddress ? this.selectedEventNftAddress : undefined;

    this.marketplaceService.getActiveListings(filterAddress, this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        const content = page.content || [];
        this.listings.set(content);
        this.totalPages = page.totalPages || 0;
        this.totalElements = page.totalElements || 0;

        // Resolve tiers for new listings
        this.resolveTiersForListings(content);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error("Error loading listings", err);
        this.errorMessage.set("Error al cargar las publicaciones de reventa.");
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadListings();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadListings();
    }
  }

  getEventForListing(eventNftAddress: string): EventResponse | null {
    if (!eventNftAddress) return null;
    return this.eventsMap()[eventNftAddress.toLowerCase()] || null;
  }

  getEventImageUrl(eventNftAddress: string): string {
    const evt = this.getEventForListing(eventNftAddress);
    if (evt && evt.hasImage) {
      return `${this.eventService["apiUrl"]}/${evt.id}/image`;
    }
    return "assets/event-placeholder.jpg";
  }

  truncateAddress(address: string | null): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // On-Chain Tier Resolution
  async resolveTiersForListings(listingsList: ListingResponse[]) {
    for (const listing of listingsList) {
      const cacheKey = `${listing.eventNftAddress.toLowerCase()}_${listing.tokenId}`;
      if (this.tokenTiersCache()[cacheKey]) {
        continue;
      }

      const event = this.getEventForListing(listing.eventNftAddress);
      if (!event) continue;

      try {
        // Load ticket types for the event if not loaded already
        const eventIdStr = event.id.toString();
        let ticketTypes = this.ticketTypesMap()[eventIdStr];
        if (!ticketTypes) {
          ticketTypes = await this.ticketTypeService.findTicketTypesByEvent(event.id).toPromise() || [];
          const currentMap = this.ticketTypesMap();
          currentMap[eventIdStr] = ticketTypes;
          this.ticketTypesMap.set(currentMap);
        }

        // Call contract to query tier
        let tierIdxVal: any = null;
        try {
          tierIdxVal = await this.contractsService.getNftTokenTier(listing.eventNftAddress, BigInt(listing.tokenId));
        } catch (err) {
          console.warn(`Could not resolve tier for token ${listing.tokenId} on-chain`, err);
        }

        if (tierIdxVal !== null && tierIdxVal !== undefined) {
          const tierIdx = Number(tierIdxVal);
          const matchedType = ticketTypes.find((t) => t.tierIndex === tierIdx);
          if (matchedType) {
            const currentCache = this.tokenTiersCache();
            currentCache[cacheKey] = matchedType.name;
            this.tokenTiersCache.set(currentCache);
          }
        }
      } catch (err) {
        console.error("Error in resolveTiersForListings:", err);
      }
    }
  }

  getTierName(listing: ListingResponse): string {
    const cacheKey = `${listing.eventNftAddress.toLowerCase()}_${listing.tokenId}`;
    return this.tokenTiersCache()[cacheKey] || "Entrada";
  }

  openBuy(listing: ListingResponse): void {
    this.router.navigate(["/marketplace", listing.onChainListingId]);
  }

  viewDetail(listing: ListingResponse): void {
    this.router.navigate(["/marketplace", listing.onChainListingId]);
  }
}
