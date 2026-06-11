import { createConfig, http } from '@wagmi/core';
import { sepolia } from '@wagmi/core/chains';
import { walletConnect } from '@wagmi/core/connectors';
import { environment } from '../../environments/environment'; // Asegurate de que la ruta a tus environments sea la correcta

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    walletConnect({
      projectId: environment.reownProjectId,
      showQrModal: false // Lo dejamos en false porque AppKit (Web3Modal) maneja su propia interfaz visual
    }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
});