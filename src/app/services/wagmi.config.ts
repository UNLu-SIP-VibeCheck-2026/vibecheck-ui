import { createConfig, http } from '@wagmi/core';
import { sepolia } from '@wagmi/core/chains';
import { environment } from '../../environments/environment'; // <-- CORRECCIÓN: Esto repara el error en rojo de la línea 9

export const config = createConfig({
  chains: [sepolia],
  // FIX DEFINITIVO PARA VERCEL: Dejamos el array vacío. 
  // AppKit se encarga de inyectar dinámicamente el puente de WalletConnect en caliente.
  connectors: [],
  transports: {
    [sepolia.id]: http(),
  },
});