import { Injectable, NgZone, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ethers } from "ethers";
import { WalletService } from "./wallet.service";

@Injectable({
  providedIn: "root",
})
export class Web3Service {
  private zone = inject(NgZone);
  private walletService = inject(WalletService);

  private _cachedBrowserProvider: ethers.BrowserProvider | null = null;
  private _lastEipProvider: any = null;
  private _cachedChainId: number | null = null;

  private get provider(): ethers.BrowserProvider | null {
    const eipProvider = this.walletService.getEip1193Provider();
    const currentChainId = this.chainId$.getValue();
    if (!eipProvider) {
      this._cachedBrowserProvider = null;
      this._lastEipProvider = null;
      this._cachedChainId = null;
      return null;
    }
    // Reconstruir si cambió el provider EIP-1193 O si cambió la red.
    // En WalletConnect mobile, switchNetwork() puede devolver el mismo objeto
    // EIP-1193 con la red interna cambiada. Si no se reconstruye el BrowserProvider,
    // ethers mantiene cacheado el chainId anterior (ej. mainnet = 1) y firma todas
    // las transacciones en esa red, aunque el usuario ya esté en Sepolia.
    if (eipProvider !== this._lastEipProvider || currentChainId !== this._cachedChainId) {
      this._lastEipProvider = eipProvider;
      this._cachedChainId = currentChainId;
      this._cachedBrowserProvider = new ethers.BrowserProvider(eipProvider);
    }
    return this._cachedBrowserProvider;
  }

  private set provider(value: any) {
    // Ignore direct assignments from legacy code
  }

  private connectedAddressSubject = new BehaviorSubject<string | null>(null);
  connectedAddress$ = this.connectedAddressSubject.asObservable();
  walletAddress$ = this.connectedAddressSubject; // Expose BehaviorSubject as required by the prompt

  chainId$ = new BehaviorSubject<number | null>(null); // Expose chainId BehaviorSubject

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

  getSigner(): Promise<ethers.Signer> {
    return this.walletService.getSigner();
  }

  getProvider(): ethers.BrowserProvider {
    const p = this.provider;
    if (!p) throw new Error("No hay billetera conectada.");
    return p;
  }

  // Smart Contract Addresses
  readonly VBK_ADDRESS = "0xF84c05F1278A60601989192077f40bAb340A1947";
  readonly USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  readonly UNISWAP_ROUTER_ADDRESS =
    "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";

  private readonly UNISWAP_ROUTER_ABI = [
    "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  ];
  private readonly OFFERING_NFT_ADDRESS =
    "0xD5aa5a006bC3e7532Df6a27535eC04432B1f1e94";
  readonly EVENT_FACTORY_ADDRESS = "0x4F007690513D9cB44FCbCfDeE9024210E3660e32";
  readonly VENUE_SIGNER_ADDRESS = "0xF8A5EcdE82f020Ec51419D73F73B1d83BB941292";
  readonly NFT_MARKETPLACE_ADDRESS =
    "0xe293447a3229B628644d0f341F05E5AcCd7FC72e";
  readonly REFUND_SIGNER_ADDRESS = "0xEcd25CC3A10144B8b7f171Bb8B458791998f80d3";
  readonly TREASURY_ADDRESS = "0x54618BBcc0b65778a872A0F01397f7D9983F8507";

  private readonly SEPOLIA_CHAIN_ID = "0xaa36a7";

  private readonly ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
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

  constructor() {
    this.setupWalletSubscriptions();
  }

  private setupWalletSubscriptions() {
    this.walletService.address$.subscribe((addr) => {
      this.zone.run(async () => {
        this.connectedAddressSubject.next(addr);
        if (addr) {
          const isSepolia = this.chainId$.getValue() === 11155111;
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
        const isSepolia = chainId === 11155111;
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
    const isSepolia = chainId === 11155111;
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
    const currentProvider = this.getProvider();

    try {
      const ethBal = await currentProvider.getBalance(address);
      const formattedEth = ethers.formatEther(ethBal);

      let formattedVbk = "0";
      try {
        const vbkContract = new ethers.Contract(
          this.VBK_ADDRESS,
          this.ERC20_ABI,
          currentProvider,
        );
        const vbkBal = await vbkContract["balanceOf"](address);
        formattedVbk = ethers.formatEther(vbkBal);
      } catch (err) {
        console.error("Error obteniendo balance de VBK:", err);
      }

      let formattedUsdc = "0";
      try {
        const usdcContract = new ethers.Contract(
          this.USDC_ADDRESS,
          this.ERC20_ABI,
          currentProvider,
        );
        const usdcBal = await usdcContract["balanceOf"](address);
        const decimals = await usdcContract["decimals"]().catch(() => 6);
        formattedUsdc = ethers.formatUnits(usdcBal, decimals);
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
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();

    if (asset === "ETH") {
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });
      return tx.hash;
    } else {
      const contractAddress =
        asset === "VBK" ? this.VBK_ADDRESS : this.USDC_ADDRESS;
      const decimals = asset === "VBK" ? 18 : 6;
      const tokenContract = new ethers.Contract(
        contractAddress,
        this.ERC20_ABI,
        signer,
      );
      const amountInWei = ethers.parseUnits(amount, decimals);
      const tx = await tokenContract["transfer"](to, amountInWei);
      return tx.hash;
    }
  }

  async signMessage(message: string): Promise<string> {
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();
    return await signer.signMessage(message);
  }

  async getVbkQuote(
    eventNftAddress: string,
    tierIndex: number,
  ): Promise<bigint> {
    const currentProvider = this.getProvider();
    const offeringContract = new ethers.Contract(
      this.OFFERING_NFT_ADDRESS,
      this.OFFERING_ABI,
      currentProvider,
    );
    return await offeringContract["quoteVBK"](eventNftAddress, tierIndex);
  }

  async buyTicketWithUSDC(
    eventNftAddress: string,
    tierIndex: number,
    priceUsdc: number,
  ): Promise<{ txHash: string; tokenId: number }> {
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();

    // 1. Approve USDC (6 decimales) — cover priceUSDC + 7% fee
    const usdcContract = new ethers.Contract(
      this.USDC_ADDRESS,
      this.ERC20_ABI,
      signer,
    );
    const amountInUnits =
      (ethers.parseUnits(priceUsdc.toString(), 6) * 107n) / 100n;
    const approveTx = await usdcContract["approve"](
      this.OFFERING_NFT_ADDRESS,
      amountInUnits,
    );
    await approveTx.wait();

    // 2. Comprar ticket
    const offeringContract = new ethers.Contract(
      this.OFFERING_NFT_ADDRESS,
      this.OFFERING_ABI,
      signer,
    );
    const buyTx = await offeringContract["buyWithUSDC"](
      eventNftAddress,
      tierIndex,
    );
    const receipt = await buyTx.wait();

    // 3. Extraer tokenId del evento TicketPurchasedUSDC
    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = offeringContract.interface.parseLog(log);
        if (parsed && parsed.name === "TicketPurchasedUSDC") {
          tokenId = Number(parsed.args["tokenId"]);
          break;
        }
      } catch (e) {
        /* ignorar logs de otros contratos */
      }
    }

    if (tokenId === null) {
      throw new Error(
        "No se pudo extraer el tokenId de los logs de la transacción.",
      );
    }

    return { txHash: receipt.hash ?? buyTx.hash, tokenId };
  }

  async buyTicketWithVBK(
    eventNftAddress: string,
    tierIndex: number,
  ): Promise<{ txHash: string; tokenId: number }> {
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();

    // 1. Cotizar en VBK
    const quote = await this.getVbkQuote(eventNftAddress, tierIndex);
    const vbkNeeded = (quote * 105n) / 100n; // 5% slippage
    const maxVbkAmount = (vbkNeeded * 104n) / 100n; // 4% fee

    // 2. Approve VBK (18 decimales) — usar maxVbkAmount para cubrir el slippage + fee
    const vbkContract = new ethers.Contract(
      this.VBK_ADDRESS,
      this.ERC20_ABI,
      signer,
    );
    const approveTx = await vbkContract["approve"](
      this.OFFERING_NFT_ADDRESS,
      maxVbkAmount,
    );
    await approveTx.wait();

    // 3. Comprar ticket
    const offeringContract = new ethers.Contract(
      this.OFFERING_NFT_ADDRESS,
      this.OFFERING_ABI,
      signer,
    );
    const buyTx = await offeringContract["buyWithVBK"](
      eventNftAddress,
      tierIndex,
      maxVbkAmount,
    );
    const receipt = await buyTx.wait();

    // 4. Extraer tokenId del evento TicketPurchasedVBK
    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = offeringContract.interface.parseLog(log);
        if (parsed && parsed.name === "TicketPurchasedVBK") {
          tokenId = Number(parsed.args["tokenId"]);
          break;
        }
      } catch (e) {
        /* ignorar logs de otros contratos */
      }
    }

    if (tokenId === null) {
      throw new Error(
        "No se pudo extraer el tokenId de los logs de la transacción.",
      );
    }

    return { txHash: receipt.hash ?? buyTx.hash, tokenId };
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
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();

    const factoryContract = new ethers.Contract(
      this.EVENT_FACTORY_ADDRESS,
      this.EVENT_FACTORY_ABI,
      signer,
    );

    const tx = await factoryContract["launchEvent"](params, tiers);
    const receipt = await tx.wait();

    // Extraer eventNFT address del evento EventLaunched
    let eventNftAddress: string | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = factoryContract.interface.parseLog(log);
        if (parsed && parsed.name === "EventLaunched") {
          eventNftAddress = parsed.args["eventNFT"];
          break;
        }
      } catch (e) {
        /* ignorar logs de otros contratos */
      }
    }

    if (!eventNftAddress) {
      throw new Error(
        "No se pudo extraer el eventNftAddress del log de EventLaunched.",
      );
    }

    return { eventNftAddress, deployTxHash: receipt.hash ?? tx.hash };
  }

  // =========================================================================
  // Uniswap V2 Swap Methods (USDC <-> VBK)
  // =========================================================================

  async quoteUsdcToVbk(usdcAmount: number): Promise<bigint> {
    const currentProvider = this.getProvider();
    const routerContract = new ethers.Contract(
      this.UNISWAP_ROUTER_ADDRESS,
      this.UNISWAP_ROUTER_ABI,
      currentProvider,
    );
    const amountIn = ethers.parseUnits(usdcAmount.toString(), 6);
    const amounts = await routerContract["getAmountsOut"](amountIn, [
      this.USDC_ADDRESS,
      this.VBK_ADDRESS,
    ]);
    return amounts[1];
  }

  async approveToken(
    tokenAddress: string,
    spender: string,
    amount: bigint,
  ): Promise<void> {
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();
    const tokenContract = new ethers.Contract(
      tokenAddress,
      this.ERC20_ABI,
      signer,
    );
    const tx = await tokenContract["approve"](spender, amount);
    await tx.wait();
  }

  async executeSwap(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: number,
  ): Promise<string> {
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();
    const routerContract = new ethers.Contract(
      this.UNISWAP_ROUTER_ADDRESS,
      this.UNISWAP_ROUTER_ABI,
      signer,
    );
    const tx = await routerContract["swapExactTokensForTokens"](
      amountIn,
      amountOutMin,
      path,
      to,
      deadline,
    );
    const receipt = await tx.wait();
    return receipt.hash ?? tx.hash;
  }

  async swapUsdcForVbk(
    usdcAmount: number,
    slippagePct: number = 2,
  ): Promise<string> {
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();
    const userAddress = await signer.getAddress();

    const amountIn = ethers.parseUnits(usdcAmount.toString(), 6);
    const quoted = await this.quoteUsdcToVbk(usdcAmount);

    const amountOutMin = (quoted * BigInt(100 - slippagePct)) / 100n;

    await this.approveToken(
      this.USDC_ADDRESS,
      this.UNISWAP_ROUTER_ADDRESS,
      amountIn,
    );

    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    return await this.executeSwap(
      amountIn,
      amountOutMin,
      [this.USDC_ADDRESS, this.VBK_ADDRESS],
      userAddress,
      deadline,
    );
  }

  async quoteVbkToUsdc(vbkAmount: number): Promise<bigint> {
    const currentProvider = this.getProvider();
    const routerContract = new ethers.Contract(
      this.UNISWAP_ROUTER_ADDRESS,
      this.UNISWAP_ROUTER_ABI,
      currentProvider,
    );
    const amountIn = ethers.parseUnits(vbkAmount.toString(), 18);
    const amounts = await routerContract["getAmountsOut"](amountIn, [
      this.VBK_ADDRESS,
      this.USDC_ADDRESS,
    ]);
    return amounts[1];
  }

  async swapVbkForUsdc(
    vbkAmount: number,
    slippagePct: number = 2,
  ): Promise<string> {
    const currentProvider = this.getProvider();
    const signer = await currentProvider.getSigner();
    const userAddress = await signer.getAddress();

    const amountIn = ethers.parseUnits(vbkAmount.toString(), 18);
    const quoted = await this.quoteVbkToUsdc(vbkAmount);

    const afterFee = (quoted * 85n) / 100n; // 15% fee
    const amountOutMin = (afterFee * BigInt(100 - slippagePct)) / 100n;

    await this.approveToken(
      this.VBK_ADDRESS,
      this.UNISWAP_ROUTER_ADDRESS,
      amountIn,
    );

    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
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
    const currentProvider = this.getProvider();
    const receipt = await currentProvider.getTransactionReceipt(txHash);
    if (!receipt)
      throw new Error("No se pudo obtener el recibo de transacción.");

    const transferEventTopic =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    let amountReceived = 0n;

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === this.VBK_ADDRESS.toLowerCase() &&
        log.topics[0] === transferEventTopic &&
        log.topics[2] &&
        log.topics[2].toLowerCase().slice(-40) ===
        userAddress.toLowerCase().slice(-40)
      ) {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256"],
          log.data,
        );
        amountReceived = decoded[0];
      }
    }
    return amountReceived;
  }

  async getUsdcReceivedFromSwap(
    txHash: string,
    userAddress: string,
  ): Promise<bigint> {
    const currentProvider = this.getProvider();
    const receipt = await currentProvider.getTransactionReceipt(txHash);
    if (!receipt)
      throw new Error("No se pudo obtener el recibo de transacción.");

    const transferEventTopic =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    let amountReceived = 0n;

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === this.USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === transferEventTopic &&
        log.topics[2] &&
        log.topics[2].toLowerCase().slice(-40) ===
        userAddress.toLowerCase().slice(-40)
      ) {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256"],
          log.data,
        );
        amountReceived = decoded[0];
      }
    }
    return amountReceived;
  }
}