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

function normalizeHex(hex: string) {
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value.slice(1).split("").map((ch) => `${ch}${ch}`).join("")}`;
  }
  return null;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  switch (max) {
    case rr:
      hue = (gg - bb) / delta + (gg < bb ? 6 : 0);
      break;
    case gg:
      hue = (bb - rr) / delta + 2;
      break;
    default:
      hue = (rr - gg) / delta + 4;
      break;
  }

  return {
    h: Math.round(hue * 60),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeHsl(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;
}

function makeCustomPlateStyle(colorHex: string) {
  const rgb = hexToRgb(colorHex);
  if (!rgb) return PLATE_COLOR_STYLES.black;

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    gA: makeHsl(h, clamp(s, 18, 85), clamp(l + 10, 16, 42)),
    gB: makeHsl(h, clamp(s, 18, 90), clamp(l - 12, 8, 24)),
    gC: makeHsl(h, clamp(s, 18, 88), clamp(l + 3, 12, 32)),
    sheen: "rgba(255,255,255,0.08)",
    border: makeHsl(h, clamp(s - 12, 12, 70), clamp(l + 14, 26, 52)),
    border2: "rgba(255,255,255,0.04)",
  };
}

export function findColorOption(colorId: string | undefined, colors?: ColorOption[] | null) {
  const id = colorId ?? "black";
  return colors?.find((color) => color.id === id) ?? DEFAULT_COLOR_PALETTE.find((color) => color.id === id) ?? null;
}

export function getColorLabel(colorId: string | undefined, colors?: ColorOption[] | null) {
  return findColorOption(colorId, colors)?.label ?? colorId ?? "black";
}

export function getColorHex(colorId: string | undefined, colors?: ColorOption[] | null) {
  return findColorOption(colorId, colors)?.hex ?? DEFAULT_COLOR_PALETTE[0]?.hex ?? "#1a2035";
}

export function getPlateStyle(colorId: string, colorHex?: string) {
  return PLATE_COLOR_STYLES[colorId] ?? (colorHex ? makeCustomPlateStyle(colorHex) : PLATE_COLOR_STYLES.black);
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
