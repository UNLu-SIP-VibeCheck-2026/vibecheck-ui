import { Injectable, NgZone, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { WalletService } from "./wallet.service";
import { config } from "./wagmi.config";
import { 
  readContract, 
  writeContract, 
  sendTransaction, 
  signMessage, 
  getBalance, 
  getAccount,
  waitForTransactionReceipt 
} from "@wagmi/core";
import { 
  parseUnits, 
  formatUnits, 
  formatEther, 
  parseEther, 
  decodeEventLog, 
  decodeAbiParameters, 
  parseAbi 
} from "viem";

@Injectable({
  providedIn: "root",
})
export class Web3Service {
  private zone = inject(NgZone);
  private walletService = inject(WalletService);

  private connectedAddressSubject = new BehaviorSubject<string | null>(null);
  connectedAddress$ = this.connectedAddressSubject.asObservable();
  walletAddress$ = this.connectedAddressSubject; // Expose BehaviorSubject as required

  chainId$ = new BehaviorSubject<number | null>(null);

  private ethBalanceSubject = new BehaviorSubject<string>("0");
  ethBalance$ = this.ethBalanceSubject.asObservable();

  private vbkBalanceSubject = new BehaviorSubject<string>("0");
  vbkBalance$ = this.vbkBalanceSubject.asObservable();

  private usdcBalanceSubject = new BehaviorSubject<string>("0");
  usdcBalance$ = this.usdcBalanceSubject.asObservable();

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  isConnected$ = this.isConnectedSubject.asObservable();

  private isSepoliaSubject = new BehaviorSubject<boolean>(false);
  isSepolia$ = this.isSepoliaSubject.asObservable();

  // Smart Contract Addresses
  readonly VBK_ADDRESS = "0xF84c05F1278A60601989192077f40bAb340A1947";
  readonly USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  readonly UNISWAP_ROUTER_ADDRESS = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  readonly OFFERING_NFT_ADDRESS = "0xD5aa5a006bC3e7532Df6a27535eC04432B1f1e94";
  readonly EVENT_FACTORY_ADDRESS = "0x4F007690513D9cB44FCbCfDeE9024210E3660e32";
  readonly NFT_MARKETPLACE_ADDRESS = "0xe293447a3229B628644d0f341F05E5AcCd7FC72e";
  readonly VENUE_SIGNER_ADDRESS = "0xF8A5EcdE82f020Ec51419D73F73B1d83BB941292";
  readonly REFUND_SIGNER_ADDRESS = "0xEcd25CC3A10144B8b7f171Bb8B458791998f80d3";
  readonly TREASURY_ADDRESS = "0x54618BBcc0b65778a872A0F01397f7D9983F8507";

  private readonly SEPOLIA_CHAIN_ID = 11155111;

  private readonly ERC20_ABI = parseAbi([
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ]);

  private readonly OFFERING_ABI = parseAbi([
    "function buyWithUSDC(address eventNFT, uint256 tierIdx) external returns (uint256)",
    "function buyWithVBK(address eventNFT, uint256 tierIdx, uint256 maxVbkAmount) external returns (uint256)",
    "function quoteVBK(address eventNFT, uint256 tierIdx) external view returns (uint256)",
    "event TicketPurchasedUSDC(address indexed buyer, address indexed eventNFT, uint256 indexed tokenId, uint256 tierIdx, uint256 amountPaid, uint256 feePaid)",
    "event TicketPurchasedVBK(address indexed buyer, address indexed eventNFT, uint256 indexed tokenId, uint256 tierIdx, uint256 vbkPaid, uint256 vbkFee, uint256 priceUSDC)",
  ]);

  private readonly EVENT_FACTORY_ABI = parseAbi([
    "function launchEvent((string name, string symbol, uint256 eventDate, uint16 maxResalePriceBps, uint16 royaltyBps, address venueSigner, string baseURI) p, (string name, uint256 priceUSDC, uint256 supply, uint256 sold)[] tiers) external returns (address)",
    "event EventLaunched(address indexed organizer, address indexed eventNFT, string name, uint256 eventDate)",
  ]);

  private readonly UNISWAP_ROUTER_ABI = parseAbi([
    "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  ]);

  private readonly MARKETPLACE_ABI = parseAbi([
    "function list(address eventNFT, uint256 tokenId, uint256 priceUSDC) external returns (uint256)",
    "function cancel(uint256 listingId) external",
    "function buyWithUSDC(uint256 listingId) external",
    "function buyWithVBK(uint256 listingId) external",
    "function giftTicket(address eventNFT, uint256 tokenId, address recipient) external",
  ]);

  private readonly EVENT_NFT_ABI = parseAbi([
    "function approve(address to, uint256 tokenId) external",
    "function getApproved(uint256 tokenId) external view returns (address)",
  ]);

  constructor() {
    this.setupWalletSubscriptions();
  }

  private setupWalletSubscriptions() {
    this.walletService.address$.subscribe((addr) => {
      this.zone.run(async () => {
        this.connectedAddressSubject.next(addr);
        if (addr) {
          const isSepolia = this.chainId$.getValue() === this.SEPOLIA_CHAIN_ID;
          if (isSepolia) {
            await this.updateBalances(addr);
          }
        } else {
          this.ethBalanceSubject.next("0");
          this.vbkBalanceSubject.next("0");
          this.usdcBalanceSubject.next("0");
        }
      });
    });

    this.walletService.isConnected$.subscribe((connected) => {
      this.zone.run(() => {
        this.isConnectedSubject.next(connected);
      });
    });

    this.walletService.chainId$.subscribe((chainId) => {
      this.zone.run(async () => {
        const isSepolia = chainId === this.SEPOLIA_CHAIN_ID;
        this.chainId$.next(chainId);
        this.isSepoliaSubject.next(isSepolia);

        const addr = this.connectedAddressSubject.getValue();
        if (addr) {
          if (isSepolia) {
            await this.updateBalances(addr);
          } else {
            this.ethBalanceSubject.next("0");
            this.vbkBalanceSubject.next("0");
            this.usdcBalanceSubject.next("0");
          }
        }
      });
    });
  }

  async connectWallet(): Promise<void> {
    try {
      await this.walletService.open();
    } catch (error) {
      console.error("Error conectando a la wallet:", error);
      throw error;
    }
  }

  async checkNetwork(): Promise<boolean> {
    const chainId = this.chainId$.getValue();
    const isSepolia = chainId === this.SEPOLIA_CHAIN_ID;
    this.zone.run(() => {
      this.isSepoliaSubject.next(isSepolia);
    });
    if (!isSepolia) {
      await this.switchToSepolia();
      return false;
    }
    return true;
  }

  async switchToSepolia(): Promise<void> {
    try {
      await this.walletService.switchNetwork();
    } catch (switchError) {
      console.error("Error cambiando a la red Sepolia:", switchError);
      throw switchError;
    }
  }

  async updateBalances(address: string): Promise<void> {
    try {
      // Get ETH Balance
      const ethBalResult = await getBalance(config, {
        address: address as `0x${string}`,
      });
      const formattedEth = formatEther(ethBalResult.value);

      // Get VBK Balance
      let formattedVbk = "0";
      try {
        const vbkBal = await readContract(config, {
          address: this.VBK_ADDRESS as `0x${string}`,
          abi: this.ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        } as any) as bigint;
        formattedVbk = formatEther(vbkBal);
      } catch (err) {
        console.error("Error obteniendo balance de VBK:", err);
      }

      // Get USDC Balance
      let formattedUsdc = "0";
      try {
        const usdcBal = await readContract(config, {
          address: this.USDC_ADDRESS as `0x${string}`,
          abi: this.ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        } as any) as bigint;
        formattedUsdc = formatUnits(usdcBal, 6);
      } catch (err) {
        console.error("Error obteniendo balance de USDC:", err);
      }

      this.zone.run(() => {
        this.ethBalanceSubject.next(parseFloat(formattedEth).toFixed(4));
        this.vbkBalanceSubject.next(parseFloat(formattedVbk).toFixed(2));
        this.usdcBalanceSubject.next(parseFloat(formattedUsdc).toFixed(2));
      });
    } catch (error) {
      console.error("Error actualizando balances:", error);
    }
  }

  async sendFunds(
    to: string,
    amount: string,
    asset: "ETH" | "VBK" | "USDC",
  ): Promise<string> {
    if (asset === "ETH") {
      const hash = await sendTransaction(config, {
        to: to as `0x${string}`,
        value: parseEther(amount),
      });
      return hash;
    } else {
      const contractAddress = asset === "VBK" ? this.VBK_ADDRESS : this.USDC_ADDRESS;
      const decimals = asset === "VBK" ? 18 : 6;
      const amountInUnits = parseUnits(amount, decimals);

      const hash = await writeContract(config, {
        address: contractAddress as `0x${string}`,
        abi: this.ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, amountInUnits],
      } as any);
      return hash;
    }
  }

  async signMessage(message: string): Promise<string> {
    return await signMessage(config, { message } as any);
  }

  async getVbkQuote(
    eventNftAddress: string,
    tierIndex: number,
  ): Promise<bigint> {
    return await readContract(config, {
      address: this.OFFERING_NFT_ADDRESS as `0x${string}`,
      abi: this.OFFERING_ABI,
      functionName: "quoteVBK",
      args: [eventNftAddress as `0x${string}`, BigInt(tierIndex)],
    } as any) as bigint;
  }

  async buyTicketWithUSDC(
    eventNftAddress: string,
    tierIndex: number,
    priceUsdc: number,
  ): Promise<{ txHash: string; tokenId: number }> {
    const amountInUnits = (parseUnits(priceUsdc.toString(), 6) * 107n) / 100n;

    // Approve USDC (100% direct for mobile responsiveness)
    const approveTxHash = await writeContract(config, {
      address: this.USDC_ADDRESS as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "approve",
      args: [this.OFFERING_NFT_ADDRESS as `0x${string}`, amountInUnits],
    } as any);

    await waitForTransactionReceipt(config, { hash: approveTxHash });

    // Buy ticket
    const buyTxHash = await writeContract(config, {
      address: this.OFFERING_NFT_ADDRESS as `0x${string}`,
      abi: this.OFFERING_ABI,
      functionName: "buyWithUSDC",
      args: [eventNftAddress as `0x${string}`, BigInt(tierIndex)],
    } as any);

    const receipt = await waitForTransactionReceipt(config, { hash: buyTxHash });

    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: this.OFFERING_ABI,
          data: log.data,
          topics: log.topics,
        } as any) as any;
        if (decoded.eventName === "TicketPurchasedUSDC") {
          tokenId = Number(decoded.args.tokenId);
          break;
        }
      } catch (e) {
        // ignore other contracts
      }
    }

    if (tokenId === null) {
      throw new Error("No se pudo extraer el tokenId de los logs de la transacción.");
    }

    return { txHash: receipt.transactionHash, tokenId };
  }

  async buyTicketWithVBK(
    eventNftAddress: string,
    tierIndex: number,
  ): Promise<{ txHash: string; tokenId: number }> {
    const quote = await this.getVbkQuote(eventNftAddress, tierIndex);
    const vbkNeeded = (quote * 105n) / 100n; // 5% slippage
    const maxVbkAmount = (vbkNeeded * 104n) / 100n; // 4% fee

    // Approve VBK
    const approveTxHash = await writeContract(config, {
      address: this.VBK_ADDRESS as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "approve",
      args: [this.OFFERING_NFT_ADDRESS as `0x${string}`, maxVbkAmount],
    } as any);

    await waitForTransactionReceipt(config, { hash: approveTxHash });

    // Buy ticket
    const buyTxHash = await writeContract(config, {
      address: this.OFFERING_NFT_ADDRESS as `0x${string}`,
      abi: this.OFFERING_ABI,
      functionName: "buyWithVBK",
      args: [eventNftAddress as `0x${string}`, BigInt(tierIndex), maxVbkAmount],
    } as any);

    const receipt = await waitForTransactionReceipt(config, { hash: buyTxHash });

    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: this.OFFERING_ABI,
          data: log.data,
          topics: log.topics,
        } as any) as any;
        if (decoded.eventName === "TicketPurchasedVBK") {
          tokenId = Number(decoded.args.tokenId);
          break;
        }
      } catch (e) {
        // ignore other contracts
      }
    }

    if (tokenId === null) {
      throw new Error("No se pudo extraer el tokenId de los logs de la transacción.");
    }

    return { txHash: receipt.transactionHash, tokenId };
  }

  async launchEventOnChain(
    params: {
      name: string;
      symbol: string;
      eventDate: number;
      maxResalePriceBps: number;
      royaltyBps: number;
      venueSigner: string;
      baseURI: string;
    },
    tiers: Array<{
      name: string;
      priceUSDC: bigint;
      supply: number;
      sold: number;
    }>,
  ): Promise<{ eventNftAddress: string; deployTxHash: string }> {
    const txHash = await writeContract(config, {
      address: this.EVENT_FACTORY_ADDRESS as `0x${string}`,
      abi: this.EVENT_FACTORY_ABI,
      functionName: "launchEvent",
      args: [
        {
          name: params.name,
          symbol: params.symbol,
          eventDate: BigInt(params.eventDate),
          maxResalePriceBps: params.maxResalePriceBps,
          royaltyBps: params.royaltyBps,
          venueSigner: params.venueSigner as `0x${string}`,
          baseURI: params.baseURI,
        },
        tiers.map(t => ({
          name: t.name,
          priceUSDC: t.priceUSDC,
          supply: BigInt(t.supply),
          sold: BigInt(t.sold)
        }))
      ],
    } as any);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    let eventNftAddress: string | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: this.EVENT_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        } as any) as any;
        if (decoded.eventName === "EventLaunched") {
          eventNftAddress = decoded.args.eventNFT;
          break;
        }
      } catch (e) {
        // ignore other contracts
      }
    }

    if (!eventNftAddress) {
      throw new Error("No se pudo extraer el eventNftAddress del log de EventLaunched.");
    }

    return { eventNftAddress, deployTxHash: receipt.transactionHash };
  }

  async quoteUsdcToVbk(usdcAmount: number): Promise<bigint> {
    const amountIn = parseUnits(usdcAmount.toString(), 6);
    const amounts = await readContract(config, {
      address: this.UNISWAP_ROUTER_ADDRESS as `0x${string}`,
      abi: this.UNISWAP_ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [amountIn, [this.USDC_ADDRESS as `0x${string}`, this.VBK_ADDRESS as `0x${string}`]],
    } as any) as bigint[];
    return amounts[1];
  }

  async approveToken(
    tokenAddress: string,
    spender: string,
    amount: bigint,
  ): Promise<void> {
    const txHash = await writeContract(config, {
      address: tokenAddress as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, amount],
    } as any);
    await waitForTransactionReceipt(config, { hash: txHash });
  }

  async executeSwap(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: number,
  ): Promise<string> {
    const txHash = await writeContract(config, {
      address: this.UNISWAP_ROUTER_ADDRESS as `0x${string}`,
      abi: this.UNISWAP_ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [amountIn, amountOutMin, path.map(p => p as `0x${string}`), to as `0x${string}`, BigInt(deadline)],
    } as any);
    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    return receipt.transactionHash;
  }

  async swapUsdcForVbk(
    usdcAmount: number,
    slippagePct: number = 2,
  ): Promise<string> {
    const account = getAccount(config);
    const userAddress = account.address;
    if (!userAddress) throw new Error("No hay billetera conectada.");

    const amountIn = parseUnits(usdcAmount.toString(), 6);
    const quoted = await this.quoteUsdcToVbk(usdcAmount);
    const amountOutMin = (quoted * BigInt(100 - slippagePct)) / 100n;

    await this.approveToken(this.USDC_ADDRESS, this.UNISWAP_ROUTER_ADDRESS, amountIn);

    const deadline = Math.floor(Date.now() / 1000) + 300;
    return await this.executeSwap(
      amountIn,
      amountOutMin,
      [this.USDC_ADDRESS, this.VBK_ADDRESS],
      userAddress,
      deadline,
    );
  }

  async quoteVbkToUsdc(vbkAmount: number): Promise<bigint> {
    const amountIn = parseUnits(vbkAmount.toString(), 18);
    const amounts = await readContract(config, {
      address: this.UNISWAP_ROUTER_ADDRESS as `0x${string}`,
      abi: this.UNISWAP_ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [amountIn, [this.VBK_ADDRESS as `0x${string}`, this.USDC_ADDRESS as `0x${string}`]],
    } as any) as bigint[];
    return amounts[1];
  }

  async swapVbkForUsdc(
    vbkAmount: number,
    slippagePct: number = 2,
  ): Promise<string> {
    const account = getAccount(config);
    const userAddress = account.address;
    if (!userAddress) throw new Error("No hay billetera conectada.");

    const amountIn = parseUnits(vbkAmount.toString(), 18);
    const quoted = await this.quoteVbkToUsdc(vbkAmount);

    const afterFee = (quoted * 85n) / 100n; // 15% fee
    const amountOutMin = (afterFee * BigInt(100 - slippagePct)) / 100n;

    await this.approveToken(this.VBK_ADDRESS, this.UNISWAP_ROUTER_ADDRESS, amountIn);

    const deadline = Math.floor(Date.now() / 1000) + 300;
    return await this.executeSwap(
      amountIn,
      amountOutMin,
      [this.VBK_ADDRESS, this.USDC_ADDRESS],
      userAddress,
      deadline,
    );
  }

  async getVbkReceivedFromSwap(
    txHash: string,
    userAddress: string,
  ): Promise<bigint> {
    const receipt = await waitForTransactionReceipt(config, { hash: txHash as `0x${string}` });
    const transferEventTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    let amountReceived = 0n;

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === this.VBK_ADDRESS.toLowerCase() &&
        log.topics[0] === transferEventTopic &&
        log.topics[2] &&
        log.topics[2].toLowerCase().slice(-40) === userAddress.toLowerCase().slice(-40)
      ) {
        const decoded = decodeAbiParameters([{ type: "uint256" }], log.data);
        amountReceived = decoded[0];
      }
    }
    return amountReceived;
  }

  async getUsdcReceivedFromSwap(
    txHash: string,
    userAddress: string,
  ): Promise<bigint> {
    const receipt = await waitForTransactionReceipt(config, { hash: txHash as `0x${string}` });
    const transferEventTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    let amountReceived = 0n;

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === this.USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === transferEventTopic &&
        log.topics[2] &&
        log.topics[2].toLowerCase().slice(-40) === userAddress.toLowerCase().slice(-40)
      ) {
        const decoded = decodeAbiParameters([{ type: "uint256" }], log.data);
        amountReceived = decoded[0];
      }
    }
    return amountReceived;
  }

  // --- Helper methods for centralized contract interactions ---

  async listTicket(eventNftAddress: string, tokenId: bigint, priceUsdc: bigint): Promise<string> {
    return await writeContract(config, {
      address: this.NFT_MARKETPLACE_ADDRESS as `0x${string}`,
      abi: this.MARKETPLACE_ABI,
      functionName: "list",
      args: [eventNftAddress as `0x${string}`, tokenId, priceUsdc],
    } as any);
  }

  async cancelListing(listingId: bigint): Promise<string> {
    return await writeContract(config, {
      address: this.NFT_MARKETPLACE_ADDRESS as `0x${string}`,
      abi: this.MARKETPLACE_ABI,
      functionName: "cancel",
      args: [listingId],
    } as any);
  }

  async giftTicket(eventNftAddress: string, tokenId: bigint, recipient: string): Promise<string> {
    return await writeContract(config, {
      address: this.NFT_MARKETPLACE_ADDRESS as `0x${string}`,
      abi: this.MARKETPLACE_ABI,
      functionName: "giftTicket",
      args: [eventNftAddress as `0x${string}`, tokenId, recipient as `0x${string}`],
    } as any);
  }

  async getUsdcAllowance(owner: string, spender: string): Promise<bigint> {
    return await readContract(config, {
      address: this.USDC_ADDRESS as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "allowance",
      args: [owner as `0x${string}`, spender as `0x${string}`],
    } as any) as bigint;
  }

  async approveUsdc(spender: string, amount: bigint): Promise<string> {
    return await writeContract(config, {
      address: this.USDC_ADDRESS as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, amount],
    } as any);
  }

  async getVbkAllowance(owner: string, spender: string): Promise<bigint> {
    return await readContract(config, {
      address: this.VBK_ADDRESS as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "allowance",
      args: [owner as `0x${string}`, spender as `0x${string}`],
    } as any) as bigint;
  }

  async approveVbk(spender: string, amount: bigint): Promise<string> {
    return await writeContract(config, {
      address: this.VBK_ADDRESS as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, amount],
    } as any);
  }

  async approveNft(eventNftAddress: string, spender: string, tokenId: bigint): Promise<string> {
    return await writeContract(config, {
      address: eventNftAddress as `0x${string}`,
      abi: this.EVENT_NFT_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, tokenId],
    } as any);
  }

  async waitForTransaction(txHash: string): Promise<any> {
    return await waitForTransactionReceipt(config, {
      hash: txHash as `0x${string}`,
    });
  }
}