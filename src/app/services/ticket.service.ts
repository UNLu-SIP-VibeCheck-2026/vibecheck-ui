import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { TicketResponse, TicketBuyRequest } from "../models/ticket.model";
import { Page } from "../models/page.model"; // Re-using standard Page wrapper

@Injectable({ providedIn: "root" })
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/tickets`;

  buyTickets(request: TicketBuyRequest): Observable<TicketResponse[]> {
    return this.http.post<TicketResponse[]>(`${this.apiUrl}/buy`, request);
  }

  getMyTickets(page: number, size: number): Observable<Page<TicketResponse>> {
    let params = new HttpParams().set("page", page).set("size", size);
    return this.http.get<Page<TicketResponse>>(`${this.apiUrl}/me`, { params });
  }

  getTicketById(id: number): Observable<TicketResponse> {
    return this.http.get<TicketResponse>(`${this.apiUrl}/${id}`);
  }
}
