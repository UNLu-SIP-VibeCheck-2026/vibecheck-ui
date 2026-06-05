import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Page } from "../models/page.model";
import {
  ListingResponse,
  ListingConfirmRequest,
  ListingCancelConfirmRequest,
} from "../models/listing.model";

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
}
