import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { readContract } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { config } from './wagmi.config';
import { Web3Service } from './web3.service';
import { ContractsService } from './contracts.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CollectibleMarketplaceService {
  private http = inject(HttpClient);
  private web3Service = inject(Web3Service);
  private contractsService = inject(ContractsService);

  private readonly API_BASE = `${environment.apiBaseUrl}/v1/collectibles`;

  connectWallet() {
    return this.web3Service.connectWallet();
  }

  // --- REST Queries to Backend DB ---

  getActiveListings(page = 0, size = 20): Observable<any> {
    return this.http.get(`${this.API_BASE}?page=${page}&size=${size}`);
  }

  getListingsByEvent(eventNft: string): Observable<any> {
    return this.http.get(`${this.API_BASE}/event/${eventNft}`);
  }

  getMyListings(wallet: string): Observable<any> {
    return this.http.get(`${this.API_BASE}/my/${wallet}`);
  }

  getListing(listingId: string): Observable<any> {
    return this.http.get(`${this.API_BASE}/${listingId}`);
  }

  getVbkQuote(listingId: string): Observable<any> {
    return this.http.get(`${this.API_BASE}/${listingId}/quote-vbk`);
  }

  checkTokenRedeemed(eventNft: string, tokenId: number): Observable<any> {
    return this.http.get(`${this.API_BASE}/token-status`, {
      params: { eventNft, tokenId: tokenId.toString() }
    });
  }

  // --- On-Chain Operations ---

  async approveNFT(eventNftAddress: string, tokenId: bigint): Promise<string> {
    return await this.web3Service.approveNft(eventNftAddress, this.web3Service.COLLECTIBLE_MARKETPLACE_ADDRESS, tokenId);
  }

  async listCollectible(eventNftAddress: string, tokenId: bigint, priceUSDC: string): Promise<string> {
    const priceRaw = parseUnits(priceUSDC, 6); // USDC has 6 decimals
    return await this.web3Service.listCollectible(eventNftAddress, tokenId, priceRaw);
  }

  async buyWithUSDC(listingId: bigint, priceUSDC: bigint): Promise<string> {
    const account = this.web3Service.walletAddress$.getValue();
    if (!account) throw new Error("No hay billetera conectada.");

    // Check allowance first
    const allowance = await this.web3Service.getUsdcAllowance(account, this.web3Service.COLLECTIBLE_MARKETPLACE_ADDRESS);
    if (allowance < priceUSDC) {
      // infinite approval to keep tap-to-pay behavior
      const approveTx = await this.web3Service.approveErc20Max(this.web3Service.USDC_ADDRESS, this.web3Service.COLLECTIBLE_MARKETPLACE_ADDRESS);
      await this.web3Service.waitForTransaction(approveTx);
    }

    return await this.web3Service.buyCollectibleWithUSDC(listingId);
  }

  async buyWithVBK(listingId: bigint, vbkNeeded: bigint, slippageBps = 50n): Promise<string> {
    const account = this.web3Service.walletAddress$.getValue();
    if (!account) throw new Error("No hay billetera conectada.");

    // Apply slippage
    const maxVbk = (vbkNeeded * (10000n + slippageBps)) / 10000n;
    const allowance = await this.web3Service.getVbkAllowance(account, this.web3Service.COLLECTIBLE_MARKETPLACE_ADDRESS);
    if (allowance < maxVbk) {
      const approveTx = await this.web3Service.approveErc20Max(this.web3Service.VBK_ADDRESS, this.web3Service.COLLECTIBLE_MARKETPLACE_ADDRESS);
      await this.web3Service.waitForTransaction(approveTx);
    }

    return await this.web3Service.buyCollectibleWithVBK(listingId, maxVbk);
  }

  async quoteVbkOnchain(listingId: bigint): Promise<bigint> {
    return await readContract(config, {
      address: this.web3Service.COLLECTIBLE_MARKETPLACE_ADDRESS as `0x${string}`,
      abi: this.web3Service.COLLECTIBLE_MARKETPLACE_ABI,
      functionName: 'quoteVBK',
      args: [listingId]
    } as any) as bigint;
  }

  async cancelListing(listingId: bigint): Promise<string> {
    return await this.web3Service.cancelCollectibleListing(listingId);
  }

  async updatePrice(listingId: bigint, newPriceUSDC: string): Promise<string> {
    const priceRaw = parseUnits(newPriceUSDC, 6);
    return await this.web3Service.updateCollectiblePrice(listingId, priceRaw);
  }

  formatUSDC(raw: bigint | string): string {
    return formatUnits(BigInt(raw), 6);
  }

  formatVBK(raw: bigint | string): string {
    return formatUnits(BigInt(raw), 18);
  }
}
