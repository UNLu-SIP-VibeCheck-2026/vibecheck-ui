import { Injectable, inject } from "@angular/core";
import { ethers } from "ethers";
import { Web3Service } from "./web3.service";

@Injectable({
  providedIn: "root",
})
export class ContractsService {
  private web3Service = inject(Web3Service);

  private readonly ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];

  private readonly MARKETPLACE_ABI = [
    "function list(address eventNFT, uint256 tokenId, uint256 priceUSDC) external returns (uint256)",
    "function cancel(uint256 listingId) external",
    "function buyWithUSDC(uint256 listingId) external",
    "function buyWithVBK(uint256 listingId) external",
    "function giftTicket(address eventNFT, uint256 tokenId, address recipient) external",
    "event Listed(uint256 indexed listingId, address indexed seller, address indexed eventNFT, uint256 tokenId, uint256 priceUSDC)",
    "event Cancelled(uint256 indexed listingId)",
    "event TicketResoldUSDC(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amountPaid, uint256 royaltyPaid, uint256 feePaid)",
    "event TicketResoldVBK(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 vbkPaid, uint256 royaltyPaid, uint256 vbkFee, uint256 priceUSDC)"
  ];

  private readonly EVENT_NFT_ABI = [
    "function approve(address to, uint256 tokenId) external",
    "function getApproved(uint256 tokenId) external view returns (address)",
    "function tokenTier(uint256 tokenId) external view returns (uint256)",
    "function tierOf(uint256 tokenId) external view returns (uint256)",
    "function tiers(uint256 index) external view returns (string name, uint256 priceUSDC, uint256 supply, uint256 sold)",
    "function ownerOf(uint256 tokenId) external view returns (address)"
  ];

  private readonly OFFERING_ABI = [
    "function buyWithUSDC(address eventNFT, uint256 tierIdx) external returns (uint256)",
    "function buyWithVBK(address eventNFT, uint256 tierIdx, uint256 maxVbkAmount) external returns (uint256)",
    "function quoteVBK(address eventNFT, uint256 tierIdx) external view returns (uint256)",
    "event TicketPurchasedUSDC(address indexed buyer, address indexed eventNFT, uint256 indexed tokenId, uint256 tierIdx, uint256 amountPaid, uint256 feePaid)",
    "event TicketPurchasedVBK(address indexed buyer, address indexed eventNFT, uint256 indexed tokenId, uint256 tierIdx, uint256 vbkPaid, uint256 vbkFee, uint256 priceUSDC)",
  ];

  private readonly EVENT_FACTORY_ABI = [
    "function launchEvent((string name, string symbol, uint256 eventDate, uint16 maxResalePriceBps, uint16 royaltyBps, address venueSigner, string baseURI) p, (string name, uint256 priceUSDC, uint256 supply, uint256 sold)[] tiers) external returns (address)",
    "event EventLaunched(address indexed organizer, address indexed eventNFT, string name, uint256 eventDate)",
  ];

  getOfferingNFT(runner?: ethers.ContractRunner): ethers.Contract {
    const activeRunner = runner || this.web3Service.getProvider();
    // Offering NFT address is defined in Web3Service
    const address = (this.web3Service as any).OFFERING_NFT_ADDRESS || "0x1C36ba105258D3cCc0466797C9B0331e42B9FC0d";
    return new ethers.Contract(address, this.OFFERING_ABI, activeRunner);
  }

  getMarketplace(runner?: ethers.ContractRunner): ethers.Contract {
    const activeRunner = runner || this.web3Service.getProvider();
    const address = this.web3Service.NFT_MARKETPLACE_ADDRESS;
    return new ethers.Contract(address, this.MARKETPLACE_ABI, activeRunner);
  }

  getEventFactory(runner?: ethers.ContractRunner): ethers.Contract {
    const activeRunner = runner || this.web3Service.getProvider();
    const address = this.web3Service.EVENT_FACTORY_ADDRESS;
    return new ethers.Contract(address, this.EVENT_FACTORY_ABI, activeRunner);
  }

  getEventNFT(address: string, runner?: ethers.ContractRunner): ethers.Contract {
    const activeRunner = runner || this.web3Service.getProvider();
    return new ethers.Contract(address, this.EVENT_NFT_ABI, activeRunner);
  }

  getUsdcToken(runner?: ethers.ContractRunner): ethers.Contract {
    const activeRunner = runner || this.web3Service.getProvider();
    const address = this.web3Service.USDC_ADDRESS;
    return new ethers.Contract(address, this.ERC20_ABI, activeRunner);
  }

  getVbkToken(runner?: ethers.ContractRunner): ethers.Contract {
    const activeRunner = runner || this.web3Service.getProvider();
    const address = this.web3Service.VBK_ADDRESS;
    return new ethers.Contract(address, this.ERC20_ABI, activeRunner);
  }
}
