# DESIGN SYSTEM

Sistema de diseño extraído del diseño visual de la aplicación.
Stack: Angular 19 + Angular Material 3 — Dark theme only.

---

## 1. COLORES

### Paleta base M3

| Token M3 | CSS Var | Hex | Uso |
|---|---|---|---|
| `primary` | `--md-sys-color-primary` | `#a855f7` | Acento principal, inicio de gradientes |
| `on-primary` | `--md-sys-color-on-primary` | `#ffffff` | Texto sobre primary |
| `primary-container` | `--md-sys-color-primary-container` | `#1a1535` | Fondo de icon containers |
| `on-primary-container` | `--md-sys-color-on-primary-container` | `#ffffff` | Texto dentro de containers |
| `secondary` | `--md-sys-color-secondary` | `#f97316` | Punto medio del gradiente decorativo |
| `tertiary` | `--md-sys-color-tertiary` | `#fbbf24` | Fin del gradiente, acento cálido |
| `error` | `--md-sys-color-error` | `#f87171` | Estados de error |
| `background` | `--md-sys-color-background` | `#0d0b1e` | Fondo base de página |
| `surface` | `--md-sys-color-surface` | `#12102a` | Superficie de cards y contenedores |
| `surface-variant` | `--md-sys-color-surface-variant` | `#1a1535` | Variante de superficie, chips |
| `on-background` | `--md-sys-color-on-background` | `#ffffff` | Texto principal sobre background |
| `on-surface` | `--md-sys-color-on-surface` | `#ffffff` | Texto sobre surface |
| `on-surface-variant` | `--md-sys-color-on-surface-variant` | `#9ca3af` | Texto secundario, labels, muted |
| `outline` | `--md-sys-color-outline` | `rgba(255,255,255,0.2)` | Bordes de chips outlined |
| `outline-variant` | `--md-sys-color-outline-variant` | `rgba(255,255,255,0.08)` | Separadores, divisores sutiles |

### Gradientes (no nativos en M3 — definidos como tokens custom)

| Token | Valor | Uso |
|---|---|---|
| `--gradient-brand` | `linear-gradient(90deg, #a855f7, #f97316, #fbbf24)` | Botones CTA, bordes decorativos, footer bar |
| `--gradient-background` | `radial-gradient(ellipse at 20% 50%, #1a1535 0%, #0d0b1e 70%)` | Background de página completa |
| `--gradient-surface` | `radial-gradient(ellipse at 30% 40%, #1a1535 0%, #0a0918 100%)` | Background alternativo de secciones |

---

## 2. TIPOGRAFÍA

**Familia display:** Bebas Neue (fallback: Barlow Condensed, sans-serif)
**Familia UI/body:** Geist Sans o Outfit (fallback: sans-serif)
**Familia monospace/botón especial:** Space Mono o JetBrains Mono

| Rol M3 | Familia | Tamaño | Peso | Transform | Letter-spacing | Uso |
|---|---|---|---|---|---|---|
| `display-large` | Bebas Neue | 72px | 400 (Bebas es inherentemente bold) | uppercase | 0.02em | Títulos hero grandes |
| `display-medium` | Bebas Neue | 56px | 400 | uppercase | 0.02em | Títulos de sección grandes |
| `headline-large` | Outfit | 32px | 700 | none | 0 | Títulos de card, nombres |
| `headline-medium` | Outfit | 24px | 700 | none | 0 | Subtítulos principales |
| `title-large` | Outfit | 22px | 600 | none | 0 | Títulos de lista |
| `title-medium` | Outfit | 16px | 600 | none | 0 | Labels de sección |
| `body-large` | Outfit | 16px | 400 | none | 0 | Cuerpo de texto principal |
| `body-medium` | Outfit | 14px | 400 | none | 0 | Texto secundario |
| `label-large` | Outfit | 12px | 700 | uppercase | 0.08em | Chips, badges, botones outlined |
| `label-medium` | Outfit | 11px | 500 | uppercase | 0.06em | Labels pequeños, TEXT2 style |
| `label-small` | Space Mono | 14px | 400 | uppercase | 0.15em | Texto de botón CTA especial (Botón 2) |

---

## 3. BORDER RADIUS

| Componente | Token M3 | Valor |
|---|---|---|
| Icon container / App icon | `--md-sys-shape-corner-extra-large` | 24px |
| Botón CTA pill (grande) | `--md-sys-shape-corner-full` | 50px |
| Chips / Badges sociales | `--md-sys-shape-corner-full` | 50px |
| Cards | `--md-sys-shape-corner-medium` | 12px |
| Botones estándar M3 | `--md-sys-shape-corner-full` | 20px |
| Dialogs | `--md-sys-shape-corner-extra-large` | 28px |
| Snackbars | `--md-sys-shape-corner-extra-small` | 4px |

---

## 4. ELEVACIÓN Y SOMBRAS

El diseño usa un esquema **flat sobre gradiente** — sin box-shadows visibles.
La profundidad se genera por contraste de color entre capas.

| Nivel | Valor | Uso |
|---|---|---|
| `elevation-0` | `none` | Background, elementos base |
| `elevation-1` | `none` (color surface diferente) | Cards sobre background |
| `elevation-overlay` | `rgba(168,85,247,0.06)` | Hover state sobre surface |

**Regla:** No usar `box-shadow`. El depth se consigue con `background-color` diferenciado entre capas.

---

## 5. ESPACIADO

Base unit: **8px**

| Token | Valor | Uso |
|---|---|---|
| `--space-1` | 4px | Micro gaps, icon padding interno |
| `--space-2` | 8px | Gap entre elementos inline |
| `--space-3` | 12px | Padding interno de chips |
| `--space-4` | 16px | Padding de componentes M3 |
| `--space-5` | 24px | Padding lateral mobile, gap entre cards |
| `--space-6` | 32px | Padding de secciones |
| `--space-8` | 48px | Separación entre bloques |
| `--space-10` | 64px | Padding lateral desktop |
| `--space-12` | 80px | Separación entre secciones grandes |

---

## 6. COMPONENTES — REGLAS DE USO

### Botón CTA principal (Botón 2 style)
- Fondo: `--gradient-brand`
- Border radius: `50px` (pill)
- Icono a la izquierda en círculo con fondo `primary-container`
- Texto: `label-small` (Space Mono, uppercase, letter-spacing amplio)
- Sin borde
- No usar `mat-flat-button` nativo — requiere custom component con gradiente

### Chips sociales (YOUTUBE, INSTAGRAM...)
- Variante: `mat-chip` outlined
- Border: `1px solid rgba(255,255,255,0.25)`
- Background: `transparent`
- Texto: `label-large` (uppercase, bold)
- Hover: border `rgba(255,255,255,0.5)`

### Icon container (App icon)
- Border: `2px solid` con `--gradient-brand` (requiere SVG border trick o pseudo-elemento)
- Background: `primary-container` (`#1a1535`)
- Border radius: `24px`

### Footer bar decorativa
- `height: 4px`
- Background: `--gradient-brand`
- Position: `fixed bottom` o al final del scroll

### Links
- Color: `#ffffff`
- Text-decoration: `underline`
- Sin hover color change — solo opacity transition

---

## 7. BREAKPOINTS

| Nombre | Valor | Uso |
|---|---|---|
| `mobile` | < 600px | Layout single column, padding 24px |
| `tablet` | 600px – 1024px | Layout 2 col, padding 48px |
| `desktop` | > 1024px | Layout multi-col, padding 64px |

---

## 8. NOTAS DE IMPLEMENTACIÓN ANGULAR MATERIAL 3

- Tema: **dark** (`theme-type: dark`)
- El gradiente de fondo va en `body` o en el componente root, no en Material
- Los componentes con gradiente (`--gradient-brand`) deben ser **custom components** — Angular Material no soporta gradientes en botones nativamente; usar `::ng-deep` o encapsulación ViewEncapsulation.None con precaución
- Para el border degradado del icon container: usar `border-image` o pseudo-elemento `::before` con gradiente y `border-radius` con `clip-path`
- Importar fuentes desde Google Fonts: `Bebas Neue`, `Outfit`, `Space Mono`
