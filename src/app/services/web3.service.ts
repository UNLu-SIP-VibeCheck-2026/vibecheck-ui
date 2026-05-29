import { Injectable, NgZone, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ethers } from "ethers";

@Injectable({
  providedIn: "root",
})
export class Web3Service {
  private zone = inject(NgZone);

  private provider: ethers.BrowserProvider | null = null;

  private connectedAddressSubject = new BehaviorSubject<string | null>(null);
  connectedAddress$ = this.connectedAddressSubject.asObservable();

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
  private readonly VBK_ADDRESS = "0xF84c05F1278A60601989192077f40bAb340A1947";
  private readonly USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  private readonly OFFERING_NFT_ADDRESS =
    "0x20da87d52093184E07c8527c2FFc1AbF52f172b8";
  readonly EVENT_FACTORY_ADDRESS = "0x34F1bFa55707e0aafFA67d8C92fF36F2dAb5Ef79";
  readonly VENUE_SIGNER_ADDRESS = "0xF8A5EcdE82f020Ec51419D73F73B1d83BB941292";
  readonly NFT_MARKETPLACE_ADDRESS =
    "0x27F8142BC748bD87Db3eCac79e35B97378C5a76c";

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

  // ABI corregido: uint16 para maxResalePriceBps y royaltyBps,
  // supply (no maxSupply), baseURI (no baseUri)
  private readonly EVENT_FACTORY_ABI = [
    "function launchEvent((string name, string symbol, uint256 eventDate, uint16 maxResalePriceBps, uint16 royaltyBps, address venueSigner, string baseURI) p, (string name, uint256 priceUSDC, uint256 supply, uint256 sold)[] tiers) external returns (address)",
    "event EventLaunched(address indexed organizer, address indexed eventNFT, string name, uint256 eventDate)",
  ];

  constructor() {
    this.checkIfWalletIsConnected();
    this.setupListeners();
  }

  private get ethereum(): any {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return null;
  }

  isMetaMaskInstalled(): boolean {
    return !!this.ethereum;
  }

  async connectWallet(): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("MetaMask no está instalado.");
    }

    try {
      this.provider = new ethers.BrowserProvider(this.ethereum);
      const accounts = await this.provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        await this.handleAccountsChanged(accounts);
      }
    } catch (error) {
      console.error("Error conectando a MetaMask:", error);
      throw error;
    }
  }

  async checkNetwork(): Promise<boolean> {
    if (!this.ethereum) return false;

    try {
      const chainId = await this.ethereum.request({ method: "eth_chainId" });
      const isSepolia = chainId === this.SEPOLIA_CHAIN_ID;

      this.zone.run(() => {
        this.isSepoliaSubject.next(isSepolia);
      });

      if (!isSepolia) {
        await this.switchToSepolia();
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error chequeando la red:", error);
      return false;
    }
  }

  async switchToSepolia(): Promise<void> {
    if (!this.ethereum) return;
    try {
      await this.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: this.SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await this.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: this.SEPOLIA_CHAIN_ID,
                chainName: "Sepolia Test Network",
                nativeCurrency: {
                  name: "SepoliaETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.ankr.com/eth_sepolia"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError) {
          console.error("Error agregando la red Sepolia:", addError);
          throw addError;
        }
      } else {
        console.error("Error cambiando a la red Sepolia:", switchError);
        throw switchError;
      }
    }
  }

  async updateBalances(address: string): Promise<void> {
    if (!this.provider) {
      this.provider = new ethers.BrowserProvider(this.ethereum);
    }

    try {
      const ethBal = await this.provider.getBalance(address);
      const formattedEth = ethers.formatEther(ethBal);

      let formattedVbk = "0";
      try {
        const vbkContract = new ethers.Contract(
          this.VBK_ADDRESS,
          this.ERC20_ABI,
          this.provider,
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
          this.provider,
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
    if (!this.provider) {
      throw new Error("No hay proveedor de Web3 conectado.");
    }

    const signer = await this.provider.getSigner();

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
    if (!this.provider) {
      this.provider = new ethers.BrowserProvider(this.ethereum);
    }
    const signer = await this.provider.getSigner();
    return await signer.signMessage(message);
  }

  async getVbkQuote(
    eventNftAddress: string,
    tierIndex: number,
  ): Promise<bigint> {
    if (!this.provider) {
      this.provider = new ethers.BrowserProvider(this.ethereum);
    }
    const offeringContract = new ethers.Contract(
      this.OFFERING_NFT_ADDRESS,
      this.OFFERING_ABI,
      this.provider,
    );
    return await offeringContract["quoteVBK"](eventNftAddress, tierIndex);
  }

  async buyTicketWithUSDC(
    eventNftAddress: string,
    tierIndex: number,
    priceUsdc: number,
  ): Promise<{ txHash: string; tokenId: number }> {
    if (!this.provider) throw new Error("No hay proveedor de Web3 conectado.");
    const signer = await this.provider.getSigner();

    // 1. Approve USDC (6 decimales)
    const usdcContract = new ethers.Contract(
      this.USDC_ADDRESS,
      this.ERC20_ABI,
      signer,
    );
    const amountInUnits = ethers.parseUnits(priceUsdc.toString(), 6);
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
    if (!this.provider) throw new Error("No hay proveedor de Web3 conectado.");
    const signer = await this.provider.getSigner();

    // 1. Cotizar en VBK
    const quote = await this.getVbkQuote(eventNftAddress, tierIndex);
    const maxVbkAmount = (quote * 105n) / 100n; // 5% slippage

    // 2. Approve VBK (18 decimales) — usar maxVbkAmount para cubrir el slippage
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
      eventDate: number; // timestamp UNIX en segundos
      maxResalePriceBps: number; // ej. 12000 = 120%
      royaltyBps: number; // ej. 500 = 5%
      venueSigner: string; // address del venue signer
      baseURI: string; // prefijo IPFS / URL base
    },
    tiers: Array<{
      name: string;
      priceUSDC: bigint; // precio en unidades on-chain (6 decimales): parseUnits("50", 6)
      supply: number; // cantidad máxima de entradas de este tier
      sold: number; // siempre 0 al crear
    }>,
  ): Promise<{ eventNftAddress: string; deployTxHash: string }> {
    if (!this.provider) throw new Error("No hay proveedor de Web3 conectado.");
    const signer = await this.provider.getSigner();

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

  private async checkIfWalletIsConnected() {
    if (!this.ethereum) return;
    try {
      this.provider = new ethers.BrowserProvider(this.ethereum);
      const accounts = await this.provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        await this.handleAccountsChanged(accounts);
      }
    } catch (error) {
      console.error("Error verificando conexión previa:", error);
    }
  }

  private setupListeners() {
    if (!this.ethereum) return;

    this.ethereum.on("accountsChanged", (accounts: string[]) => {
      this.zone.run(async () => {
        await this.handleAccountsChanged(accounts);
      });
    });

    this.ethereum.on("chainChanged", () => {
      this.zone.run(() => {
        window.location.reload();
      });
    });
  }

  private async handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      this.connectedAddressSubject.next(null);
      this.isConnectedSubject.next(false);
      this.ethBalanceSubject.next("0");
      this.vbkBalanceSubject.next("0");
      this.usdcBalanceSubject.next("0");
    } else {
      const address = accounts[0];
      this.connectedAddressSubject.next(address);
      this.isConnectedSubject.next(true);
      const isSepolia = await this.checkNetwork();
      if (isSepolia) {
        await this.updateBalances(address);
      }
    }
  }
}
