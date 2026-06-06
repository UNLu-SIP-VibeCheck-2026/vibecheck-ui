export interface OperationalSummaryDTO {
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  eventsByStatus: { [key: string]: number };
  totalTickets: number;
  ticketsByStatus: { [key: string]: number };
  totalTicketsSold: number;
  totalCapacity: number;
  occupancyRate: number;
}

export interface EventRankingItemDTO {
  eventId: number;
  eventName: string;
  status: string;
  totalTicketsSold: number;
  capacity: number;
  occupancyRate: number;
  advertisingRevenue: number;
}

export interface AdvertisingRevenueDTO {
  totalUsdc: number;
  totalVbk: number;
  countTransactions: number;
  periodStart: string;
  periodEnd: string;
}

export interface AdvertisingTimeSeriesDTO {
  period: string;
  revenueUsdc: number;
  revenueVbk: number;
  transactionCount: number;
}

export interface TokenStatsDTO {
  totalBurned: number;
  circulatingSupply: number;
  totalStaked: number;
  stakingByPeriod: { [key: string]: number };
}

export interface FinancialSummaryDTO {
  advertisingUsdc: number;
  advertisingVbk: number;
  ticketFeesUsdc: number;
  resaleFees: number;
  internalPaymentFees: number;
  artistTipFees: number;
  nftMarketplaceFees: number;
  periodStart: string;
  periodEnd: string;
}

export interface ScalpingWarningDTO {
  ticketId: number;
  buyerWallet: string;
  eventName: string;
  purchasedAt: string;
  listedForResaleAt: string;
  minutesBetween: number;
  priceOriginal: number;
  priceResale: number;
  severityLevel: string;
}
