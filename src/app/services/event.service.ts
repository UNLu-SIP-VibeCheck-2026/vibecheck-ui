import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  EventCreateRequest,
  EventUpdateRequest,
  EventResponse,
  EventDeployRegisterRequest,
} from "../models/event.model";
import { Page } from "../models/page.model";

@Injectable({
  providedIn: "root",
})
export class EventService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/events`;

  createEventWithImage(
    request: EventCreateRequest,
    image?: File,
  ): Observable<EventResponse> {
    const formData = new FormData();
    const eventBlob = new Blob([JSON.stringify(request)], {
      type: "application/json",
    });
    formData.append("event", eventBlob);
    if (image) {
      formData.append("image", image);
    }
    // Angular detecta FormData y establece automáticamente Content-Type como multipart/form-data con el boundary correcto
    return this.http.post<EventResponse>(this.apiUrl, formData);
  }

  createEvent(request: EventCreateRequest): Observable<EventResponse> {
    return this.http.post<EventResponse>(this.apiUrl, request);
  }

  updateEvent(
    id: number,
    request: EventUpdateRequest,
  ): Observable<EventResponse> {
    return this.http.put<EventResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  findAllEvents(page: number, size: number, categoryId?: number): Observable<Page<EventResponse>> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", size.toString());
    if (categoryId !== undefined && categoryId !== null) {
      params = params.set("categoryId", categoryId.toString());
    }
    return this.http.get<Page<EventResponse>>(`${this.apiUrl}/public/all`, {
      params,
    });
  }

  findMyEvents(page: number, size: number): Observable<Page<EventResponse>> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", size.toString());
    return this.http.get<Page<EventResponse>>(`${this.apiUrl}/me`, { params });
  }

  findByIdEvent(id: number): Observable<EventResponse> {
    return this.http.get<EventResponse>(`${this.apiUrl}/${id}`);
  }

  uploadEventImage(id: number, image: File): Observable<EventResponse> {
    const formData = new FormData();
    formData.append("image", image);
    return this.http.post<EventResponse>(
      `${this.apiUrl}/${id}/image`,
      formData,
    );
  }

  getEventImage(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/image`, {
      responseType: "blob",
    });
  }

  publishEvent(id: number): Observable<EventResponse> {
    return this.http.patch<EventResponse>(`${this.apiUrl}/${id}/publish`, {});
  }

  registerDeploy(
    id: number,
    request: EventDeployRegisterRequest,
  ): Observable<EventResponse> {
    return this.http.post<EventResponse>(
      `${this.apiUrl}/${id}/register-deploy`,
      request,
    );
  }

  getUpcomingPromotedEventsGroupedByTier(): Observable<Record<string, EventResponse[]>> {
    return this.http.get<Record<string, EventResponse[]>>(`${this.apiUrl}/promoted/grouped-by-tier`);
  }
}
