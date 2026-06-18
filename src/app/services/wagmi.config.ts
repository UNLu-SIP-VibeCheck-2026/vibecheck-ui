import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { sepolia, mainnet } from '@reown/appkit/networks';
import { environment } from '../../environments/environment';

// El WagmiAdapter registra automáticamente los conectores nativos y de WalletConnect.
// Es una sola fuente de verdad para el modal y para Wagmi Core.
//
// IMPORTANTE: incluimos `mainnet` además de `sepolia` aunque la app sea Sepolia-only.
// En mobile, MetaMask suele conectarse en Mainnet (chain 1). Si esa chain NO está en la
// config, wagmi queda desincronizado (cree estar en Sepolia mientras el connector está en
// Mainnet) y `signMessage`/`writeContract` revientan con ConnectorChainMismatchError.
// Configurando ambas, wagmi refleja la chain real y el guard de red (switchToSepolia)
// puede pedir el cambio de verdad. Sepolia sigue siendo la red por defecto.
export const wagmiAdapter = new WagmiAdapter({
  networks: [sepolia, mainnet],
  projectId: environment.reownProjectId,
});

// Mantenemos este export para que Web3Service y las funciones core de Wagmi
// (signMessage, writeContract, etc.) sigan recibiendo la configuración sin romperse.
export const config = wagmiAdapter.wagmiConfig;