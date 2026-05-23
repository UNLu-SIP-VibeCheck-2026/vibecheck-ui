import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ethers } from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private zone = inject(NgZone);

  private provider: ethers.BrowserProvider | null = null;

  private connectedAddressSubject = new BehaviorSubject<string | null>(null);
  connectedAddress$ = this.connectedAddressSubject.asObservable();

  private ethBalanceSubject = new BehaviorSubject<string>('0');
  ethBalance$ = this.ethBalanceSubject.asObservable();

  private vbkBalanceSubject = new BehaviorSubject<string>('0');
  vbkBalance$ = this.vbkBalanceSubject.asObservable();

  private usdcBalanceSubject = new BehaviorSubject<string>('0');
  usdcBalance$ = this.usdcBalanceSubject.asObservable();

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  isConnected$ = this.isConnectedSubject.asObservable();

  private isSepoliaSubject = new BehaviorSubject<boolean>(false);
  isSepolia$ = this.isSepoliaSubject.asObservable();

  // Smart Contract Addresses
  private readonly VBK_ADDRESS = '0x68ec4adD5D3D615a86D56615DDED79B2326037aB';
  // Standard Sepolia USDC contract address (Circle official / widely used Sepolia Aave)
  private readonly USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

  private readonly SEPOLIA_CHAIN_ID = '0xaa36a7'; // Chain ID 11155111 en hexadecimal

  private readonly ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint256 amount) returns (bool)'
  ];

  constructor() {
    this.checkIfWalletIsConnected();
    this.setupListeners();
  }

  private get ethereum(): any {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return null;
  }

  isMetaMaskInstalled(): boolean {
    return !!this.ethereum;
  }

  async connectWallet(): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask no está instalado.');
    }

    try {
      this.provider = new ethers.BrowserProvider(this.ethereum);
      const accounts = await this.provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        await this.handleAccountsChanged(accounts);
      }
    } catch (error) {
      console.error('Error conectando a MetaMask:', error);
      throw error;
    }
  }

  async checkNetwork(): Promise<boolean> {
    if (!this.ethereum) return false;

    try {
      const chainId = await this.ethereum.request({ method: 'eth_chainId' });
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
      console.error('Error chequeando la red:', error);
      return false;
    }
  }

  async switchToSepolia(): Promise<void> {
    if (!this.ethereum) return;
    try {
      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Código 4902 indica que la red no está agregada en MetaMask
      if (switchError.code === 4902) {
        try {
          await this.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: this.SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.ankr.com/eth_sepolia'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error agregando la red Sepolia:', addError);
          throw addError;
        }
      } else {
        console.error('Error cambiando a la red Sepolia:', switchError);
        throw switchError;
      }
    }
  }

  async updateBalances(address: string): Promise<void> {
    if (!this.provider) {
      this.provider = new ethers.BrowserProvider(this.ethereum);
    }

    try {
      // 1. Balance de ETH Sepolia (Gas)
      const ethBal = await this.provider.getBalance(address);
      const formattedEth = ethers.formatEther(ethBal);

      // 2. Balance del token VBK (ERC-20)
      let formattedVbk = '0';
      try {
        const vbkContract = new ethers.Contract(this.VBK_ADDRESS, this.ERC20_ABI, this.provider);
        const vbkBal = await vbkContract['balanceOf'](address);
        formattedVbk = ethers.formatEther(vbkBal);
      } catch (err) {
        console.error('Error obteniendo balance de VBK:', err);
      }

      // 3. Balance de USDC en Sepolia (ERC-20)
      let formattedUsdc = '0';
      try {
        const usdcContract = new ethers.Contract(this.USDC_ADDRESS, this.ERC20_ABI, this.provider);
        const usdcBal = await usdcContract['balanceOf'](address);
        const decimals = await usdcContract['decimals']().catch(() => 6);
        formattedUsdc = ethers.formatUnits(usdcBal, decimals);
      } catch (err) {
        console.error('Error obteniendo balance de USDC:', err);
      }

      this.zone.run(() => {
        this.ethBalanceSubject.next(parseFloat(formattedEth).toFixed(4));
        this.vbkBalanceSubject.next(parseFloat(formattedVbk).toFixed(2));
        this.usdcBalanceSubject.next(parseFloat(formattedUsdc).toFixed(2));
      });
    } catch (error) {
      console.error('Error actualizando balances:', error);
    }
  }

  async sendFunds(to: string, amount: string, asset: 'ETH' | 'VBK' | 'USDC'): Promise<string> {
    if (!this.provider) {
      throw new Error('No hay proveedor de Web3 conectado.');
    }

    const signer = await this.provider.getSigner();

    if (asset === 'ETH') {
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount)
      });
      return tx.hash;
    } else {
      let contractAddress = '';
      let decimals = 18;

      if (asset === 'VBK') {
        contractAddress = this.VBK_ADDRESS;
        decimals = 18; // VBK is 18 decimals
      } else if (asset === 'USDC') {
        contractAddress = this.USDC_ADDRESS;
        decimals = 6; // USDC is typically 6 decimals
      }

      const tokenContract = new ethers.Contract(contractAddress, this.ERC20_ABI, signer);
      const amountInWei = ethers.parseUnits(amount, decimals);
      const tx = await tokenContract['transfer'](to, amountInWei);
      return tx.hash;
    }
  }

  private async checkIfWalletIsConnected() {
    if (!this.ethereum) return;

    try {
      this.provider = new ethers.BrowserProvider(this.ethereum);
      const accounts = await this.provider.send('eth_accounts', []);
      if (accounts.length > 0) {
        await this.handleAccountsChanged(accounts);
      }
    } catch (error) {
      console.error('Error verificando conexión previa:', error);
    }
  }

  private setupListeners() {
    if (!this.ethereum) return;

    this.ethereum.on('accountsChanged', (accounts: string[]) => {
      this.zone.run(async () => {
        await this.handleAccountsChanged(accounts);
      });
    });

    this.ethereum.on('chainChanged', () => {
      this.zone.run(() => {
        window.location.reload();
      });
    });
  }

  private async handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      this.connectedAddressSubject.next(null);
      this.isConnectedSubject.next(false);
      this.ethBalanceSubject.next('0');
      this.vbkBalanceSubject.next('0');
      this.usdcBalanceSubject.next('0');
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
