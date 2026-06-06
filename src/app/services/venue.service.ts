import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  VenueCreateRequest,
  VenueUpdateRequest,
  VenueResponse,
} from "../models/venue.model";
import { Page } from "../models/page.model";

@Injectable({ providedIn: "root" })
export class VenueService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/venues`;

  createVenue(request: VenueCreateRequest): Observable<VenueResponse> {
    return this.http.post<VenueResponse>(this.apiUrl, request);
  }

  updateVenue(
    id: number,
    request: VenueUpdateRequest
  ): Observable<VenueResponse> {
    return this.http.put<VenueResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteVenue(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  findAllVenues(page: number, size: number): Observable<Page<VenueResponse>> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("size", size.toString());
    return this.http.get<Page<VenueResponse>>(this.apiUrl, { params });
  }

  findMyVenues(page: number, size: number): Observable<Page<VenueResponse>> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("size", size.toString());
    return this.http.get<Page<VenueResponse>>(`${this.apiUrl}/me`, { params });
  }

  findVenueById(id: number): Observable<VenueResponse> {
    return this.http.get<VenueResponse>(`${this.apiUrl}/${id}`);
  }

  findPendingVenues(page: number, size: number): Observable<Page<VenueResponse>> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("size", size.toString());
    return this.http.get<Page<VenueResponse>>(`${this.apiUrl}/pending`, { params });
  }

  approveVenue(id: number): Observable<VenueResponse> {
    return this.http.post<VenueResponse>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectVenue(id: number, rejectionReason: string): Observable<VenueResponse> {
    return this.http.post<VenueResponse>(`${this.apiUrl}/${id}/reject`, { rejectionReason });
  }
}
