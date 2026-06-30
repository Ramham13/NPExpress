# Nameplates Express

A browser-based ordering platform for **custom anodized aluminum nameplates**. Customers design their plates interactively, see a real-time high-fidelity preview, and submit orders via PayPal or a manual quote request. Admins manage product sizes, pricing tiers, and color options from a separate unlisted dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Local Development](#local-development)
6. [Application Routes](#application-routes)
7. [Designer — How It Works](#designer--how-it-works)
8. [CSV Bulk Import](#csv-bulk-import)
9. [Cart and Checkout](#cart-and-checkout)
10. [Admin Dashboard](#admin-dashboard)
11. [Overflow Detection Logic](#overflow-detection-logic)
12. [Data Persistence](#data-persistence)
13. [Pricing Engine](#pricing-engine)
14. [Known Limitations and TODOs](#known-limitations-and-todos)

---

## Overview

Nameplates Express is a **fully client-side** React + Vite web application — there is no backend server and no database. All state lives in the browser (React state + `localStorage` for admin settings). Orders are submitted either through the PayPal JavaScript SDK (sandbox mode) or as a "quote request" (currently a UI mock that produces a confirmation screen).

The application is structured as a pnpm workspace artifact at `artifacts/nameplates-express/`.

---

## Features

### Customer-Facing

| Feature | Description |
|---|---|
| **Interactive Designer** | Visual drag-to-resize segment editor with real-time SVG preview |
| **Size Picker** | Admin-managed plate sizes displayed as a card grid |
| **Template Library** | One-click layout templates (1-line, 2-line, 3-zone, multi-column, etc.) |
| **Per-Zone Text Editing** | Font, size, bold, italic, horizontal + vertical alignment, word wrap |
| **Divider Styling** | Enable/disable inter-zone dividers; solid, dotted, or dashed styles |
| **Color Selection** | Admin-managed anodized aluminum color palette per size |
| **Final Preview** | High-fidelity, clean SVG render with no editor chrome |
| **Layout Export / Import** | Save a design as `.json` and reload it later |
| **Overflow Detection** | Real-time two-tier overflow system (segment warning vs plate-edge error) |
| **CSV Bulk Import** | Upload a CSV file and get a gallery preview of every row |
| **Cart** | Multi-item cart with individual and batch (CSV) items, quantity display |
| **PayPal Checkout** | Guest contact + shipping info → PayPal sandbox payment |
| **Quote Request** | Submit order for manual pricing without immediate payment |
| **Order Confirmation** | Printable confirmation screen with order number (`NX-YYYY-XXXXX`) |

### Admin-Only (unlisted, `/admin`)

| Feature | Description |
|---|---|
| **Size Management** | Create / edit / delete plate sizes (width × height in inches) |
| **Pricing Tiers** | Base price per unit + configurable quantity-break discounts |
| **Color Palette** | Enable/disable standard colors; add custom colors with hex codes |
| **Sort Order & Active Status** | Control which sizes appear in the size picker and in what order |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + Vite 5 |
| **Language** | TypeScript 5.9 (strict) |
| **Routing** | [wouter](https://github.com/molefrog/wouter) (lightweight, no React Router) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (Radix primitives + Tailwind) |
| **Styling** | Tailwind CSS v4 |
| **Icons** | [lucide-react](https://lucide.dev/) |
| **SVG Rendering** | Inline SVG (no canvas, no external charting lib) |
| **Text Measurement** | Offscreen `<canvas>` (`CanvasRenderingContext2D.measureText`) |
| **Payments** | PayPal JS SDK (sandbox) via CDN script tag |
| **State** | React `useState` / `useReducer` / `useContext` — no Redux/Zustand |
| **Persistence** | `localStorage` (admin settings only) |
| **Build** | Vite (`pnpm --filter @workspace/nameplates-express run dev`) |
| **Package Manager** | pnpm workspaces (monorepo) |
| **Node** | ≥ 20 (Node 24 in CI) |

---

## Project Structure

```
artifacts/nameplates-express/
├── src/
│   ├── App.tsx                    # Wouter router, cart state, app shell
│   ├── main.tsx                   # React root, font preloads
│   ├── index.css                  # Tailwind directives + CSS variables (dark theme)
│   │
│   ├── pages/
│   │   ├── Designer.tsx           # Main designer page (size picker + editor + panel)
│   │   ├── CsvView.tsx            # CSV bulk-import flow
│   │   ├── CartView.tsx           # Order summary / cart
│   │   ├── CheckoutGuest.tsx      # Guest contact + shipping form
│   │   ├── CheckoutReview.tsx     # Order review + PayPal / Quote buttons
│   │   ├── OrderConfirmation.tsx  # Post-submission confirmation screen
│   │   └── AdminPage.tsx          # Admin dashboard (sizes, pricing, colors)
│   │
│   ├── components/
│   │   └── PlateFinalPreview.tsx  # High-fidelity SVG renderer (used in cart, CSV, confirmation)
│   │
│   ├── context/
│   │   └── AdminContext.tsx       # React context wrapping admin localStorage store
│   │
│   ├── lib/
│   │   ├── plate-utils.ts         # Core geometry, text layout, overflow detection
│   │   └── admin-store.ts         # Admin settings schema + localStorage read/write
│   │
│   └── data/
│       └── templates.ts           # Font options, default templates, TagSize type, ZoneConfig type
│
├── index.html                     # Vite entry point (PayPal SDK CDN script injected here)
├── vite.config.ts                 # Vite config (base path from env, host: true)
├── tsconfig.json                  # TypeScript config (extends base, noEmit)
├── tailwind.config.ts             # Tailwind config
└── package.json                   # Package metadata, dev/build scripts
```

### Key Source-of-Truth Files

| Concern | File |
|---|---|
| Database schema | N/A — no database |
| Admin product data | `src/lib/admin-store.ts` (localStorage key `npx_admin_v1`) |
| Plate geometry types | `src/lib/plate-utils.ts` (`TextZone`, `ZoneConfig`, `TagSize`) |
| Font list | `src/data/templates.ts` (`FONT_OPTIONS`) |
| Default plate templates | `src/data/templates.ts` (`TEMPLATES`) |
| Overflow detection | `src/lib/plate-utils.ts` (`computeOverflowMap`) |
| SVG constants | `src/lib/plate-utils.ts` (`SVG_VW = 1000`, `PAD_RATIO = 0.04`) |

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9

### Start the dev server

```bash
# From the monorepo root:
pnpm --filter @workspace/nameplates-express run dev
```

The app is served via the Replit workflow system. In Replit, use the **"web" workflow** (`artifacts/nameplates-express: web`) which runs the command above and binds to the `PORT` environment variable.

**Do not** run `pnpm run dev` at the monorepo root — there is no root `dev` script.

### Typecheck

```bash
pnpm --filter @workspace/nameplates-express run typecheck
```

Or from root:

```bash
pnpm run typecheck
```

### Build (production)

```bash
pnpm --filter @workspace/nameplates-express run build
```

Requires `PORT` and `BASE_PATH` environment variables to be set (the Replit workflow wires these up automatically).

---

## Application Routes

All routes are handled client-side by **wouter**. There is no server-side routing.

| Path | Component | Notes |
|---|---|---|
| `/` | `Designer.tsx` | Main entry point — size picker then editor |
| `/csv` | `CsvView.tsx` | Bulk CSV import (entered from the editor) |
| `/cart` | `CartView.tsx` | Cart summary |
| `/checkout/guest` | `CheckoutGuest.tsx` | Contact + shipping form |
| `/checkout/review` | `CheckoutReview.tsx` | Order review + payment |
| `/order-confirmation` | `OrderConfirmation.tsx` | Post-submission confirmation |
| `/admin` | `AdminPage.tsx` | Admin dashboard — **not linked in any customer UI** |

---

## Designer — How It Works

### 1. Size Picker

The first screen customers see. Plate sizes come from the admin localStorage store (`admin-store.ts`). Only sizes with `active: true` are shown, sorted by `sortOrder`.

Each size card shows the aspect ratio as a visual rectangle, the dimensions in inches, the base price, and available anodized colors as color swatches.

### 2. Template Selection

After selecting a size, customers can click a template from the `TEMPLATES` array in `templates.ts`. Each template specifies:
- `direction`: `"horizontal"` (rows) or `"vertical"` (columns)
- `segments`: array of relative heights/widths (must sum to 100)
- `compatibleSizes`: which size IDs this template is appropriate for

Selecting a template resets the zone configuration and applies the template's text defaults.

### 3. Interactive Geometry Editor (`PlatePreview`)

The editor renders the plate as an SVG with `viewBox="0 0 1000 VH"` where `VH = round(1000 × height / width)`. All geometry is computed in SVG units using the constants:

- `SVG_VW = 1000` — SVG viewport width in arbitrary units
- `PAD_RATIO = 0.04` — 4% padding on each side for the plate border

**Inner plate area:**
```
innerW = SVG_VW - 2 × (SVG_VW × PAD_RATIO)  =  920 units
innerH = VH − 2 × (VH × PAD_RATIO)
```

Each `TextZone` occupies a percentage of the inner area:
```typescript
interface TextZone {
  id: string;
  label: string;        // "Line 1", "Column A", etc.
  xPct: number;         // left edge as % of innerW
  yPct: number;         // top edge as % of innerH
  widthPct: number;     // width as % of innerW
  heightPct: number;    // height as % of innerH
  multiline: boolean;
}
```

### 4. Drag-to-Resize Dividers

Divider handles are rendered as invisible wide SVG `<rect>` elements on top of the visible divider line. They use **pointer events** (not mouse events) to support both touch and mouse:

- `onPointerDown` → capture pointer to the SVG element (`setPointerCapture`)
- `onPointerMove` → compute new zone proportions
- `onPointerUp` → release capture and snap to 5% increments

The drag delta is computed in SVG-unit space by converting the `clientY` / `clientX` change to SVG units using the element's `getBoundingClientRect()` and the SVG viewBox aspect ratio.

### 5. Per-Zone Text Configuration (`ZoneConfig`)

```typescript
interface ZoneConfig {
  text: string;
  fontId: string;        // key into FONT_OPTIONS
  fontSize: number;      // points (6–120)
  bold: boolean;
  italic: boolean;
  hAlign: "left" | "center" | "right";
  vAlign: "top" | "center" | "bottom";
  wordWrap: boolean;
}
```

All configs are stored in `lineConfigs: Record<zoneId, ZoneConfig>` in the top-level `Designer` component state.

### 6. Text Layout (`computeTextLayout` in `plate-utils.ts`)

Text is rendered as SVG `<text>` elements. The layout function:

1. Looks up the font family from `FONT_OPTIONS`
2. Converts point size to SVG pixels: `ptToSvgPx(pt, plateWidthInches)` — scales so that `1pt` at `1 inch wide` plate = `SVG_VW / 72` px
3. Splits text into lines (manual `\n` splits, or word-wrap via `wrapWords`)
4. Computes `textX` based on `hAlign` and `textAnchor` (`"start"` / `"middle"` / `"end"`)
5. Computes `firstLineY` based on `vAlign` and total text block height
6. Renders each line with `dominantBaseline="hanging"` for predictable top-aligned positioning

Text is clipped to its zone via a `<clipPath>` element.

### 7. Final Preview (`PlateFinalPreview.tsx`)

A separate read-only SVG renderer used in:
- The right panel of the designer ("Product Preview" tab)
- The CSV bulk import gallery
- The cart
- The order confirmation screen

It renders the same geometry as the editor but without zone borders, handles, or overflow badges. It applies the chosen anodized color as the plate background.

---

## CSV Bulk Import

Accessed via the "Bulk Add from CSV" button in the designer panel.

### CSV Format

The first row must be a **header row**. Column names must match the zone labels exactly (case-insensitive). Extra columns are ignored. Missing columns get an empty string.

**Example** (for a 2-line horizontal design):

```csv
Line 1,Line 2
PUMP-001,Boiler Feed
PUMP-002,Cooling Water
VALVE-A7,Main Steam Inlet
```

A template CSV can be downloaded from the "Download Template" button within the CSV upload page — it is auto-generated from the current design's zone labels.

### Validation

Each row is validated individually:

| Condition | Status | Outcome |
|---|---|---|
| All text fits within every segment | ✅ Green | Included in cart batch |
| Text overflows a segment boundary but fits on the plate | ⚠️ Amber | **Included** with warning label |
| Text physically extends past the nameplate edge | ❌ Red | **Excluded** from cart batch |

### Adding to Cart

Clicking "Add N Nameplates to Cart" creates a **batch cart item** with a shared `batchId`. The cart view groups batch items together and displays them as a batch with a thumbnail count.

---

## Cart and Checkout

### Cart State

Cart state lives in `App.tsx` as `const [cart, setCart] = useState<CartItem[]>([])`. It is **not** persisted to localStorage (intentional — cart resets on page refresh).

```typescript
interface CartItem {
  id: string;          // unique per item
  batchId?: string;    // set for CSV batch items; groups siblings
  size: TagSize;
  direction: Direction;
  heights: number[];   // zone height percentages
  widths: number[];    // zone width percentages
  lineConfigs: ZoneConfigs;
  dividers: DividerConfig[];
  color: string;       // color id from admin color palette
}
```

### Pricing

Pricing is computed in `CartView.tsx` using the `size.pricing` from the admin store:

```typescript
interface PricingTier {
  minQty: number;   // minimum quantity to qualify for this tier
  price: number;    // price per unit at this tier
}
```

The applicable tier is the highest `minQty` that is ≤ the current total quantity for that size. The base price is used if no tier applies.

### Checkout Flow

1. **`/cart`** — Order summary. Customers review items and click "Proceed to Checkout".
2. **`/checkout/guest`** — Contact and shipping form (name, email, company, address fields). No authentication required.
3. **`/checkout/review`** — Final order review showing item thumbnails, quantities, and line totals.
   - **PayPal button**: Renders the PayPal JS SDK button. Currently in **sandbox mode**. On approval, redirects to `/order-confirmation`.
   - **Request a Quote**: Skips payment and goes directly to `/order-confirmation` with a quote-mode flag.
4. **`/order-confirmation`** — Displays a generated order number (`NX-YYYY-RANDOM`) and a summary for printing.

---

## Admin Dashboard

**Route: `/admin`** — not linked from any customer-facing page.

> ⚠️ **Security Note**: The admin page currently has **no authentication**. Anyone who knows the URL can access it. A password gate is planned as a follow-up task (see Task #2).

### Accessing the Admin Page

Navigate directly to `/admin` in the browser.

### Admin Data Schema (`admin-store.ts`)

```typescript
interface AdminSize {
  id: string;
  label: string;         // e.g. "6\" × 2\""
  width: number;         // inches
  height: number;        // inches
  active: boolean;       // shown in the size picker when true
  sortOrder: number;     // display order (lower = first)
  pricing: {
    basePrice: number;
    tiers: PricingTier[];
  };
  colors: AdminColor[];
}

interface AdminColor {
  id: string;            // e.g. "black", "custom-1718234567"
  label: string;         // e.g. "Black", "Cobalt Blue"
  hex: string;           // e.g. "#1a1a1a"
  enabled: boolean;
}
```

### Persistence

All admin settings are serialized to `localStorage` under the key `npx_admin_v1`. Changes take effect immediately for all open tabs (via a `storage` event listener in `AdminContext.tsx`).

**Default sizes** are seeded from `admin-store.ts` on first load if localStorage is empty.

### Admin Operations

| Action | Notes |
|---|---|
| Create size | Width and height must be landscape (width > height enforced) |
| Edit size | Opens an inline edit form; changes save immediately to localStorage |
| Delete size | Removes size and all its pricing/color config permanently |
| Toggle active | Shows/hides size in the customer size picker |
| Set sort order | Integer field; sizes are sorted ascending |
| Set base price | Price per unit when no quantity tier applies |
| Add pricing tier | Minimum quantity + price per unit at that quantity |
| Remove pricing tier | Button per row |
| Enable/disable color | Toggle per color for this size |
| Add custom color | Hex code input + label |
| Remove custom color | Button per custom color entry |

---

## Overflow Detection Logic

Overflow is computed in real-time via `computeOverflowMap` in `plate-utils.ts`. It uses an offscreen `<canvas>` element and `CanvasRenderingContext2D.measureText()` to measure actual rendered text widths for each font/size combination — no font-metric approximations.

### Two-Tier Overflow System

#### Tier 1: Segment / Zone Overflow (non-blocking — amber ⚠)

Text is wider than its assigned zone (width overflow) or the wrapped/stacked text is taller than the zone height. This is a **warning only** — the user can still add the item to the cart. The affected zone is highlighted with an amber border in the editor preview.

**When this applies:**
- `maxLineW > zoneWidth` (width overflow, word wrap disabled)
- `totalLineHeight > zoneHeight` (height overflow)

#### Tier 2: Plate Boundary Overflow (hard block — red ✕)

Text physically extends past the edge of the nameplate. This **blocks** adding to cart and excludes the row from CSV import.

Computed per alignment:
```
center:  textLeft = zoneCenter − maxLineW/2 < 0  OR  textRight = zoneCenter + maxLineW/2 > innerW
left:    textRight = zoneX + maxLineW > innerW
right:   textLeft = zoneX + zoneW − maxLineW < 0
height:  zoneY + totalHeight > innerH
```

### Designer UI Responses

| State | Zone border | Badge | Add-to-Order button |
|---|---|---|---|
| No overflow | Dim grey | — | Enabled (blue) |
| Segment overflow only | Amber | "⚠ Segment overflow" | Enabled (blue) |
| Plate boundary overflow | Red | "✕ Past plate edge" | Disabled (grey) |

### CSV Import Responses

| State | Card border | Footer icon | Included in cart? |
|---|---|---|---|
| No overflow | Slate | ✅ Green | Yes |
| Segment overflow only | Amber | ⚠ Amber | Yes (with warning) |
| Plate boundary overflow | Red | ✕ Red | No |

---

## Data Persistence

| Data | Storage | Reset on page refresh? |
|---|---|---|
| Cart items | React state (`App.tsx`) | **Yes** — cart is cleared on refresh |
| Current design (zones, text, dividers) | React state (`Designer.tsx`) | **Yes** |
| Admin sizes, pricing, colors | `localStorage` (`npx_admin_v1`) | No — persists indefinitely |
| Guest checkout form | React state (`CheckoutGuest.tsx`) | **Yes** |

> **Note**: Because the cart resets on refresh, customers completing checkout should be advised to do so in one session.

---

## Pricing Engine

### How Tiers Work

Given a size with:
```
basePrice: $6.00
tiers: [
  { minQty: 10, price: 4.50 },
  { minQty: 25, price: 3.75 },
  { minQty: 50, price: 3.00 },
]
```

And the customer orders 18 plates of this size:
- Applicable tier = the tier with `minQty ≤ 18` with the highest `minQty` = tier at `minQty: 10`
- Unit price = `$4.50`
- Line total = `18 × $4.50 = $81.00`

Pricing is computed **per-size** across the entire cart (all items of the same size share a quantity pool).

### Adding Tiers via Admin

Tiers are created in the admin size editor. There is no minimum or maximum number of tiers. A size with no tiers always uses the base price.

---

## Known Limitations and TODOs

### Security

- **Admin page has no password protection.** (Follow-up task planned.) Anyone who knows the URL `/admin` can modify pricing, colors, and sizes.
- Admin changes are stored in the **customer's own browser** via `localStorage`. Changes made by the admin in one browser are not visible in another browser. For a production deployment, admin settings should be stored server-side.

### Payments

- **PayPal is in sandbox mode.** No real money is processed. To go live, replace the sandbox client ID in `index.html` with a production PayPal client ID and remove the `data-env="sandbox"` flag.
- The "Request a Quote" flow generates a UI confirmation only — no email is sent and no order is recorded anywhere.

### Cart

- **Cart is not persisted.** Refreshing the page clears all items. A future version should persist cart to `localStorage` or `sessionStorage`.

### Fonts

- Fonts are loaded from Google Fonts (CDN). An offline or slow connection may cause text measurement to fall back to the system default, leading to inaccurate overflow detection.

### Browser Support

- Text measurement (`canvas.measureText`) and SVG rendering are used throughout. Fully supported in all modern browsers (Chrome, Firefox, Safari, Edge). IE11 is not supported.

### Landscape-Only

- Plate dimensions are validated as landscape (width > height) in the admin UI. Portrait-orientation plates would require an update to the aspect ratio logic in `plate-utils.ts`.

---

## Development Notes

### Adding a New Font

1. Add the Google Fonts `@import` or `<link>` for the new font in `index.html` or `index.css`.
2. Add an entry to `FONT_OPTIONS` in `src/data/templates.ts`:
   ```typescript
   { id: "myfont", label: "My Font", family: "My Font, sans-serif" }
   ```
3. The font will automatically appear in the per-zone font picker dropdown.

### Adding a New Template

Add to `TEMPLATES` in `src/data/templates.ts`:
```typescript
{
  id: "my-template",
  label: "My Template",
  description: "Short description shown in the template picker",
  direction: "horizontal",
  segments: [50, 50],        // percentage heights (must sum to 100)
  compatibleSizes: [],       // empty array = compatible with all sizes
  defaultConfigs: {
    "zone-0": { text: "Top Line", fontSize: 24 },
    "zone-1": { text: "Bottom Line", fontSize: 18 },
  },
}
```

### Adding a New Plate Size (Programmatically)

The preferred way is via the admin dashboard at `/admin`. To seed a new default size in code, add it to the `DEFAULT_SIZES` array in `src/lib/admin-store.ts`.

---

## Repository

**GitHub:** https://github.com/Ramham13/NPExpress

Push method (PAT auth, no remote add required):
```bash
git push "https://x-access-token:${GITHUB_PAT}@github.com/Ramham13/NPExpress.git" main
```

The `GITHUB_PAT` secret is stored in Replit Secrets (never commit or print it).
