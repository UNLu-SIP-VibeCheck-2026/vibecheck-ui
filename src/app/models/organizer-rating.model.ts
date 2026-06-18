export interface OrganizerRatingRequest {
  organizerId: number;
  eventId: number;
  ratingValue: number;
}

export interface OrganizerRatingResponse {
  id: number;
  organizerId: number;
  raterUserId: number;
  eventId: number;
  ratingValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizerRatingSummary {
  averageRating: number;
  totalRatingsCount: number;
}
