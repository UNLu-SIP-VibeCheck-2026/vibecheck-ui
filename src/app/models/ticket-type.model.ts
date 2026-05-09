export interface TicketTypeCreateRequest {
  name: string;
  description: string;
  priceUsdt: number;
  maxPrice: number;
  royalties: number;
  maxQuantity: number;
  maxPerUser: number;
  saleStartDate: string; // ISO date string
  saleEndDate: string; // ISO date string
  active: boolean;
  eventId: number;
}

export interface TicketTypeUpdateRequest {
  name: string;
  description: string;
  priceUsdt: number;
  maxPrice: number;
  royalties: number;
  maxQuantity: number;
  maxPerUser: number;
  saleStartDate: string; // ISO date string
  saleEndDate: string; // ISO date string
  active: boolean;
}

export interface TicketTypeResponse {
  id: number;
  name: string;
  description: string;
  priceUsdt: number;
  maxPrice: number;
  royalties: number;
  maxQuantity: number;
  maxPerUser: number;
  saleStartDate: string; // ISO date string
  saleEndDate: string; // ISO date string
  active: boolean;
  eventId: number;
}
