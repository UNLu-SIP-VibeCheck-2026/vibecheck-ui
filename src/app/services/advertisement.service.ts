import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  AdvertisementPlanResponse,
  PromoteEventRequest,
  PromoteEventResponse
} from "../models/advertisement.model";

@Injectable({
  providedIn: "root",
})
export class AdvertisementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/advertisements`;

  getActivePlans(): Observable<AdvertisementPlanResponse[]> {
    return this.http.get<AdvertisementPlanResponse[]>(`${this.apiUrl}/plans`);
  }

  promoteEvent(eventId: number, request: PromoteEventRequest): Observable<PromoteEventResponse> {
    return this.http.post<PromoteEventResponse>(`${this.apiUrl}/events/${eventId}/promote`, request);
  }
}
