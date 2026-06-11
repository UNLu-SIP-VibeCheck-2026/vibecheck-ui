import { Injectable, NgZone, inject } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from "rxjs";
import { createAppKit, AppKit } from "@reown/appkit";
import { sepolia } from "@reown/appkit/networks";
import { environment } from "../../environments/environment";
import { Wallet, Transaction } from '../models/wallet.model';
import { watchAccount, watchChainId, getAccount } from '@wagmi/core';
// IMPORTANTE: ahora importamos también el adaptador desde wagmi.config.
// `config` sigue existiendo y es el MISMO objeto que AppKit gestiona internamente,
// así que el resto de la app (Web3Service, etc.) no necesita cambios.
import { wagmiAdapter, config } from './wagmi.config';

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

  constructor() {
    this.initAppKit();
  }

  private initAppKit() {
    const projectId = environment.reownProjectId;
    // Identificamos si estamos corriendo en producción o en local
    const isProd = typeof window !== 'undefined' && window.location.hostname === 'vibecheck.lat';

    const metadata = {
      name: "VibeCheck UI",
      description: "VibeCheck UI Platform",
      // Mantenemos el fix de la barra final para evitar el Invalid App Configuration
      url: isProd ? "https://vibecheck.lat/" : "http://localhost:4200/",
      icons: ["https://avatars.githubusercontent.com/u/179229932"],
      // FIX MULTI-WALLET: dejamos solo la URL universal para que la wallet
      // sepa a dónde regresar al usuario tras firmar.
      redirect: {
        universal: isProd ? "https://vibecheck.lat" : "http://localhost:4200"
      }
    };

    // FIX REAL: AppKit v1.x no acepta `wagmiConfig`; requiere `adapters`.
    // Antes, el `as any` escondía ese error de tipos y AppKit arrancaba en modo
    // "Core" (WalletConnect interno) desconectado del config de wagmi, por lo
    // que watchAccount nunca disparaba y writeContract fallaba con
    // ConnectorNotConnectedError.
    // Nota: ya NO llamamos a reconnect(config) manualmente; createAppKit
    // reconecta la sesión existente a través del adaptador.
    this.modal = createAppKit({
      adapters: [wagmiAdapter],
      networks: [sepolia],
      defaultNetwork: sepolia,
      metadata,
      projectId,
      features: {
        analytics: true,
      },
    });

    // Sync initial state to prevent missing chainId/address on load
    const initialAccount = getAccount(config);
    this.addressSubject.next(initialAccount.address || null);
    this.isConnectedSubject.next(initialAccount.isConnected || false);
    const initialChainId = initialAccount.chainId || config.state.chainId;
    this.chainIdSubject.next(initialChainId ? Number(initialChainId) : null);

    // Subscribe to account/connection changes via Wagmi watchAccount.
    // Ahora SÍ dispara, porque `config` es el wagmiConfig del adaptador
    // (la misma instancia que usa el modal de AppKit).
    watchAccount(config, {
      onChange: (account) => {
        this.zone.run(() => {
          this.addressSubject.next(account.address || null);
          this.isConnectedSubject.next(account.isConnected || false);
        });
      }
    });

    // Subscribe to network changes via Wagmi watchChainId
    watchChainId(config, {
      onChange: (chainId) => {
        this.zone.run(() => {
          this.chainIdSubject.next(chainId ? Number(chainId) : null);
        });
      }
    });
  }

  async open(): Promise<void> {
    await this.modal.open();
  }

  async disconnect(): Promise<void> {
    await this.modal.disconnect();
  }

  getEip1193Provider(): any {
    return null; // Deprecated with Wagmi core migration
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