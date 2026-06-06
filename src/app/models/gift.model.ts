export interface GiftValidateRequest {
  recipientWallet: string;
}

export interface GiftValidateResponse {
  recipientWallet: string;
  username: string;
}

export interface GiftConfirmRequest {
  txHash: string;
  tokenId: number;
  eventNftAddress: string;
  recipientWallet: string;
}
