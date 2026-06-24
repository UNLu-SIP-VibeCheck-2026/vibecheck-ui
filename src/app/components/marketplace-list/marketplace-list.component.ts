import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router, ActivatedRoute } from "@angular/router";
import { FormsModule, ReactiveFormsModule, FormControl } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators";
import { of } from "rxjs";

import { ListingResponse } from "../../models/listing.model";
import { EventResponse } from "../../models/event.model";
import { TicketTypeResponse } from "../../models/ticket-type.model";
import { MarketplaceService } from "../../services/marketplace.service";
import { EventService } from "../../services/event.service";
import { TicketTypeService } from "../../services/ticket-type.service";
import { ContractsService } from "../../services/contracts.service";
import { Web3Service } from "../../services/web3.service";
import { AuthService } from "../../services/auth.service";


@Component({
  selector: "app-marketplace-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
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
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // Pagination and lists state
  listings = signal<ListingResponse[]>([]);
  events = signal<EventResponse[]>([]);
  eventsMap = signal<Record<string, EventResponse>>({});
  ticketTypesMap = signal<Record<string, TicketTypeResponse[]>>({});
  tokenTiersCache = signal<Record<string, string>>({}); // cache key: "eventNftAddress_tokenId" -> tierName

  // Autocomplete search control
  eventSearchCtrl = new FormControl<any>("");
  filteredEvents = signal<EventResponse[]>([]);
  isLoadingEvents = signal<boolean>(false);

  // Filters
  selectedEventNftAddress = "";
  currentPage = 0;
  pageSize = 12;
  totalPages = 0;
  totalElements = 0;

  // Max price and tier filters
  maxPrice = signal<number | null>(null);
  selectedTier = signal<string>("");

  hasActiveFilters = computed(() => {
    return !!this.selectedEventNftAddress || this.maxPrice() !== null || !!this.selectedTier();
  });

  availableTiers = computed(() => {
    const eventNftAddr = this.selectedEventNftAddress;
    if (!eventNftAddr) return [];
    
    const event = this.getEventForListing(eventNftAddr);
    if (!event) return [];
    
    const ticketTypes = this.ticketTypesMap()[event.id.toString()];
    return ticketTypes ? ticketTypes.map((t) => t.name) : [];
  });

  filteredListings = computed(() => {
    let list = this.listings();
    const maxP = this.maxPrice();
    const tier = this.selectedTier();
    
    if (maxP !== null) {
      list = list.filter((l) => l.priceUsdc <= maxP);
    }
    if (tier) {
      list = list.filter((l) => {
        const tierName = this.getTierName(l);
        return tierName.toLowerCase().includes(tier.toLowerCase());
      });
    }
    return list;
  });

  // View state
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>("");
  isAuthRequired = signal<boolean>(false);

  walletAddress = signal<string | null>(null);

  ngOnInit(): void {
    // Autocomplete search subscription
    this.eventSearchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        if (typeof value === "string" && value.trim().length > 0) {
          this.isLoadingEvents.set(true);
          return this.eventService.findAllEvents(0, 20, undefined, value.trim()).pipe(
            switchMap((page) => {
              this.isLoadingEvents.set(false);
              return of(page.content || []);
            })
          );
        } else {
          this.isLoadingEvents.set(false);
          return of([]);
        }
      })
    ).subscribe({
      next: (evts) => {
        this.filteredEvents.set(evts);
      },
      error: (err) => {
        console.error("Error searching events:", err);
        this.isLoadingEvents.set(false);
      }
    });

    // Subscribe to auth state to react to login/logout
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.loadEventsAndListings();
      } else {
        this.isLoading.set(false);
        this.isAuthRequired.set(true);
      }
    });

    this.web3Service.connectedAddress$.subscribe((addr) => {
      const prevAddr = this.walletAddress();
      this.walletAddress.set(addr);
      // Reload when wallet address changes (user logs in or out) and they are authenticated
      if (prevAddr !== addr && this.authService.isAuthenticated()) {
        this.loadEventsAndListings();
      }
    });

    this.activatedRoute.queryParams.subscribe((params) => {
      if (params["eventNftAddress"]) {
        this.selectedEventNftAddress = params["eventNftAddress"];
      }
      if (this.authService.isAuthenticated()) {
        this.loadEventsAndListings();
      }
    });
  }

  loadEventsAndListings(): void {
    if (!this.authService.isAuthenticated()) {
      this.isLoading.set(false);
      this.errorMessage.set("");
      this.isAuthRequired.set(true);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set("");
    this.isAuthRequired.set(false);

    // If we have a preselected event NFT address (from query params), fetch it to initialize the search input
    if (this.selectedEventNftAddress) {
      this.eventService.findPublicEventByAddress(this.selectedEventNftAddress).subscribe({
        next: (event) => {
          const map = this.eventsMap();
          map[event.eventNftAddress.toLowerCase()] = event;
          this.eventsMap.set(map);
          this.eventSearchCtrl.setValue(event, { emitEvent: false });
          this.loadTicketTypesForEvent(event.id);
          this.loadListings();
        },
        error: (err) => {
          console.error("Error loading preselected event", err);
          this.selectedEventNftAddress = "";
          this.loadListings();
        }
      });
    } else {
      this.loadListings();
    }
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

        // Resolve missing events
        this.resolveEventsForListings(content);

        // Resolve tiers for new listings
        this.resolveTiersForListings(content);
        this.isLoading.set(false);
        this.isAuthRequired.set(false);
      },
      error: (err) => {
        console.error("Error loading listings", err);
        console.log("Error status:", err.status);
        console.log("Error code:", err.error?.code);
        console.log("Error full:", JSON.stringify(err));
        console.log("Error message:", err.message);
        // Detect auth error by status, code, or message
        const isAuthError = err.status === 401 ||
                           err.error?.code === "AUTHENTICATION_REQUIRED" ||
                           err.message?.includes("token") ||
                           err.message?.includes("refresco") ||
                           err.message?.includes("autentic");
        if (isAuthError) {
          this.isAuthRequired.set(true);
          this.errorMessage.set("");
        } else {
          this.errorMessage.set("Error al cargar las publicaciones de reventa.");
          this.isAuthRequired.set(false);
        }
        this.isLoading.set(false);
      }
    });
  }

  resolveEventsForListings(content: ListingResponse[]): void {
    content.forEach((listing) => {
      const addr = listing.eventNftAddress.toLowerCase();
      if (!this.eventsMap()[addr]) {
        this.eventService.findPublicEventByAddress(listing.eventNftAddress).subscribe({
          next: (event) => {
            const map = this.eventsMap();
            map[addr] = event;
            this.eventsMap.set({ ...map });
          },
          error: (err) => {
            console.warn(`Could not resolve event for address: ${listing.eventNftAddress}`, err);
          }
        });
      }
    });
  }

  onEventSelected(event: any): void {
    const selected = event.option.value;
    if (selected && selected.eventNftAddress) {
      this.selectedEventNftAddress = selected.eventNftAddress;
      const currentMap = this.eventsMap();
      currentMap[selected.eventNftAddress.toLowerCase()] = selected;
      this.eventsMap.set(currentMap);
      this.loadTicketTypesForEvent(selected.id);
    } else {
      this.selectedEventNftAddress = "";
      this.selectedTier.set("");
    }
    this.onFilterChange();
  }

  displayEventTitle(event: EventResponse | null): string {
    return event ? event.title : "";
  }

  loadTicketTypesForEvent(eventId: number): void {
    const eventIdStr = eventId.toString();
    if (this.ticketTypesMap()[eventIdStr]) return;
    
    this.ticketTypeService.findTicketTypesByEvent(eventId).subscribe({
      next: (types) => {
        const currentMap = this.ticketTypesMap();
        currentMap[eventIdStr] = types || [];
        this.ticketTypesMap.set({ ...currentMap });
      },
      error: (err) => console.error("Error loading ticket types for event:", err)
    });
  }

  clearEventFilter(): void {
    this.eventSearchCtrl.setValue("");
    this.selectedEventNftAddress = "";
    this.selectedTier.set("");
    this.filteredEvents.set([]);
    this.onFilterChange();
  }

  clearMaxPriceFilter(): void {
    this.maxPrice.set(null);
  }

  clearTierFilter(): void {
    this.selectedTier.set("");
  }

  clearAllFilters(): void {
    this.eventSearchCtrl.setValue("");
    this.selectedEventNftAddress = "";
    this.maxPrice.set(null);
    this.selectedTier.set("");
    this.filteredEvents.set([]);
    this.onFilterChange();
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

  goToLogin(): void {
    this.router.navigate(["/login"]);
  }
}
