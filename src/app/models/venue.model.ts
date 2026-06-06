export enum VenueVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE"
}

export enum VenueStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export interface VenueCreateRequest {
  title: string;
  coordinates: string;
  capacity: number;
  visibility: VenueVisibility;
}

export interface VenueUpdateRequest {
  title: string;
  coordinates: string;
  capacity: number;
  visibility: VenueVisibility;
}

export interface VenueResponse {
  id: number;
  title: string;
  coordinates: string;
  capacity: number;
  visibility: VenueVisibility;
  ownerId: number;
  status: VenueStatus;
  rejectionReason?: string;
}
