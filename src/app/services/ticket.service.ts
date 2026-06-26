import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { TicketResponse, TicketConfirmRequest, RefundRequestResponse } from "../models/ticket.model";
import { Page } from "../models/page.model"; // Re-using standard Page wrapper

export interface RedeemSignatureResponse {
  eventNftAddress: string;
  tokenId: number;
  signature: string;
  venueSignerAddress: string;
}

@Injectable({ providedIn: "root" })
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/tickets`;

  confirmTicket(request: TicketConfirmRequest): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(`${this.apiUrl}/confirm`, request);
  }

  getMyTickets(page: number, size: number): Observable<Page<TicketResponse>> {
    let params = new HttpParams().set("page", page).set("size", size);
    return this.http.get<Page<TicketResponse>>(`${this.apiUrl}/me/inventory`, { params });
  }

  getTicketById(id: number): Observable<TicketResponse> {
    return this.http.get<TicketResponse>(`${this.apiUrl}/${id}`);
  }

  getRedeemSignature(id: number): Observable<RedeemSignatureResponse> {
    return this.http.get<RedeemSignatureResponse>(`${this.apiUrl}/${id}/redeem-signature`);
  }

  redeemConfirm(id: number, txHash: string): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(`${this.apiUrl}/${id}/redeem-confirm`, { txHash });
  }

  redeemTicket(id: number, code: string): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(`${this.apiUrl}/${id}/redeem`, { code });
  }

  requestVoluntaryRefund(ticketId: number): Observable<RefundRequestResponse> {
    return this.http.post<RefundRequestResponse>(`${this.apiUrl}/${ticketId}/refund-request`, {});
  }

  confirmVoluntaryRefund(ticketId: number, txHash: string): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(`${this.apiUrl}/${ticketId}/refund-confirm`, { txHash });
  }
}
