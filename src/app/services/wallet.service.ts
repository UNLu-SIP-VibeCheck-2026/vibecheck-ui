import { Injectable, NgZone, inject } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from "rxjs";
import { createAppKit, AppKit } from "@reown/appkit";
import { sepolia, mainnet } from "@reown/appkit/networks";
import { environment } from "../../environments/environment";
import { Wallet, Transaction } from '../models/wallet.model';
import { watchAccount, getAccount } from '@wagmi/core';
// IMPORTANTE: ahora importamos también el adaptador desde wagmi.config.
// `config` sigue existiendo y es el MISMO objeto que AppKit gestiona internamente,
// así que el resto de la app (Web3Service, etc.) no necesita cambios.
import { wagmiAdapter, config } from './wagmi.config';

export interface SiweChallengeResponse {
  message: string;
  nonce: string;
  walletAddress?: string;
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

    // FIX DOMINIO DEFINITIVO: Identificamos si estamos corriendo en la web oficial .team
    const isProd = typeof window !== 'undefined' && window.location.hostname === 'vibecheck.team';

    const metadata = {
      name: "VibeCheck UI",
      description: "VibeCheck UI Platform",
      // Mantenemos el fix de la barra final para evitar el Invalid App Configuration
      url: isProd ? "https://vibecheck.team/" : "http://localhost:4200/",
      icons: ["https://avatars.githubusercontent.com/u/179229932"],
      // FIX MULTI-WALLET: dejamos solo la URL universal para que la wallet
      // sepa a dónde regresar al usuario tras firmar.
      redirect: {
        universal: isProd ? "https://vibecheck.team" : "http://localhost:4200"
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
      adapters: [wagmiAdapter], // Usamos el adaptador que exportamos de wagmi.config.ts
      // mainnet incluida para que AppKit refleje la chain real de la wallet en mobile
      // (MetaMask suele estar en Mainnet) y el switch a Sepolia funcione. Ver wagmi.config.ts.
      networks: [sepolia, mainnet],
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
    //
    // CLAVE: el chainId lo tomamos de `account.chainId` (la chain REAL de la conexión /
    // wallet), NO de `watchChainId`/`getChainId()` que devuelve `config.state.chainId`
    // (la red que la app eligió, Sepolia por default). En mobile la wallet suele estar en
    // Mainnet mientras la app cree estar en Sepolia: usar config.state daba un falso
    // positivo (avanzaba a firmar) y luego signMessage/writeContract reventaban con
    // ConnectorChainMismatchError. watchAccount dispara también cuando cambia la chain.
    watchAccount(config, {
      onChange: (account) => {
        this.zone.run(() => {
          this.addressSubject.next(account.address || null);
          this.isConnectedSubject.next(account.isConnected || false);
          this.chainIdSubject.next(account.chainId ? Number(account.chainId) : null);
        });
      }
    });
  }

  async open(): Promise<void> {
    await this.modal.open();
  }

  /** True en navegadores móviles, donde el wallet es una app aparte y necesita deep-link. */
  private isMobile(): boolean {
    return typeof navigator !== "undefined"
      && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Recupera el deep-link (href) del wallet que el usuario eligió al conectar.
   * WalletConnect lo persiste en localStorage bajo 'WALLETCONNECT_DEEPLINK_CHOICE'.
   * Como fallback (por si AppKit usara otra clave) escaneamos cualquier clave que
   * contenga 'deeplink'. Devuelve null si no hay (p.ej. conector inyectado).
   */
  private getWalletDeepLink(): string | null {
    if (typeof localStorage === "undefined") return null;

    const readHref = (raw: string | null): string | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed?.href ?? null;
      } catch {
        // Algunas versiones guardan el href como string plano.
        return raw.includes("://") ? raw : null;
      }
    };

    // 1. Clave canónica de WalletConnect.
    const canonical = readHref(localStorage.getItem("WALLETCONNECT_DEEPLINK_CHOICE"));
    if (canonical) return canonical;

    // 2. Fallback: cualquier clave que contenga 'deeplink'.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /deeplink/i.test(key)) {
        const href = readHref(localStorage.getItem(key));
        if (href) return href;
      }
    }
    return null;
  }

  /**
   * Trae la app del wallet al frente en mobile. DEBE invocarse de forma SÍNCRONA
   * dentro del gesto del usuario (el tap), inmediatamente después de disparar
   * signMessage/writeContract. Así MetaMask aparece para mostrar la petición que
   * viaja por el relay, en vez de quedar oculta y dejar el spinner colgado.
   *
   * Usamos '_blank' (no '_self') para NO descargar la pestaña de la dApp: la página
   * sigue viva y resuelve la promesa de la firma cuando el usuario vuelve.
   *
   * No-op en desktop y cuando se conectó con un conector inyectado / in-app browser
   * (no hay deep-link guardado y no hace falta).
   */
  openWallet(): void {
    if (!this.isMobile()) return;
    const href = this.getWalletDeepLink();
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
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