import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrganizerRatingRequest, OrganizerRatingResponse, OrganizerRatingSummary } from '../models/organizer-rating.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrganizerRatingService {
  private apiUrl = `${environment.apiBaseUrl}/ratings/organizers`;

  constructor(private http: HttpClient) {}

  rateOrganizer(request: OrganizerRatingRequest): Observable<OrganizerRatingResponse> {
    return this.http.post<OrganizerRatingResponse>(this.apiUrl, request);
  }

  getOrganizerRatingSummary(organizerId: number): Observable<OrganizerRatingSummary> {
    return this.http.get<OrganizerRatingSummary>(`${this.apiUrl}/${organizerId}/summary`);
  }

  getUserRatingForEvent(organizerId: number, eventId: number): Observable<OrganizerRatingResponse> {
    return this.http.get<OrganizerRatingResponse>(`${this.apiUrl}/${organizerId}/events/${eventId}/my-rating`);
  }

  updateRating(ratingId: number, ratingValue: number): Observable<OrganizerRatingResponse> {
    return this.http.put<OrganizerRatingResponse>(`${this.apiUrl}/${ratingId}`, null, {
      params: { ratingValue: ratingValue.toString() }
    });
  }
}
