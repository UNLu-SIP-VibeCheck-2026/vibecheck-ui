import { TicketTypeResponse } from './ticket-type.model';

export interface TicketResponse {
  id: number;
  ticketType: TicketTypeResponse;
  status: string;
  seatRow: string | null;
  seatNumber: string | null;
  token: string | null;
  tokenId: number | null;
  mintTxHash: string | null;
  ownerWallet: string | null;
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

export interface TicketConfirmRequest {
  ticketTypeId: number;
  txHash: string;
  tokenId: number;
  seatRow?: string | null;
  seatNumber?: string | null;
}

