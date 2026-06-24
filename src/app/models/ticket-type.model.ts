export interface TicketTypeCreateRequest {
  name: string;
  description: string;
  priceUsdc: number;
  maxQuantity: number;
  saleStartDate: string; // ISO date string
  saleEndDate: string; // ISO date string
  active: boolean;
  hasSeats: boolean;
  firstRow?: number | null;
  lastRow?: number | null;
  firstSeat?: number | null;
  lastSeat?: number | null;
  eventId: number;
}

export interface TicketTypeUpdateRequest {
  name: string;
  description: string;
  priceUsdc: number;
  maxQuantity: number;
  saleStartDate: string; // ISO date string
  saleEndDate: string; // ISO date string
  active: boolean;
  hasSeats: boolean;
  firstRow?: number | null;
  lastRow?: number | null;
  firstSeat?: number | null;
  lastSeat?: number | null;
}

export interface TicketTypeResponse {
  id: number;
  name: string;
  description: string;
  priceUsdc: number;
  maxQuantity: number;
  quantitySold?: number;
  saleStartDate: string; // ISO date string
  saleEndDate: string; // ISO date string
  active: boolean;
  hasSeats: boolean;
  firstRow?: number | null;
  lastRow?: number | null;
  firstSeat?: number | null;
  lastSeat?: number | null;
  tierIndex: number;
  eventId: number;
}

