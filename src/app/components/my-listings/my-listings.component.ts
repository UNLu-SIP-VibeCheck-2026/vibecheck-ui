import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { forkJoin } from "rxjs";

import { ListingResponse } from "../../models/listing.model";
import { EventResponse } from "../../models/event.model";
import { MarketplaceService } from "../../services/marketplace.service";
import { Web3Service } from "../../services/web3.service";
import { EventService } from "../../services/event.service";
import { CancelListingComponent } from "../cancel-listing/cancel-listing.component";

@Component({
  selector: "app-my-listings",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    CancelListingComponent,
  ],
  templateUrl: "./my-listings.component.html",
  styleUrl: "./my-listings.component.scss",
})
export class MyListingsComponent implements OnInit {
  private router = inject(Router);
  private marketplaceService = inject(MarketplaceService);
  private web3Service = inject(Web3Service);
  private eventService = inject(EventService);
  private snackBar = inject(MatSnackBar);

  userWallet = signal<string | null>(null);
  listings = signal<ListingResponse[]>([]);
  eventsMap = signal<Record<string, EventResponse>>({});
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>("");

  ngOnInit(): void {
    this.web3Service.connectedAddress$.subscribe({
      next: (address) => {
        this.userWallet.set(address);
        if (address) {
          this.loadData();
        } else {
          this.isLoading.set(false);
          this.listings.set([]);
        }
      },
      error: (err) => {
        console.error("Error reading connected wallet", err);
        this.isLoading.set(false);
      }
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set("");

    forkJoin({
      listingsPage: this.marketplaceService.getActiveListings(undefined, 0, 100),
      eventsPage: this.eventService.findAllEvents(0, 100),
    }).subscribe({
      next: ({ listingsPage, eventsPage }) => {
        // Build the events map using eventNftAddress
        const map: Record<string, EventResponse> = {};
        if (eventsPage && eventsPage.content) {
          eventsPage.content.forEach((evt) => {
            if (evt.eventNftAddress) {
              map[evt.eventNftAddress.toLowerCase()] = evt;
            }
          });
        }
        this.eventsMap.set(map);

        // Filter listings for active user wallet
        const wallet = this.userWallet();
        if (wallet && listingsPage && listingsPage.content) {
          const userListings = listingsPage.content.filter(
            (listing) => listing.sellerWallet.toLowerCase() === wallet.toLowerCase()
          );
          this.listings.set(userListings);
        } else {
          this.listings.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error("Error loading listings/events data", err);
        this.errorMessage.set("No se pudieron cargar tus publicaciones activas.");
        this.isLoading.set(false);
      },
    });
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

  onListingCancelled(): void {
    this.loadData();
  }

  async connectWallet(): Promise<void> {
    try {
      await this.web3Service.connectWallet();
    } catch (err: any) {
      this.snackBar.open("Error al conectar MetaMask: " + err.message, "Cerrar", {
        duration: 3000,
      });
    }
  }

  goToTickets(): void {
    this.router.navigate(["/my-tickets"]);
  }
}
