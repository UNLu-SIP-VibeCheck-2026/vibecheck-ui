# VibeCheck — Fix de WalletConnect / AppKit en Mobile (deep-linking, Buffer y sockets)

> Documento de handoff. Fecha: 2026-06-14. Generado durante una sesión de análisis + fixes con Claude Code.
> Objetivo: poder **retomar el trabajo y testear desde Fedora 44** sin perder contexto.

---

## 1. Contexto del proyecto

- **VibeCheck**: plataforma Web3 de venta de entradas en formato NFT.
- **Frontend**: Angular 19 (standalone, sin SSR), `@reown/appkit` `^1.8.20` + `@reown/appkit-adapter-wagmi`, `@wagmi/core` `^2`, `viem` `^2`.
- **Backend**: Spring Boot + Liquibase. SIWE (EIP-4361) para vincular billetera (`/users/me/wallet/challenge` y `/users/me/wallet/verify`).
- **Red**: Sepolia (`chainId 11155111`).
- **Dominio prod**: https://vibecheck.team
- **Repos locales**: `vibecheck-ui` (frontend, donde están todos estos cambios) y `vibecheck-core`.

---

## 2. El problema reportado

En **desktop** funciona todo. En **mobile** (Safari iOS / Chrome Android) hay DOS fallos:

1. **Al conectar**: el modal "Connect Wallet" abre, pero al tocar cualquier billetera tira
   **`Can't find variable: Buffer`** y no conecta.
2. **Al firmar/pagar** (SIWE "Firmar y Vincular", compras, listings, swaps): spinner infinito.
   MetaMask **nunca pasa a primer plano** para mostrar la firma/transacción.

---

## 3. Diagnóstico (causa raíz)

### 3.1. `Can't find variable: Buffer` (bloqueante de conexión en mobile)
WalletConnect/viem usan globals de Node (`Buffer`, `global`, `process`) que **no existen** en el browser.
El `angular.json` solo tenía `"polyfills": ["zone.js"]` → no había polyfill de `Buffer`.

**Por qué solo fallaba en mobile:** en desktop usás la **extensión** de MetaMask = conector *inyectado*,
que no toca el crypto de WalletConnect. En mobile el modal usa **WalletConnect**, cuyo handshake instancia
`Buffer` → Safari corta con ese error.

### 3.2. Deep-link no despierta a MetaMask en la firma/transacción
- La **conexión** funciona porque el modal de AppKit hace el `window.open(deeplink)` **síncrono dentro del tap**
  sobre la billetera elegida → iOS/Android permiten el salto a la app (gesto válido).
- La **firma/transacción** se hace con `@wagmi/core` (`signMessage` / `writeContract`) **fuera del modal**.
  El deep-link que trae MetaMask al frente se emite muy adentro del provider de WalletConnect, **después de
  varios `await` internos** (`getConnectorClient` → `getProvider` → `request` → publish al relay → redirect).
  Para entonces el "user activation" del tap **ya expiró** → iOS/Android **bloquean** el salto a MetaMask.
  La request SÍ viaja por el relay (websocket), pero MetaMask queda oculta y el spinner espera para siempre.
- El intento previo del equipo (precargar challenge, no usar `async/await`, `.then()`) ataca la capa equivocada:
  **`signMessage` es async por dentro**, así que el gesto se pierde igual.

**Prueba que confirma esto:** en mobile, tocar firmar/comprar y luego **abrir MetaMask manualmente** →
la petición está ahí esperando. Eso prueba que se relayeó pero faltó el foreground.

### 3.3. (Secundario) Sockets del relay suspendidos en iOS
Al saltar a MetaMask, el tab queda en background e iOS puede **suspender el WebSocket** del relay.
Al volver, la respuesta firmada puede no llegar → spinner. Aparece **recién** una vez resuelto el deep-link.

---

## 4. La estrategia de fix

Para cada interacción con el wallet en mobile: **traer MetaMask al frente nosotros mismos, de forma síncrona
dentro del tap**, justo después de despachar la request (sin esperar al deep-link interno de WC, que llega tarde).

Helper central `WalletService.openWallet()`:
- No-op en desktop y con conector inyectado (in-app browser).
- En mobile lee el deep-link guardado por WC (`WALLETCONNECT_DEEPLINK_CHOICE` en `localStorage`, con fallback
  por si AppKit usa otra clave) y hace `window.open(href, '_blank')` (`_blank` para **no descargar** la pestaña
  de la dApp, así resuelve la promesa al volver).

Clave: el body de una función `async` corre **síncrono hasta el primer `await`**. Por eso `openWallet()` se llama
**antes** del `await` (después de despachar `signMessage`/`writeContract`), quedando dentro del gesto.

---

## 5. Cambios YA APLICADOS (en esta sesión)

### Fix Buffer (Sección 3.1)
| Archivo | Cambio |
|---|---|
| `src/polyfills.ts` | **NUEVO**. Define `global`, `Buffer` y `process` en el browser. |
| `angular.json` | Agrega `"src/polyfills.ts"` a `polyfills` (en `build` y en `test`). |
| `package.json` | Agrega dependencia `"buffer": "^6.0.3"`. |

### Helper central (Sección 4)
| Archivo | Cambio |
|---|---|
| `src/app/services/wallet.service.ts` | Métodos nuevos: `isMobile()`, `getWalletDeepLink()`, `openWallet()`. |
| `src/app/services/web3.service.ts` | Passthrough `openWallet()` + wrapper privado `writeWithRedirect()`. |

### Fase 1 — Firma SIWE (single signature)
En cada handler se separa la promesa, se dispara `signMessage`, se llama `openWallet()` en el mismo tick y luego `.then()`:
- `src/app/components/wallet/web3-wallet/web3-wallet.component.ts` → `linkWallet()`
- `src/app/components/select-tickets/select-tickets.component.ts` → `signAndVerify()`
- `src/app/components/marketplace-detail/marketplace-detail.component.ts` → `signAndVerify()`
- `src/app/components/advertise-event/advertise-event.component.ts` → `signAndVerify()`

### Fase 2 — Transacciones (centralizado)
- `src/app/services/web3.service.ts`: **TODOS** los `writeContract(config, …)` ahora pasan por
  `this.writeWithRedirect({...})` (15 sitios: buy USDC/VBK, list, cancel, gift, approve*, swap, launchEvent,
  refund). Cada uno foregroundea MetaMask dentro del gesto. También `sendFunds` (ETH `sendTransaction`).
- `src/app/services/token-approval.service.ts`: `ensureAllowance()` llama `openWallet()` tras despachar el approve.

**Qué queda 100% resuelto con esto (flujos de UNA sola escritura, sin lectura previa en el tap):**
- Vinculación SIWE (Fase 1).
- Cancelar listing (`cancel-listing`).
- Enviar fondos (ETH/VBK/USDC) desde la wallet.
- El **primer** write de compras y swaps (el `approve`) — ver limitación abajo.

---

## 6. ⏳ PENDIENTE (Fase 3 y 4) — requiere implementar + TESTEAR en device

> **ACTUALIZACIÓN 2026-06-18:** la **Fase 3 (3.A + 3.B) ya está IMPLEMENTADA** (falta TESTEAR en
> device real). Estrategia elegida: **combinar precarga + approval infinito (maxUint256) + two-tap**.
> La **Fase 4 NO se implementó** (se deja para después del test en celu, como sugería el doc).
>
> Cómo quedó el patrón (uniforme en los 5 componentes):
> - **Precarga (3.A):** las lecturas que rompían el gesto (`getNftApproved`, `getNftOwner`,
>   `allowance`, quotes VBK, validación del destinatario en gift) se movieron a cuando carga el
>   componente / se selecciona el ticket o destinatario. El tap ya NO hace ningún `await` previo.
> - **Approval infinito (3.B):** todos los `approve` de ERC20 ahora son `maxUint256`
>   (`web3Service.approveErc20Max(token, spender)`). Así, una vez aprobado, las compras/swaps
>   siguientes saltan el approve y son **un único write en un solo tap**.
> - **Two-tap de fallback:** la PRIMERA vez (cuando falta allowance/approval), el tap dispara solo
>   el approve (gesto intacto → `openWallet` abre MetaMask). Al confirmarse, un snackbar pide
>   "tocá el botón de nuevo"; el segundo tap encuentra la allowance OK y hace el write final.
>   En gift, que tiene 2 approvals (NFT per-token + USDC fee), pueden ser hasta 3 taps la 1ª vez.
> - **Métodos nuevos en `web3.service.ts`:** `getErc20Allowance`, `approveErc20Max`,
>   `usdcOfferingAmount`, `vbkOfferingMaxAmount`, `buyOfferingWithUSDC/VBK` (solo el buy, split del
>   approve), `buyMarketplaceWithUSDC/VBK`, `MAX_UINT256`. `marketplace-detail` dejó de usar
>   `writeContract` directo y `TokenApprovalService` (ahora rutea por el service → dispara `openWallet`).
>
> ⚠️ A VALIDAR en device (ver checklist Sección 7): que los contratos de test (USDC `0x1c7D…`,
> VBK `0xF84c…`) acepten `approve(maxUint256)` sin revertir, y que el flujo de re-tap se sienta bien.
>
> El texto de abajo (3.A/3.B/4) es el **approach original** que se siguió; se deja como referencia.

### Fase 3.A — Lecturas antes del primer write (rompen el gesto)
Estos handlers hacen `await` de una **lectura** (o HTTP) ANTES del primer write, así que el gesto ya está perdido
cuando llega `openWallet()`:

| Componente | Lectura que rompe el gesto | Método |
|---|---|---|
| `create-listing.component.ts` | `await getNftApproved(...)` | `onSubmit()` |
| `gift-ticket.component.ts` | `await getNftOwner(...)`, `await getNftApproved(...)` (+ HTTP `validateGift`) | `confirmGift()` / `executeOnChainGiftFlow()` |
| `marketplace-detail.component.ts` | `await getUsdcAllowance(...)` + `ensureAllowance()` | `executePurchase()` |

**Fix:** mover esas lecturas a una **precarga** (igual que ya se hace con el challenge SIWE): correrlas cuando
se carga el componente / se selecciona el ticket, guardar el resultado en una propiedad, y que el tap vaya
**directo al write**. Ejemplo (marketplace-detail):
```ts
// Precargar al cargar el listing (NO en el tap):
private preloadedAllowanceOk = false;
private preloadAllowance() {
  const w = this.connectedAddress(); if (!w) return;
  this.web3Service.getUsdcAllowance(w, this.web3Service.NFT_MARKETPLACE_ADDRESS)
    .then(a => this.preloadedAllowanceOk = a >= /*monto*/ 0n);
}
// En executePurchase(): si preloadedAllowanceOk, saltar approve y disparar el buy directo (gesto intacto).
```

### Fase 3.B — Segundo write en flujos multi-paso (approve → buy/swap/list)
El segundo write ocurre **después** de `waitForTransactionReceipt` del approve → **sin gesto** → `openWallet()`
queda bloqueado. Afecta: compra de tickets (`buyTicketWithUSDC/VBK`), swaps (`onConvert`/`onSell`),
listing (`approveNft` → `list`), gift (`approveNft` → `gift`).

**Dos opciones (recomiendo combinar):**
1. **Approval infinito (`maxUint256`)**: aprobar una vez el máximo, así las compras/swaps siguientes son
   **un solo write** (que ya queda resuelto por la Fase 2). ⚠️ Es un trade-off de seguridad conocido
   (allowance ilimitada al contrato) y algunos tokens revierten al cambiar un allowance no-cero —
   **validar con los contratos de test** (USDC `0x1c7D…`, VBK `0xF84c…`).
2. **Partir en taps**: tras confirmar el approve, mostrar botón **"Confirmar compra/swap"** (nuevo gesto) que
   dispare el segundo write + `openWallet()`. Requiere cambios de template (HTML) en cada componente.

> Mientras tanto, el segundo paso es **recuperable manualmente**: la request se relayea, el usuario puede abrir
> MetaMask a mano y aprobarla. No es spinner "muerto" si esperás.

### Fase 4 — Resiliencia del relay/socket (Sección 3.3)
- Agregar listener `visibilitychange` que, al volver a `visible`, fuerce reconexión/ping del provider WC.
  (AppKit oculta el provider; habría que acceder vía `wagmiAdapter`/connector — investigar API.)
- Agregar **timeout + reintento** a `signMessage`/`writeContract`: si en ~60s no resuelve, mostrar
  "Reabrir MetaMask" en lugar de spinner infinito.
- Implementar **solo si** tras Fase 1/2 persiste el síntoma de "la firma llega pero la dApp sigue colgada".

---

## 7. Cómo buildear y probar

```bash
cd vibecheck-ui
npm install      # baja "buffer" y ACTUALIZA package-lock.json
npm run build    # o: npm start  (ng serve)  para local
```

**Deploy / CI (Docker):** se agregó `buffer` a `package.json`, así que `package-lock.json` quedó desactualizado.
- Si el build usa **`npm ci`** → **va a fallar** hasta commitear el `package-lock.json` actualizado.
- Con `npm install` en el Dockerfile no hay problema.

### Verificación de la clave del deep-link (importante)
El helper ya tiene fallback, pero conviene confirmar el dato real. En el celu, **tras conectar el wallet**,
en la consola del browser:
```js
Object.keys(localStorage).filter(k => /deeplink/i.test(k))
  .forEach(k => console.log(k, localStorage.getItem(k)));
```
Esperado: `WALLETCONNECT_DEEPLINK_CHOICE` → `{"href":"...","name":"MetaMask"}`.
Si la clave es otra, pasársela a Claude para ajustar `getWalletDeepLink()` en `wallet.service.ts`.

### Checklist de testing (device real, MetaMask instalada)
- [ ] **Conectar** wallet en mobile → ya NO aparece `Can't find variable: Buffer`; conecta y vuelve enlazado.
- [ ] **Vincular (SIWE)**: "Firmar y Vincular" → MetaMask abre solo, firma, vuelve vinculado.
- [ ] **Cancelar listing** → MetaMask abre solo, confirma.
- [ ] **Enviar fondos** (ETH/USDC/VBK) → MetaMask abre solo.
- [ ] **Comprar ticket** (USDC y VBK): el **approve** abre MetaMask solo. (El **buy** quizá requiera reabrir
      MetaMask a mano hasta implementar Fase 3.B.)
- [ ] **Swap** USDC↔VBK: idem (approve OK, swap = manual hasta Fase 3.B).
- [ ] **Crear listing / regalar**: hoy rompen el gesto por lectura previa (Fase 3.A pendiente).
- [ ] Caso borde: **rechazar** la firma/tx en MetaMask → la dApp muestra error, NO spinner infinito.
- [ ] Caso borde: dApp **dentro del browser in-app de MetaMask** (conector inyectado) → `openWallet()` es no-op
      y todo funciona.

---

## 8. Cómo retomar la conversación con Claude Code (desde Fedora)

1. Abrí Claude Code en el repo `vibecheck-ui` (o en el workspace que tenga `vibecheck-ui` y `vibecheck-core`).
2. Pegale este prompt de arranque:

   > Estoy retomando el fix de WalletConnect/AppKit en mobile de VibeCheck. Leé
   > `MOBILE_WALLETCONNECT_FIX.md` en la raíz de vibecheck-ui: tiene el diagnóstico y lo ya aplicado
   > (Buffer polyfill, helper `openWallet`, Fase 1 SIWE y Fase 2 transacciones centralizadas).
   > Ya pude buildear y testear en el celu. Resultados del testing: [PEGAR QUÉ ANDUVO Y QUÉ NO].
   > La clave de deep-link en localStorage es: [PEGAR lo que devolvió el snippet de la Sección 7].
   > Seguí con la **Fase 3** (3.A precarga de lecturas y 3.B segundo write / approval infinito) y,
   > si hace falta, la **Fase 4** (sockets). No cambies nada sin que lo revise primero.

3. Si algo no compila, pasale el error de `npm run build`.

---

## 9. Mapa de archivos tocados en esta sesión

```
vibecheck-ui/
├── angular.json                         (+ polyfills: src/polyfills.ts)
├── package.json                         (+ buffer ^6.0.3)
├── src/
│   ├── polyfills.ts                     (NUEVO — Buffer/global/process)
│   └── app/
│       ├── services/
│       │   ├── wallet.service.ts        (isMobile/getWalletDeepLink/openWallet)
│       │   ├── web3.service.ts          (openWallet passthrough + writeWithRedirect + sendFunds)
│       │   └── token-approval.service.ts(openWallet en ensureAllowance)
│       └── components/
│           ├── wallet/web3-wallet/web3-wallet.component.ts   (SIWE)
│           ├── select-tickets/select-tickets.component.ts    (SIWE)
│           ├── marketplace-detail/marketplace-detail.component.ts (SIWE)
│           └── advertise-event/advertise-event.component.ts  (SIWE)
└── MOBILE_WALLETCONNECT_FIX.md          (este documento)
```

### Pendientes de tocar (Fase 3/4)
```
src/app/components/create-listing/create-listing.component.ts    (Fase 3.A precarga + 3.B)
src/app/components/gift-ticket/gift-ticket.component.ts          (Fase 3.A precarga + 3.B)
src/app/components/marketplace-detail/marketplace-detail.component.ts (Fase 3.A precarga buy)
src/app/components/select-tickets/select-tickets.component.ts    (Fase 3.B segundo write)
src/app/components/swap/swap.component.ts                        (Fase 3.B segundo write)
src/app/services/web3.service.ts                                 (approval infinito opcional)
src/app/services/wallet.service.ts                              (Fase 4 visibilitychange/reconnect)
```

---

## 10. Notas / decisiones

- **No se commiteó nada** (estabas en `main`). Conviene branchear antes de commitear.
- `openWallet()` usa `window.open(href, '_blank')` a propósito (no `_self`) para no matar la pestaña de la dApp.
- El fix de gesto **no se puede resolver desde adentro de `signMessage`/`writeContract`** (son async por dentro);
  por eso el `openWallet()` va en el call-site / wrapper, antes del primer `await`.
- Si en el futuro se migra a la API SIWE/SIWX nativa de AppKit, AppKit manejaría firma + deep-link por su modal,
  pero requiere adaptar el backend al formato de AppKit (refactor mayor, no recomendado ahora).
