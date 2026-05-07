export interface VenueCreateRequest {
  title: string;
  coordinates: string;
  capacity: number;
  visibility: string; // e.g. "PUBLIC" | "PRIVATE"
}

export interface VenueUpdateRequest {
  title: string;
  coordinates: string;
  capacity: number;
  visibility: string;
}

export interface VenueResponse {
  id: number;
  title: string;
  coordinates: string;
  capacity: number;
  visibility: string;
  ownerId: number;
}
