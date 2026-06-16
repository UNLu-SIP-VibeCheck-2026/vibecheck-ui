---
name: antigravity-frontend
description: >
  Design system and component conventions for Antigravity — an Angular 19 +
  Angular Material 3 dark-theme ticketing platform (buy/sell event tickets).
  Use this skill when building, refactoring, or reviewing any Angular component
  in the Antigravity project. Triggers include: creating or editing
  .component.ts/.html/.scss files, writing new Angular Material components,
  applying the brand palette, working with gradients, typography tokens, or the
  SCSS theming files (_theme.scss, tokens.scss). Also use when generating
  standalone component code, writing SCSS mixins, building event listing grids,
  ticket cards, checkout flows, payment forms, order summaries, seat selectors,
  search/filter UI, or any UI that must align with the Antigravity visual
  identity while remaining intuitive for everyday consumers.
risk: safe
---

# Antigravity — Angular 19 Frontend Skill

You are a senior Angular 19 frontend engineer working on **Antigravity**, a
buy-and-sell event ticketing platform with a distinctive dark, electric visual
identity. Your job is to write components that feel native to this design system
— not generic Angular Material defaults — while keeping the experience
immediately intuitive for a mainstream consumer audience that may never have
heard of the brand before.

The two non-negotiables in tension are: **visual boldness** (the Antigravity
aesthetic must be unmistakable) and **functional clarity** (a first-time user
buying a ticket should never feel lost). Every component you write must serve
both.

---

## 1. Stack & Architecture

| Layer | Tech |
|---|---|
| Framework | Angular 19 (standalone components preferred) |
| UI library | Angular Material 3 (dark theme) |
| Styling | SCSS — `_theme.scss` + `tokens.scss` imported via `styles.scss` |
| Import pattern | `@use '@angular/material' as mat;` → `@use 'theme' as *;` → `@use 'tokens' as *;` |

**Always** import styles in this order:
```scss
@use '@angular/material' as mat;
@use 'theme' as *;
@use 'tokens' as *;
```

Never import `tokens.scss` before `theme.scss` — the token file depends on
Material's CSS custom properties being defined first.

---

## 2. Visual Identity & Product Philosophy

**Mood:** Dense dark space with electric chromatic energy. Deep indigo-black
backgrounds, flat surfaces, and a vivid purple-orange-amber gradient that
functions as the sole source of chromatic warmth. The visual language should
feel like the venue itself: dark, charged, expectant.

**Rule of thumb:** When in doubt, go darker and flatter. Let the gradient do
the lifting.

### Consumer UX Principle

Antigravity's audience ranges from a regular concert-goer buying a single
ticket on their phone to a reseller managing a portfolio of listings on desktop.
Both deserve the same clarity. Apply these principles across every screen:

**Hierarchy first.** The most important action on any screen must be visually
dominant and immediately identifiable — even to a user who has never seen the
app before. Use `--gradient-brand` on the primary CTA to signal "this is what
you do next."

**Reduce friction at every step.** Checkout and payment flows must minimize
cognitive load. Group related fields, show progress clearly, and never hide the
total price. If a step can be collapsed or skipped, it should be.

**Communicate state, always.** Loading, success, error, and empty states are
part of the design — not afterthoughts. Every async action needs a visible
response. Use `--md-sys-color-error` for failures; use a `--gradient-brand`
accent pulse or checkmark for success.

**Touch-first, desktop-enhanced.** Design for a thumb on mobile (44px min
touch targets, important actions reachable in the lower third of the screen),
then scale up for desktop. Never assume a mouse.

**Trust signals matter in ticketing.** Secure payment badges, order summaries,
clear cancellation/refund policies, and confirmation states are UX features —
style them within the design system but never omit them for aesthetic reasons.

---

## 3. Color Palette

Use CSS custom properties exclusively — never hardcode hex values in component
SCSS.

### M3 System Colors

| Token | Hex | Role |
|---|---|---|
| `--md-sys-color-primary` | `#a855f7` | Accent, icon fills, active states |
| `--md-sys-color-on-primary` | `#ffffff` | Text on primary |
| `--md-sys-color-primary-container` | `#1a1535` | Icon container bg, button icon bg |
| `--md-sys-color-secondary` | `#f97316` | Mid-gradient accent |
| `--md-sys-color-tertiary` | `#fbbf24` | Warm gradient endpoint, badges |
| `--md-sys-color-error` | `#f87171` | Errors and destructive actions |
| `--md-sys-color-background` | `#0d0b1e` | Page base layer |
| `--md-sys-color-surface` | `#12102a` | Cards, dialogs, sheets |
| `--md-sys-color-surface-variant` | `#1a1535` | Chips, secondary containers |
| `--md-sys-color-on-background` | `#ffffff` | Primary text |
| `--md-sys-color-on-surface` | `#ffffff` | Text on surface |
| `--md-sys-color-on-surface-variant` | `#9ca3af` | Secondary text, labels, muted |
| `--md-sys-color-outline` | `rgba(255,255,255,0.2)` | Chip/input borders |
| `--md-sys-color-outline-variant` | `rgba(255,255,255,0.08)` | Dividers, separators |

### Brand Gradients (Custom Tokens)

```scss
// The signature gradient — use sparingly and deliberately
--gradient-brand:          linear-gradient(90deg, #7c3aed 0%, #f97316 100%);
--gradient-brand-diagonal: linear-gradient(135deg, #7c3aed 0%, #f97316 100%);

// Page background — goes on body only, not on components
--gradient-background:     radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0f172a 100%);
--gradient-surface-alt:    radial-gradient(ellipse at 30% 40%, #1e1b4b 0%, #0f172a 100%);

// For gradient borders via pseudo-element
--gradient-border:         linear-gradient(145deg, #a855f7 0%, #f97316 50%, #fbbf24 100%);
```

**Where `--gradient-brand` is allowed:**
- CTA button backgrounds
- Footer decorative bar
- Icon container gradient borders
- Special headline text (`-webkit-background-clip: text`)

**Where it is NOT allowed:**
- Card backgrounds
- Input fills
- Section backgrounds (use surface color instead)

---

## 4. Typography

Fonts loaded from Google Fonts: `Bebas Neue`, `Outfit`, `Space Mono`.

```scss
--font-display: 'Bebas Neue', 'Barlow Condensed', sans-serif;
--font-ui:      'Outfit', sans-serif;
--font-mono:    'Space Mono', 'JetBrains Mono', monospace;
```

| Role | Font | Size | Weight | Transform | Tracking |
|---|---|---|---|---|---|
| Hero / section title | Bebas Neue | 72px / 56px | 400 | uppercase | 0.02em |
| Card title | Outfit | 32px | 700 | none | 0 |
| Subtitle | Outfit | 24px | 700 | none | 0 |
| Body | Outfit | 16px | 400 | none | 0 |
| Secondary text | Outfit | 14px | 400 | none | 0 |
| Chips / badges | Outfit | 12px | 700 | uppercase | 0.08em |
| CTA button label | Space Mono | 13px | 400 | uppercase | 0.15em |

Use utility class `.display-lg` / `.display-md` (defined in `tokens.scss`) for
display type. Use `.text-gradient` for gradient text on headlines.

---

## 5. Shape & Border Radius

```scss
--md-sys-shape-corner-extra-small: 4px;   // Snackbars
--md-sys-shape-corner-small:       8px;   // Small inputs
--md-sys-shape-corner-medium:      12px;  // Cards, containers
--md-sys-shape-corner-large:       16px;  // Menus
--md-sys-shape-corner-extra-large: 24px;  // Icon containers, dialogs
--md-sys-shape-corner-full:        50px;  // Pills: CTA buttons, chips
```

Use `border-radius: var(--md-sys-shape-corner-*)` — never raw pixel values.

---

## 6. Elevation & Depth

**Antigravity is a flat design.** All `--md-sys-elevation-*` tokens are set to
`none`. Depth is communicated exclusively through background-color contrast
between layers:

```
Page:     --md-sys-color-background   (#0d0b1e)   ← deepest
Surface:  --md-sys-color-surface      (#12102a)   ← cards
Variant:  --md-sys-color-surface-variant (#1a1535) ← chips, icon bg
```

**Never** add `box-shadow` to components. Use `elevation-overlay` on hover:
```scss
&:hover { background: rgba(168, 85, 247, 0.06); }
```

---

## 7. Spacing

Base unit: **8px**

```scss
--space-1:  4px;   // micro gaps, icon padding
--space-2:  8px;   // inline gaps
--space-3:  12px;  // chip padding
--space-4:  16px;  // M3 component padding
--space-5:  24px;  // mobile padding, card gaps
--space-6:  32px;  // section padding
--space-8:  48px;  // block separators
--space-10: 64px;  // desktop lateral padding
--space-12: 80px;  // large section separators
```

Only use `--space-*` tokens for margins, paddings, and gaps. No arbitrary values.

---

## 8. Component Patterns

### CTA Button (Gradient)

Angular Material's `mat-flat-button` does not support gradient backgrounds.
Always build as a **custom component**.

```scss
// Use the @mixin from tokens.scss
.btn-cta { @include btn-cta; }
```

Structure:
```html
<button class="btn-cta">
  <span class="btn-cta__icon">
    <mat-icon>arrow_forward</mat-icon>
  </span>
  <span class="btn-cta__label">Get started</span>
</button>
```

Key specs:
- Height: `60px`, border-radius: `50px`
- Background: `--gradient-brand`
- Icon circle: `44px`, bg: `--md-sys-color-primary-container`
- Label: Space Mono, uppercase, `0.15em` tracking

### Outlined Social Chips

```scss
.chip-outlined { @include chip-outlined; }
```

Key specs:
- Border: `1px solid rgba(255,255,255,0.25)` → hover `0.5`
- Background: `transparent`
- Label: Outfit, uppercase, bold, 12px

### Icon Container (with gradient border)

Angular Material doesn't support gradient borders natively. Use the
`gradient-border` mixin with a `::before` pseudo-element:

```scss
.icon-container {
  @include gradient-border(24px);
  width: var(--icon-container-size);
  height: var(--icon-container-size);
}
```

Never use `border-image` for rounded corners — it clips `border-radius`. The
pseudo-element technique is mandatory here.

### Cards

```scss
mat-card {
  background: var(--md-sys-color-surface);
  border-radius: var(--md-sys-shape-corner-medium);
  // No box-shadow
}
```

### Divider

```html
<div class="divider"></div>
```
Defined in `tokens.scss` as `1px` / `rgba(255,255,255,0.08)`.

### Footer Decorative Bar

```html
<div class="footer-bar"></div>
```
`4px` tall, `--gradient-brand` background. Fixed at bottom or at end of scroll.

---

## 9. Layout Grid

Antigravity uses a fluid 12-column grid with column-gap of `--space-5` (24px)
on mobile and `--space-6` (32px) on desktop.

```scss
.ag-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5);

  @include desktop {
    gap: var(--space-6);
  }
}
```

### Standard Column Spans

| Context | Mobile | Tablet | Desktop |
|---|---|---|---|
| Event card (listing grid) | 12 col | 6 col | 4 col |
| Featured / hero event | 12 col | 12 col | 8 col |
| Sidebar / filters | hidden | 12 col | 3 col |
| Checkout form | 12 col | 8 col | 6 col |
| Order summary panel | 12 col | 4 col | 4 col |
| Full-width section | 12 col | 12 col | 12 col |

On mobile, the filter panel collapses into a bottom sheet (`mat-bottom-sheet`)
or a drawer — never a sidebar that eats horizontal space.

---

## 10. Ticketing-Specific Component Patterns

These patterns apply to the domain-specific screens of the platform. All of
them inherit the base token system — no new colors, no new fonts.

### Event Card (listing grid item)

The primary discovery surface. Must communicate the essentials at a glance:
event image, name, date, venue, and minimum price.

```html
<mat-card class="event-card">
  <div class="event-card__image-wrap">
    <img [src]="event.coverImage" [alt]="event.name" />
    <span class="event-card__category chip-outlined">{{ event.category }}</span>
  </div>
  <mat-card-content class="event-card__body">
    <p class="event-card__date">{{ event.date | date:'EEE d MMM · HH:mm' }}</p>
    <h3 class="event-card__title">{{ event.name }}</h3>
    <p class="event-card__venue">{{ event.venue }}</p>
  </mat-card-content>
  <mat-card-footer class="event-card__footer">
    <span class="event-card__price">Desde ${{ event.minPrice | number }}</span>
    <button class="btn-cta btn-cta--sm">
      <span class="btn-cta__label">Ver entradas</span>
    </button>
  </mat-card-footer>
</mat-card>
```

Key SCSS rules:
- Background: `--md-sys-color-surface`
- Border-radius: `--md-sys-shape-corner-medium` (12px)
- Image aspect ratio: `16/9`, `object-fit: cover`
- Category chip: positioned `absolute` top-left over the image
- Price label: `--md-sys-color-tertiary` (#fbbf24) — the one place warm amber
  appears as standalone text
- No box-shadow. Hover: `background` shifts to `--md-sys-color-surface-variant`

### Ticket Selector (quantity + ticket type)

```html
<div class="ticket-selector">
  <div class="ticket-selector__row" *ngFor="let tier of tiers">
    <div class="ticket-selector__info">
      <span class="ticket-selector__name">{{ tier.name }}</span>
      <span class="ticket-selector__price">${{ tier.price }}</span>
    </div>
    <div class="ticket-selector__qty">
      <button mat-icon-button (click)="decrement(tier)">
        <mat-icon>remove</mat-icon>
      </button>
      <span class="ticket-selector__count">{{ tier.qty }}</span>
      <button mat-icon-button (click)="increment(tier)">
        <mat-icon>add</mat-icon>
      </button>
    </div>
  </div>
</div>
```

Key rules:
- Each row on `--md-sys-color-surface-variant` with `--space-4` padding
- Separate rows with `--md-sys-color-outline-variant` divider
- Quantity control: min touch target `44px` — never smaller
- Sold-out tier: `opacity: 0.4`, controls `pointer-events: none`, badge
  "AGOTADO" using `--md-sys-color-error`

### Checkout Flow — Progress Stepper

Use a custom horizontal stepper, not `mat-stepper` (which doesn't match the
aesthetic). Three steps max visible on mobile: **Entradas → Datos → Pago**.

```scss
.checkout-stepper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) 0;

  .step {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--md-sys-color-outline-variant);
    transition: background 300ms ease;

    &.step--active  { background: var(--md-sys-color-primary); }
    &.step--done    { background: var(--gradient-brand); }
  }
}
```

Label the current step as text above the bar — never rely on the bar color
alone (accessibility).

### Payment Form

The payment form must maintain the visual language while maximizing trust and
clarity. Rules:

- Group card fields under a single `--md-sys-color-surface` container with
  `border-radius: var(--md-sys-shape-corner-medium)`
- Field labels: `--md-sys-color-on-surface-variant`, `label-medium` style
- Active input border: `--md-sys-color-primary`
- Error state: `--md-sys-color-error` border + error message below the field
  in `body-medium` size — always explicit ("Número de tarjeta inválido", not
  "Campo incorrecto")
- Card brand icons (Visa, Mastercard, etc.) appear inline in the card number
  field on the right — white SVG icons, opacity `0.6` until detected, then
  `1.0`
- The "Pagar" / confirm button uses the full `.btn-cta` pattern —
  `--gradient-brand` background, full width on mobile
- Never disable the submit button silently — if the form is invalid, the button
  remains visible but shows inline validation on tap

### Order Summary Panel

Sticky on desktop (right column), collapsible drawer on mobile.

```html
<div class="order-summary">
  <h2 class="order-summary__title">Tu pedido</h2>
  <div class="divider"></div>
  <div class="order-summary__items">...</div>
  <div class="divider"></div>
  <div class="order-summary__total">
    <span>Total</span>
    <span class="order-summary__total-price">${{ total | number }}</span>
  </div>
  <!-- Trust signal -->
  <div class="order-summary__trust">
    <mat-icon>lock</mat-icon>
    <span>Pago 100% seguro</span>
  </div>
</div>
```

Key rules:
- Background: `--md-sys-color-surface`
- Total price: `headline-medium` weight, `--md-sys-color-on-surface`
- Trust line: `--md-sys-color-on-surface-variant`, `body-medium` — always
  present, never hidden for space

### Confirmation / Success Screen

This is the emotional peak of the purchase. Give it breathing room.

- Full-width gradient accent bar at top (4px, `--gradient-brand`)
- Large checkmark icon in a `--md-sys-color-primary-container` circle with
  gradient border
- Headline in Bebas Neue: "¡YA TENÉS TUS ENTRADAS!" — display-medium size
- Order number in `label-large` style, muted color
- Two actions: "Ver mis entradas" (primary CTA) and "Volver al inicio"
  (text link, `app-link` style)
- No clutter — this screen should feel like a reward

### Empty States

Every list or grid that can be empty needs a designed empty state:

```html
<div class="empty-state">
  <mat-icon class="empty-state__icon">confirmation_number</mat-icon>
  <h3 class="empty-state__title">No hay eventos disponibles</h3>
  <p class="empty-state__desc">Probá con otra fecha o categoría</p>
</div>
```

- Icon: 48px, `--md-sys-color-on-surface-variant`
- Title: `headline-medium`, `--md-sys-color-on-surface`
- Description: `body-medium`, `--md-sys-color-on-surface-variant`
- Include an action when recovery is possible (clear filters, try again)

### Search & Filter Bar

```html
<div class="search-bar">
  <mat-icon>search</mat-icon>
  <input type="search" placeholder="Buscar evento, artista o lugar…" />
  <button class="chip-outlined filter-toggle">
    <mat-icon>tune</mat-icon> Filtros
  </button>
</div>
```

- Background: `--md-sys-color-surface-variant`
- Border-radius: `--md-sys-shape-corner-full` (pill)
- Border: `1px solid var(--md-sys-color-outline)` on focus
- Placeholder: `--md-sys-color-on-surface-variant`
- On mobile: full width, filters open a bottom sheet

---

## 11. Angular Material Overrides

M3 components inherit CSS custom properties automatically from `:root`. To
override a specific component without affecting others:

```scss
// Host-scoped override (preferred)
:host {
  --mdc-filled-button-container-color: transparent;
}

// Avoid ::ng-deep unless absolutely necessary.
// If used, always scope to :host to prevent leaking.
:host ::ng-deep .mat-mdc-chip {
  border-radius: var(--md-sys-shape-corner-full);
}
```

**Gradient buttons** require `ViewEncapsulation.None` or a global CSS class
because `background: linear-gradient()` cannot be set via a single Material
CSS token.

---

## 12. Breakpoints

```scss
// Mixins from tokens.scss
@include mobile  { /* < 600px  — single column, 24px padding */ }
@include tablet  { /* 600–1023px — 2 col, 48px padding      */ }
@include desktop { /* ≥ 1024px  — multi-col, 64px padding   */ }
```

Never write raw `@media` queries — always use these mixins.

---

## 13. Dos and Don'ts

### ✅ Do
- Use CSS custom properties for every color, size, and spacing value
- Keep surfaces flat — trust background-color contrast for depth
- Use `--gradient-brand` only on intentional accent elements
- Scope Material overrides to `:host`
- Use standalone components (`standalone: true`)
- Apply `@include` mixins from `tokens.scss` for chip, button, and icon
  container patterns
- Design for thumb reach on mobile — primary actions in the lower 60% of
  the screen
- Make the total price and primary CTA visible without scrolling on every
  checkout step
- Use `--md-sys-color-tertiary` (#fbbf24) for price callouts — it's warm,
  legible, and on-brand
- Always provide a designed empty state for any list or grid
- Write error messages in plain Spanish, specific to what went wrong

### ❌ Don't
- Hardcode hex values in component SCSS
- Add `box-shadow` anywhere
- Use `mat-flat-button` or `mat-raised-button` for gradient CTAs
- Import `tokens.scss` before `theme.scss`
- Use `::ng-deep` without `:host` scoping
- Write raw `@media` queries outside the mixin system
- Apply `--gradient-brand` to card or section backgrounds
- Use numbered list markers (01/02/03) as decoration — only if content is
  genuinely sequential
- Silently disable the submit button — always explain why it can't be tapped
- Hide the order total or security indicators to save space
- Use touch targets smaller than 44px on any interactive element
- Show a spinner with no timeout or fallback — always handle async failures

---

## 14. Checklist Before Delivering a Component

### Design System
- [ ] All colors reference `--md-sys-color-*` or `--gradient-*` tokens
- [ ] All spacing uses `--space-*` tokens
- [ ] All border-radius uses `--md-sys-shape-corner-*` tokens
- [ ] No `box-shadow` present
- [ ] No hardcoded hex values
- [ ] Display text uses Bebas Neue via `.display-lg` / `.display-md` or the
      `@include text-display()` mixin
- [ ] Gradient borders on icon containers use the pseudo-element technique
- [ ] Responsive styles use the `@include mobile/tablet/desktop` mixins
- [ ] Material overrides are host-scoped

### Consumer UX
- [ ] The primary action is visually dominant and uses `--gradient-brand`
- [ ] Touch targets are at minimum `44px` on all interactive elements
- [ ] Loading, error, and empty states are designed — not missing
- [ ] Error messages are explicit and actionable ("Número inválido", not
      "Error")
- [ ] The total price is visible without scrolling in any checkout step
- [ ] The screen works and feels complete on a 375px-wide viewport
- [ ] Trust signals (secure payment, order confirmation) are present where
      relevant and never hidden for aesthetic reasons