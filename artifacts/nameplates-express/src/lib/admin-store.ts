/**
 * Admin data types, defaults, localStorage persistence, and color/pricing utilities.
 * Shared between AdminContext and any component that needs admin-managed data.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
  enabled: boolean;
}

export interface PricingTier {
  minQty: number;   // inclusive lower bound (e.g. 10 means "10 or more")
  priceEach: number;
}

export interface AdminSize {
  id: string;
  label: string;
  width: number;   // inches, landscape (longer dimension)
  height: number;  // inches, landscape (shorter dimension)
  description: string;
  active: boolean;
  sortOrder: number;
  basePrice: number;
  pricingTiers: PricingTier[];
  colors: ColorOption[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "nx-admin-v1";

/** Canonical color palette — each size inherits from this set. */
export const DEFAULT_COLOR_PALETTE: Omit<ColorOption, "enabled">[] = [
  { id: "black",  label: "Black",  hex: "#1a2035" },
  { id: "red",    label: "Red",    hex: "#8b1a1a" },
  { id: "blue",   label: "Blue",   hex: "#0d2d6b" },
  { id: "yellow", label: "Yellow", hex: "#7a6200" },
  { id: "green",  label: "Green",  hex: "#0f4a1a" },
];

/** Anodized aluminum gradient presets per color (used in SVG plate rendering). */
export const PLATE_COLOR_STYLES: Record<string, {
  gA: string; gB: string; gC: string; sheen: string; border: string; border2: string;
}> = {
  black:  { gA: "hsl(220,18%,20%)", gB: "hsl(220,15%,11%)", gC: "hsl(220,18%,17%)", sheen: "rgba(255,255,255,0.07)", border: "hsl(220,20%,35%)", border2: "rgba(255,255,255,0.04)" },
  red:    { gA: "hsl(0,45%,20%)",   gB: "hsl(0,40%,12%)",   gC: "hsl(0,42%,18%)",   sheen: "rgba(255,210,210,0.07)", border: "hsl(0,35%,34%)",   border2: "rgba(255,180,180,0.04)" },
  blue:   { gA: "hsl(215,55%,22%)", gB: "hsl(215,50%,12%)", gC: "hsl(215,52%,19%)", sheen: "rgba(210,230,255,0.07)", border: "hsl(215,45%,36%)", border2: "rgba(200,220,255,0.04)" },
  yellow: { gA: "hsl(45,55%,22%)",  gB: "hsl(45,50%,13%)",  gC: "hsl(45,52%,19%)",  sheen: "rgba(255,248,210,0.08)", border: "hsl(45,50%,38%)",  border2: "rgba(255,240,180,0.04)" },
  green:  { gA: "hsl(140,40%,18%)", gB: "hsl(140,35%,10%)", gC: "hsl(140,38%,15%)", sheen: "rgba(210,255,225,0.07)", border: "hsl(140,35%,30%)", border2: "rgba(190,255,210,0.04)" },
};

export function getPlateStyle(colorId: string) {
  return PLATE_COLOR_STYLES[colorId] ?? PLATE_COLOR_STYLES.black;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultColors(enabledIds: string[] = ["black"]): ColorOption[] {
  return DEFAULT_COLOR_PALETTE.map(c => ({ ...c, enabled: enabledIds.includes(c.id) }));
}

/** Price per unit for a given qty, applying the best applicable tier. */
export function resolvePrice(adminSize: AdminSize, qty: number): number {
  const best = [...adminSize.pricingTiers]
    .filter(t => qty >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];
  return best?.priceEach ?? adminSize.basePrice;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

export const ADMIN_DEFAULT_SIZES: AdminSize[] = [
  {
    id: "3x1",  label: '3" × 1"',   width: 3,  height: 1, sortOrder: 1, active: true,
    description: "Small single-line nameplate",
    basePrice: 3.50,
    pricingTiers: [{ minQty: 10, priceEach: 3.15 }, { minQty: 25, priceEach: 2.80 }, { minQty: 100, priceEach: 2.45 }],
    colors: defaultColors(),
  },
  {
    id: "4x2",  label: '4" × 2"',   width: 4,  height: 2, sortOrder: 2, active: true,
    description: "Standard two-line nameplate",
    basePrice: 4.50,
    pricingTiers: [{ minQty: 10, priceEach: 4.05 }, { minQty: 25, priceEach: 3.60 }, { minQty: 100, priceEach: 3.15 }],
    colors: defaultColors(),
  },
  {
    id: "6x2",  label: '6" × 2"',   width: 6,  height: 2, sortOrder: 3, active: true,
    description: "Wide two-line nameplate",
    basePrice: 5.50,
    pricingTiers: [{ minQty: 10, priceEach: 4.95 }, { minQty: 25, priceEach: 4.40 }, { minQty: 100, priceEach: 3.85 }],
    colors: defaultColors(),
  },
  {
    id: "6x3",  label: '6" × 3"',   width: 6,  height: 3, sortOrder: 4, active: true,
    description: "Three-line nameplate — versatile size",
    basePrice: 6.50,
    pricingTiers: [{ minQty: 10, priceEach: 5.85 }, { minQty: 25, priceEach: 5.20 }, { minQty: 100, priceEach: 4.55 }],
    colors: defaultColors(),
  },
  {
    id: "9x3",  label: '9" × 3"',   width: 9,  height: 3, sortOrder: 5, active: true,
    description: "Wide three-row nameplate",
    basePrice: 8.00,
    pricingTiers: [{ minQty: 10, priceEach: 7.20 }, { minQty: 25, priceEach: 6.40 }, { minQty: 100, priceEach: 5.60 }],
    colors: defaultColors(),
  },
  {
    id: "8x4",  label: '8" × 4"',   width: 8,  height: 4, sortOrder: 6, active: true,
    description: "Large nameplate for detailed labels",
    basePrice: 9.00,
    pricingTiers: [{ minQty: 10, priceEach: 8.10 }, { minQty: 25, priceEach: 7.20 }, { minQty: 100, priceEach: 6.30 }],
    colors: defaultColors(),
  },
  {
    id: "10x4", label: '10" × 4"',  width: 10, height: 4, sortOrder: 7, active: true,
    description: "Extra-wide nameplate for complex layouts",
    basePrice: 10.00,
    pricingTiers: [{ minQty: 10, priceEach: 9.00 }, { minQty: 25, priceEach: 8.00 }, { minQty: 100, priceEach: 7.00 }],
    colors: defaultColors(),
  },
];

// ─── localStorage ─────────────────────────────────────────────────────────────

export function loadAdminSizes(): AdminSize[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ADMIN_DEFAULT_SIZES;
    const parsed = JSON.parse(raw) as AdminSize[];
    if (!Array.isArray(parsed) || parsed.length === 0) return ADMIN_DEFAULT_SIZES;
    return parsed;
  } catch {
    return ADMIN_DEFAULT_SIZES;
  }
}

export function saveAdminSizes(sizes: AdminSize[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch {
    // localStorage unavailable (e.g. private browsing storage full)
  }
}
