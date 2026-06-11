import { Injectable, NgZone, inject } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from "rxjs";
import { createAppKit, AppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { sepolia } from "@reown/appkit/networks";
import { environment } from "../../environments/environment";
import { ethers } from "ethers";
import { Wallet, Transaction } from '../models/wallet.model';

export interface SiweChallengeResponse {
  message: string;
  nonce: string;
}

export interface SiweVerifyResponse {
  walletAddress: string;
  linked: boolean;
}

@Injectable({
  providedIn: "root",
})
export class WalletService {
  private zone = inject(NgZone);
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;
  private modal!: AppKit;

  private addressSubject = new BehaviorSubject<string | null>(null);
  address$ = this.addressSubject.asObservable();

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  isConnected$ = this.isConnectedSubject.asObservable();

  private chainIdSubject = new BehaviorSubject<number | null>(null);
  chainId$ = this.chainIdSubject.asObservable();

  private providerSubject = new BehaviorSubject<any>(null);
  provider$ = this.providerSubject.asObservable();

  private eip1193Provider: any = null;

  constructor() {
    this.initAppKit();
  }

  private initAppKit() {
    const projectId = environment.reownProjectId;
    const metadata = {
      name: "VibeCheck UI",
      description: "VibeCheck UI Platform",
      url: typeof window !== "undefined" ? window.location.origin : "http://localhost:4200",
      icons: ["https://avatars.githubusercontent.com/u/179229932"],
    };

    this.modal = createAppKit({
      adapters: [new EthersAdapter()],
      networks: [sepolia],
      defaultNetwork: sepolia,
      metadata,
      projectId,
      features: {
        analytics: true,
      },
    });

    // Subscribe to account changes
    this.modal.subscribeAccount((account) => {
      this.zone.run(() => {
        this.addressSubject.next(account.address || null);
        this.isConnectedSubject.next(account.isConnected || false);
      });
    });

    // Subscribe to network changes
    this.modal.subscribeNetwork((network) => {
      this.zone.run(() => {
        this.chainIdSubject.next(network.chainId ? Number(network.chainId) : null);
      });
    });

    // Subscribe to EVM provider changes
    this.modal.subscribeProviders((state) => {
      this.zone.run(() => {
        const eipProvider = state["eip155"] || null;
        this.eip1193Provider = eipProvider;
        this.providerSubject.next(eipProvider);
      });
    });
  }

  async open(): Promise<void> {
    await this.modal.open();
  }

  async disconnect(): Promise<void> {
    await this.modal.disconnect();
  }

  async getSigner(): Promise<ethers.Signer> {
    if (!this.eip1193Provider) {
      throw new Error("No hay billetera conectada.");
    }
    const browserProvider = new ethers.BrowserProvider(this.eip1193Provider);
    return await browserProvider.getSigner();
  }

  getEip1193Provider(): any {
    return this.eip1193Provider;
  }

  async switchNetwork(): Promise<void> {
    await this.modal.switchNetwork(sepolia);
  }

  /** @deprecated El backend actual no soporta billetera centralizada. */
  getWalletBalance(): Observable<Wallet> {
    return of({
      id: 0,
      address: '',
      network: '',
      ownerUsername: '',
      balances: []
    });
  }

  /** @deprecated El backend actual no soporta historial de transacciones centralizado. */
  getTransactionHistory(page: number = 0, size: number = 10): Observable<Transaction[]> {
    return of([]);
  }

  /** @deprecated El backend actual no soporta carga centralizada. */
  loadMoney(request: any): Observable<any> {
    return of(null);
  }

  /** @deprecated El backend actual no soporta retiro centralizado. */
  withdrawMoney(request: any): Observable<any> {
    return of(null);
  }

  // --- SIWE (Sign-In with Ethereum) endpoints ---

  requestChallenge(walletAddress: string): Observable<SiweChallengeResponse> {
    return this.http.post<SiweChallengeResponse>(`${this.apiUrl}/users/me/wallet/challenge`, { walletAddress });
  }

  verifyChallenge(walletAddress: string, message: string, signature: string): Observable<SiweVerifyResponse> {
    return this.http.post<SiweVerifyResponse>(`${this.apiUrl}/users/me/wallet/verify`, {
      walletAddress,
      message,
      signature
    });
  }
}
