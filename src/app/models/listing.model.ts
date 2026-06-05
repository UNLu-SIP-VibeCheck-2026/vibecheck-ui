export interface ListingResponse {
  id: number;
  onChainListingId: number;
  tokenId: number;
  eventNftAddress: string;
  sellerWallet: string;
  priceUsdc: number;
  status: "ACTIVE" | "SOLD" | "CANCELLED";
  listedAt: string;
  txHashList: string;
}

export interface ListingConfirmRequest {
  onChainListingId: number;
  tokenId: number;
  eventNftAddress: string;
  txHash: string;
}

export interface ListingCancelConfirmRequest {
  txHash: string;
}

export interface PurchaseConfirmRequest {
  onChainListingId: number;
  txHash: string;
}

export interface PurchaseConfirmResponse {
  onChainListingId: number;
  tokenId: number;
  eventNftAddress: string;
  buyerWallet: string;
  sellerWallet: string;
  amountPaid: number;
  paymentToken: 'USDC' | 'VBK';
  txHash: string;
}

