export interface AdvertisementPlanResponse {
  id: number;
  name: string;
  displayName: string;
  pricePerDayVbk: number;
  pricePerDayUsdt: number;
  maxSlots: number | null;
  availableSlots: number | null;
}

export interface PromoteEventRequest {
  planId: number;
  durationDays: number;
}

export interface PromoteEventResponse {
  advertisementId: number;
  eventId: number;
  planName: string;
  totalPriceVbk: number;
  totalPriceUsdt: number;
  durationDays: number;
  expiresAt: string;
  newBalanceVbk: number;
}
