export interface UserHistoryItem {
  eventTitle: string;
  eventStartDate: string;
  attendedAt: string;
  ticketTypeName: string;
  tokenId: number | string | null;
  ownerWalletAtRedeem: string | null;
  redeemTxHash: string | null;
}
