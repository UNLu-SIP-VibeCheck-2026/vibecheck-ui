export interface TicketTypeMetrics {
  ticketTypeId: number;
  name: string;
  priceUsdc: number;
  maxQuantity: number;
  quantitySold: number;
  quantityAvailable: number;
  totalRevenueUsdc: number;
}

export interface RecentTicketSale {
  ticketId: number;
  ticketTypeName: string;
  tokenId: number;
  ownerWalletMasked: string;
  amountPaid: number;
  paymentToken: string;
  purchaseDate: string;
  status: string;
}

export interface OrganizerEventMetrics {
  eventId: number;
  eventTitle: string;
  eventStatus: string;
  eventNftAddress: string | null;
  eventStartDate: string;
  eventEndDate: string;
  venueName: string;
  totalCapacity: number;
  totalTicketsSold: number;
  totalTicketsAvailable: number;
  totalRevenueUsdc: number;
  ticketTypes: TicketTypeMetrics[];
  recentSales: RecentTicketSale[];
}
