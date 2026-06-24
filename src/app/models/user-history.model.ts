export interface UserHistoryItem {
  id: number;
  eventId: number;
  imageUrl?: any;
  eventTitle: string;
  eventStartDate: string;
  attendedAt: string;
  ticketTypeName: string;
  tokenId: number | string | null;
  ownerWalletAtRedeem: string | null;
  redeemTxHash: string | null;
  publicVisibility: boolean;
  eventStatus?: string; // EventStatus enum serialized as string
}
