// Polyfills de Node para el browser.
// WalletConnect / viem / @reown usan globals de Node (Buffer, global, process) que no
// existen nativamente en el navegador. En Safari/iOS esto falla al conectar un wallet
// por WalletConnect con: "Can't find variable: Buffer".
//
// Debe ejecutarse ANTES de que cargue AppKit, por eso se registra en angular.json
// dentro de "polyfills" (el bundle de polyfills corre antes que main.ts).
import { Buffer } from "buffer";

(globalThis as any).global = globalThis;
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;
(globalThis as any).process = (globalThis as any).process || { env: {} };
