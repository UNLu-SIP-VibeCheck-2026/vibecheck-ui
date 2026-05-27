import { TicketTypeResponse } from './ticket-type.model';

export interface TicketResponse {
  id: number;
  ticketType: TicketTypeResponse;
  status: string;
  seatRow: string | null;
  seatNumber: string | null;
  token: string | null;
  createdAt: string;
}

export interface SeatSelection {
  row: string;
  number: string;
}

export interface TicketBuyRequest {
  ticketTypeId: number;
  quantity?: number | null;
  seats?: SeatSelection[] | null;
}
