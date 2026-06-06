import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Page } from "../models/page.model";
import {
  ListingResponse,
  ListingConfirmRequest,
  ListingCancelConfirmRequest,
  PurchaseConfirmRequest,
  PurchaseConfirmResponse,
} from "../models/listing.model";
import {
  GiftValidateRequest,
  GiftValidateResponse,
  GiftConfirmRequest
} from "../models/gift.model";
import { TicketResponse } from "../models/ticket.model";

@Injectable({
  providedIn: "root",
})
export class MarketplaceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/marketplace/listings`;

  confirmListing(req: ListingConfirmRequest): Observable<ListingResponse> {
    return this.http.post<ListingResponse>(`${this.apiUrl}/confirm`, req);
  }

  getActiveListings(
    eventNftAddress?: string,
    page = 0,
    size = 20
  ): Observable<Page<ListingResponse>> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", size.toString());

    if (eventNftAddress) {
      params = params.set("eventNftAddress", eventNftAddress);
    }

    return this.http.get<Page<ListingResponse>>(this.apiUrl, { params });
  }

  getListingById(onChainListingId: number): Observable<ListingResponse> {
    return this.http.get<ListingResponse>(`${this.apiUrl}/${onChainListingId}`);
  }

  confirmListingCancel(
    onChainListingId: number,
    req: ListingCancelConfirmRequest
  ): Observable<ListingResponse> {
    return this.http.post<ListingResponse>(
      `${this.apiUrl}/${onChainListingId}/cancel-confirm`,
      req
    );
  }

  confirmPurchase(req: PurchaseConfirmRequest): Observable<PurchaseConfirmResponse> {
    return this.http.post<PurchaseConfirmResponse>(
      `${environment.apiBaseUrl}/marketplace/purchases/confirm`,
      req
    );
  }

  validateGift(req: GiftValidateRequest): Observable<GiftValidateResponse> {
    return this.http.post<GiftValidateResponse>(
      `${environment.apiBaseUrl}/marketplace/gifts/validate`,
      req
    );
  }

  confirmGift(req: GiftConfirmRequest): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(
      `${environment.apiBaseUrl}/marketplace/gifts/confirm`,
      req
    );
  }
}
