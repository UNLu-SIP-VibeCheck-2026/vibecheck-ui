import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { sepolia } from '@reown/appkit/networks';
import { environment } from '../../environments/environment';

// El WagmiAdapter registra automáticamente los conectores nativos y de WalletConnect.
// Es una sola fuente de verdad para el modal y para Wagmi Core.
export const wagmiAdapter = new WagmiAdapter({
  networks: [sepolia],
  projectId: environment.reownProjectId,
});

// Mantenemos este export para que Web3Service y las funciones core de Wagmi
// (signMessage, writeContract, etc.) sigan recibiendo la configuración sin romperse.
export const config = wagmiAdapter.wagmiConfig;