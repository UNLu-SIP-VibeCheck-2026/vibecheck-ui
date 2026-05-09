import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  TicketTypeCreateRequest,
  TicketTypeUpdateRequest,
  TicketTypeResponse,
} from "../models/ticket-type.model";

@Injectable({ providedIn: "root" })
export class TicketTypeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/ticket-types`;

  createTicketType(request: TicketTypeCreateRequest): Observable<TicketTypeResponse> {
    return this.http.post<TicketTypeResponse>(this.apiUrl, request);
  }

  updateTicketType(
    id: number,
    request: TicketTypeUpdateRequest
  ): Observable<TicketTypeResponse> {
    return this.http.put<TicketTypeResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteTicketType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  findTicketTypeById(id: number): Observable<TicketTypeResponse> {
    return this.http.get<TicketTypeResponse>(`${this.apiUrl}/${id}`);
  }

  findTicketTypesByEvent(eventId: number): Observable<TicketTypeResponse[]> {
    return this.http.get<TicketTypeResponse[]>(`${this.apiUrl}/by-event/${eventId}`);
  }
}
