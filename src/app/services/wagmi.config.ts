import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { sepolia } from '@reown/appkit/networks';
import { environment } from '../../environments/environment';

// FIX REAL: el config de wagmi tiene que salir DEL adaptador de AppKit,
// no crearse por separado con createConfig + connectors: [].
// El WagmiAdapter registra automáticamente los conectores correctos
// (injected/MetaMask, WalletConnect, Coinbase) y comparte la misma
// instancia de config con el modal de AppKit: una sola fuente de verdad.
export const wagmiAdapter = new WagmiAdapter({
  networks: [sepolia],
  projectId: environment.reownProjectId,
});

// Este export se mantiene con el mismo nombre para que Web3Service y el
// resto de la app sigan funcionando sin cambios: readContract, writeContract,
// watchAccount, etc. reciben este `config`.
export const config = wagmiAdapter.wagmiConfig;