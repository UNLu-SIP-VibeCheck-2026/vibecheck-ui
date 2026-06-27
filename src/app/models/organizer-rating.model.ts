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

export interface ProfileRatingItem {
  eventId: number;
  eventTitle: string;
  eventNftAddress: string;
  eventEndDate: string;
  organizerId: number;
  organizerUsername: string;
  rated: boolean;
  ratable: boolean;
  ratingValue?: number;
  ratingText?: string;
  rewardStatus?: string;
  rewardTxHash?: string;
  rewardPaidAt?: string;
  rewardWindowExpiresAt?: string;
}
