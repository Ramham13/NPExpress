/**
 * Shared plate geometry, text layout, and cart types.
 * Used by both the editor preview and the clean final-product preview.
 */
import {
  FONT_OPTIONS, defaultZoneConfig,
  type TagSize, type TextZone, type ZoneConfigs, type ZoneConfig,
} from "@/data/templates";

// ─── Constants ────────────────────────────────────────────────────────────────
export const SVG_VW    = 1000;
export const PAD_RATIO = 0.018; // plate outer edge padding as fraction of VW
export const STEP = 5;
export const MIN_SEG = 10;

// Zone geometry — horizontal mode (percentages of inner plate dimensions)
export const H_TOP = 5, H_BOT = 5, H_GAP = 2;
// Zone geometry — vertical mode
export const V_TOP = 5, V_BOT = 5, V_LEFT = 4, V_RIGHT = 4, V_GAP = 1;

// ─── Types ────────────────────────────────────────────────────────────────────
export type Direction    = "horizontal" | "vertical";
export type DividerStyle = "solid" | "dotted" | "dashed";
export interface DividerConfig { enabled: boolean; style: DividerStyle; }
export interface OverflowInfo  { widthOverflow: boolean; heightOverflow: boolean; overflows: boolean; }

export interface CartItem {
  id: string;
  size: TagSize;
  direction: Direction;
  heights: number[];
  widths: number[];
  lineConfigs: ZoneConfigs;
  dividers: DividerConfig[];
  addedAt: number;
  batchId?: string; // links items from the same CSV import
}

// ─── Segment helpers ──────────────────────────────────────────────────────────
export const snap = (v: number) => Math.round(v / STEP) * STEP;

export function defaultSegments(n: number): number[] {
  const base = snap(Math.floor(100 / n / STEP) * STEP);
  const arr  = Array(n).fill(base);
  let diff   = 100 - arr.reduce((a: number, b: number) => a + b, 0);
  for (let i = arr.length - 1; i >= 0 && diff !== 0; i--) {
    const add = Math.sign(diff) * STEP; arr[i] += add; diff -= add;
  }
  return arr;
}

export function heightsFromTemplate(zones: TextZone[]): number[] {
  const total   = zones.reduce((s, z) => s + z.heightPct, 0);
  const raw     = zones.map((z) => snap((z.heightPct / total) * 100));
  const diff    = 100 - raw.reduce((a, b) => a + b, 0);
  const biggest = raw.indexOf(Math.max(...raw));
  raw[biggest]  = Math.max(MIN_SEG, raw[biggest] + diff);
  return raw.map((v) => Math.max(MIN_SEG, v));
}

export function adjustOne(segs: number[], idx: number, delta: number): number[] {
  const n = segs.length;
  const proposed = segs[idx] + delta;
  if (proposed < MIN_SEG || proposed > 100 - MIN_SEG * (n - 1)) return segs;
  const others = [...Array(n).keys()].filter((i) => i !== idx);
  if (delta > 0) {
    const donor = others.filter((i) => segs[i] - STEP >= MIN_SEG).sort((a, b) => segs[b] - segs[a])[0];
    if (donor === undefined) return segs;
    const next = [...segs]; next[idx] += STEP; next[donor] -= STEP; return next;
  } else {
    const recipient = others.sort((a, b) => segs[a] - segs[b])[0];
    const next = [...segs]; next[idx] -= STEP; next[recipient] += STEP; return next;
  }
}

export function moveDivider(segs: number[], idx: number, deltaPct: number): number[] {
  const combined = segs[idx] + segs[idx + 1];
  const newI     = Math.max(MIN_SEG, Math.min(combined - MIN_SEG, segs[idx] + deltaPct));
  const snappedI = snap(newI);
  const snappedJ = combined - snappedI;
  if (snappedJ < MIN_SEG) return segs;
  const next = [...segs]; next[idx] = snappedI; next[idx + 1] = snappedJ; return next;
}

export const defaultDivider  = (): DividerConfig  => ({ enabled: false, style: "solid" });
export const defaultDividers = (n: number): DividerConfig[] =>
  Array.from({ length: Math.max(0, n - 1) }, defaultDivider);

// ─── Zone geometry ────────────────────────────────────────────────────────────

export function computeHZones(heights: number[]): TextZone[] {
  const n = heights.length;
  const avail = 100 - H_TOP - H_BOT - H_GAP * (n - 1);
  let yOff = H_TOP;
  return heights.map((h, i) => {
    const hPct = (h / 100) * avail;
    const zone: TextZone = {
      id: `line${i + 1}`,
      label: n === 1 ? "Text" : `Line ${i + 1}`,
      placeholder: n === 1 ? "YOUR TEXT HERE" : `LINE ${i + 1}`,
      xPct: V_LEFT, yPct: yOff, widthPct: 100 - V_LEFT - V_RIGHT, heightPct: hPct,
      align: "center" as const,
    };
    yOff += hPct + H_GAP;
    return zone;
  });
}

export function computeVZones(widths: number[]): TextZone[] {
  const n = widths.length;
  const avail = 100 - V_LEFT - V_RIGHT - V_GAP * (n - 1);
  const LABELS = ["HAND", "OFF", "AUTO", "COL 4", "COL 5"];
  let xOff = V_LEFT;
  return widths.map((w, i) => {
    const wPct = (w / 100) * avail;
    const zone: TextZone = {
      id: `line${i + 1}`,
      label: n === 1 ? "Text" : `Col ${i + 1}`,
      placeholder: n === 1 ? "YOUR TEXT HERE" : LABELS[i] ?? `COL ${i + 1}`,
      xPct: xOff, yPct: V_TOP, widthPct: wPct, heightPct: 100 - V_TOP - V_BOT,
      align: "center" as const,
    };
    xOff += wPct + V_GAP;
    return zone;
  });
}

// ─── Font size conversion ─────────────────────────────────────────────────────
/** Convert point size to SVG pixels. Uses the plate's physical width so the
 *  result is absolute — does NOT scale with zone size. */
export function ptToSvgPx(pt: number, sizeWidthIn: number): number {
  return Math.max(4, pt / 72 * (SVG_VW / sizeWidthIn));
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function wrapWords(text: string, fontSpec: string, maxW: number): string[] {
  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d")!;
  ctx.font     = fontSpec;
  const result: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { result.push(""); continue; }
    let current = "";
    for (const word of para.split(" ")) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxW) { current = test; }
      else { if (current) result.push(current); current = word; }
    }
    if (current) result.push(current);
  }
  return result.length ? result : [""];
}

// ─── Text layout ──────────────────────────────────────────────────────────────
/**
 * Compute all SVG text positioning for one zone.
 *
 * Uses dominantBaseline="hanging" convention: y = TOP of em square.
 * This makes the math exact:
 *   top    → firstLineY = zy
 *   center → firstLineY = zy + (zh − blockH) / 2
 *   bottom → firstLineY = zy + zh − blockH
 * No font-metric approximations needed.
 */
export interface TextLayout {
  lines: string[];
  lineH: number;
  svgPt: number;
  firstLineY: number;
  textX: number;
  anchor: "start" | "middle" | "end";
}

export function computeTextLayout(
  cfg: ZoneConfig,
  zone: TextZone,
  zx: number, zy: number, zw: number, zh: number,
  size: TagSize,
  isPlaceholder: boolean,
): TextLayout {
  const font      = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
  const displayTx = cfg.text || zone.placeholder;
  const svgPt     = ptToSvgPx(cfg.fontSize, size.width);
  const lineH     = svgPt * 1.2; // 120% line height — tight but readable
  const fontSpec  = `${cfg.italic ? "italic " : ""}${cfg.bold ? "bold " : ""}${svgPt}px ${font.family}`;

  const rawLines = (!isPlaceholder && cfg.wordWrap)
    ? wrapWords(displayTx, fontSpec, zw)
    : displayTx.split("\n");
  const lines = rawLines.length ? rawLines : [""];

  // Horizontal anchor
  let textX: number, anchor: "start" | "middle" | "end";
  if (cfg.hAlign === "left")       { textX = zx;          anchor = "start";  }
  else if (cfg.hAlign === "right") { textX = zx + zw;     anchor = "end";    }
  else                             { textX = zx + zw / 2; anchor = "middle"; }

  // Vertical: y = top of em square (dominantBaseline="hanging")
  const blockH     = lines.length * lineH;
  let firstLineY: number;
  if (cfg.vAlign === "top")         firstLineY = zy;
  else if (cfg.vAlign === "bottom") firstLineY = zy + zh - blockH;
  else                              firstLineY = zy + (zh - blockH) / 2;

  return { lines, lineH, svgPt, firstLineY, textX, anchor };
}

// ─── Overflow detection ───────────────────────────────────────────────────────

export function computeOverflowMap(
  zones: TextZone[], lineConfigs: ZoneConfigs, size: TagSize,
): Record<string, OverflowInfo> {
  const VW = SVG_VW;
  const VH = Math.round(VW * size.height / size.width);
  const PAD = VW * PAD_RATIO;
  const innerW = VW - PAD * 2, innerH = VH - PAD * 2;
  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d")!;
  const result: Record<string, OverflowInfo> = {};
  for (const zone of zones) {
    const cfg  = lineConfigs[zone.id] ?? defaultZoneConfig();
    const text = cfg.text.trim();
    if (!text) { result[zone.id] = { widthOverflow: false, heightOverflow: false, overflows: false }; continue; }
    const zh   = (zone.heightPct / 100) * innerH;
    const zw   = (zone.widthPct  / 100) * innerW;
    const svgPt   = ptToSvgPx(cfg.fontSize, size.width);
    const lineH   = svgPt * 1.2;
    const font    = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
    const fontSpec = `${cfg.italic ? "italic " : ""}${cfg.bold ? "bold " : ""}${svgPt}px ${font.family}`;
    ctx.font = fontSpec;
    const renderLines   = cfg.wordWrap ? wrapWords(text, fontSpec, zw) : text.split("\n");
    const maxLineW      = Math.max(...renderLines.map((l) => ctx.measureText(l || " ").width));
    const totalH        = renderLines.length * lineH;
    const widthOverflow  = !cfg.wordWrap && maxLineW > zw;
    const heightOverflow = totalH > zh;
    result[zone.id] = { widthOverflow, heightOverflow, overflows: widthOverflow || heightOverflow };
  }
  return result;
}

// ─── Divider line SVG attributes ──────────────────────────────────────────────
export function dividerDashArray(style: DividerStyle): string {
  if (style === "dotted") return `${SVG_VW * 0.003},${SVG_VW * 0.009}`;
  if (style === "dashed") return `${SVG_VW * 0.022},${SVG_VW * 0.011}`;
  return "none";
}
