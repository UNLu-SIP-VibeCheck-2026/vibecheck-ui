import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  EventCreateRequest,
  EventUpdateRequest,
  EventResponse,
} from "../models/event.model";
import { Page } from "../models/page.model";

@Injectable({
  providedIn: "root",
})
export class EventService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/events`;

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

  findAllEvents(page: number, size: number): Observable<Page<EventResponse>> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", size.toString());
    return this.http.get<Page<EventResponse>>(this.apiUrl, { params });
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
}
