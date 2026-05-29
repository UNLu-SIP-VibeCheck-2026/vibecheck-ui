import { Page } from './page.model';

export interface EventCreateRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  active: boolean;
  ownerId: number;
  venueId?: number | null;
}

export interface EventUpdateRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  active: boolean;
  venueId?: number | null;
}

export interface EventResponse {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  active: boolean;
  status: string;
  ownerId: number;
  venueId: number;
  hasImage: boolean;
  advertisementPlanId?: number;
  eventNftAddress?: string;
  deployTxHash?: string;
  maxResalePriceBps?: number;
  royaltyBps?: number;
}

export interface EventDeployRegisterRequest {
  eventNftAddress: string;
  deployTxHash: string;
}

