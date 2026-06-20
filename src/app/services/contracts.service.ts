import { Injectable } from "@angular/core";
import { parseAbi } from "viem";
import { readContract } from "@wagmi/core";
import { config } from "./wagmi.config";

@Injectable({
  providedIn: "root",
})
export class ContractsService {
  // Address constants matching Web3Service
  public readonly OFFERING_NFT_ADDRESS = "0x69828a76Be6027A41A8Da3a9cc33E45b004928Fc";
  public readonly NFT_MARKETPLACE_ADDRESS = "0x5Df42E22645754f1280E34F1665E41D8bc2eCb04";
  public readonly EVENT_FACTORY_ADDRESS = "0x39069cdF1a033b8b927688f23adC2818d8FB50b6";
  public readonly USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  public readonly VBK_ADDRESS = "0xF84c05F1278A60601989192077f40bAb340A1947";
  public readonly STAKING_VAULT_ADDRESS = "0x9e275Ba91214063DD5D2562A298e12ffeD93ab8d";

  public readonly ERC20_ABI = parseAbi([
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ]);

  public readonly MARKETPLACE_ABI = parseAbi([
    "function list(address eventNFT, uint256 tokenId, uint256 priceUSDC) external returns (uint256)",
    "function cancel(uint256 listingId) external",
    "function buyWithUSDC(uint256 listingId) external",
    "function buyWithVBK(uint256 listingId) external",
    "function giftTicket(address eventNFT, uint256 tokenId, address recipient) external",
    "event Listed(uint256 indexed listingId, address indexed seller, address indexed eventNFT, uint256 tokenId, uint256 priceUSDC)",
    "event Cancelled(uint256 indexed listingId)",
    "event TicketResoldUSDC(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amountPaid, uint256 royaltyPaid, uint256 feePaid)",
    "event TicketResoldVBK(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 vbkPaid, uint256 royaltyPaid, uint256 vbkFee, uint256 priceUSDC)"
  ]);

  public readonly EVENT_NFT_ABI = parseAbi([
    "function approve(address to, uint256 tokenId) external",
    "function getApproved(uint256 tokenId) external view returns (address)",
    "function tokenTier(uint256 tokenId) external view returns (uint256)",
    "function tierOf(uint256 tokenId) external view returns (uint256)",
    "function tiers(uint256 index) external view returns (string name, uint256 priceUSDC, uint256 supply, uint256 sold)",
    "function ownerOf(uint256 tokenId) external view returns (address)"
  ]);

  public readonly OFFERING_ABI = parseAbi([
    "function buyWithUSDC(address eventNFT, uint256 tierIdx) external returns (uint256)",
    "function buyWithVBK(address eventNFT, uint256 tierIdx, uint256 maxVbkAmount) external returns (uint256)",
    "function quoteVBK(address eventNFT, uint256 tierIdx) external view returns (uint256)",
    "event TicketPurchasedUSDC(address indexed buyer, address indexed eventNFT, uint256 indexed tokenId, uint256 tierIdx, uint256 amountPaid, uint256 feePaid)",
    "event TicketPurchasedVBK(address indexed buyer, address indexed eventNFT, uint256 indexed tokenId, uint256 tierIdx, uint256 vbkPaid, uint256 vbkFee, uint256 priceUSDC)",
  ]);

  public readonly EVENT_FACTORY_ABI = parseAbi([
    "function launchEvent((string name, string symbol, uint256 eventDate, uint16 maxResalePriceBps, uint16 royaltyBps, address venueSigner, string baseURI) p, (string name, uint256 priceUSDC, uint256 supply, uint256 sold)[] tiers) external returns (address)",
    "event EventLaunched(address indexed organizer, address indexed eventNFT, string name, uint256 eventDate)",
  ]);

  async getNftApproved(eventNftAddress: string, tokenId: bigint): Promise<string> {
    return await readContract(config, {
      address: eventNftAddress as `0x${string}`,
      abi: this.EVENT_NFT_ABI,
      functionName: "getApproved",
      args: [tokenId],
    } as any) as any;
  }

  async getNftOwner(eventNftAddress: string, tokenId: bigint): Promise<string> {
    return await readContract(config, {
      address: eventNftAddress as `0x${string}`,
      abi: this.EVENT_NFT_ABI,
      functionName: "ownerOf",
      args: [tokenId],
    } as any) as any;
  }

  async getNftTokenTier(eventNftAddress: string, tokenId: bigint): Promise<number> {
    try {
      return Number(await readContract(config, {
        address: eventNftAddress as `0x${string}`,
        abi: this.EVENT_NFT_ABI,
        functionName: "tokenTier",
        args: [tokenId],
      } as any));
    } catch {
      return Number(await readContract(config, {
        address: eventNftAddress as `0x${string}`,
        abi: this.EVENT_NFT_ABI,
        functionName: "tierOf",
        args: [tokenId],
      } as any));
    }
  }

  async getEventNftTier(eventNftAddress: string, tierIndex: bigint) {
    const result = await readContract(config, {
      address: eventNftAddress as `0x${string}`,
      abi: this.EVENT_NFT_ABI,
      functionName: "tiers",
      args: [tierIndex],
    } as any) as any;
    return {
      name: result[0],
      priceUSDC: result[1],
      supply: result[2],
      sold: result[3],
    };
  }
}
