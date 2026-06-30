export interface TagSize {
  id: string;
  width: number;  // landscape: width is the LONGER dimension
  height: number; // landscape: height is the SHORTER dimension
  label: string;
}

export interface TextZone {
  id: string;
  label: string;
  placeholder: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  align: "left" | "center";
  multiline?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  compatibleSizes: string[];
  zones: TextZone[];
}

export interface FontOption {
  id: string;
  label: string;
  family: string;
}

export interface ZoneConfig {
  text: string;
  fontId: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  hAlign: "left" | "center" | "right";
  vAlign: "top" | "center" | "bottom";
  wordWrap: boolean;
}

export type ZoneConfigs = Record<string, ZoneConfig>;

// All tags are landscape: width > height
export const TAG_SIZES: TagSize[] = [
  { id: "3x1",  width: 3,  height: 1,  label: '3" × 1"' },
  { id: "4x2",  width: 4,  height: 2,  label: '4" × 2"' },
  { id: "6x2",  width: 6,  height: 2,  label: '6" × 2"' },
  { id: "6x3",  width: 6,  height: 3,  label: '6" × 3"' },
  { id: "9x3",  width: 9,  height: 3,  label: '9" × 3"' },
  { id: "8x4",  width: 8,  height: 4,  label: '8" × 4"' },
  { id: "10x4", width: 10, height: 4,  label: '10" × 4"' },
];

export const TEMPLATES: Template[] = [
  {
    id: "equipment-id",
    name: "Equipment ID Tag",
    description: "Two-line tag for equipment name and serial/part number.",
    compatibleSizes: ["3x1", "4x2", "6x2", "6x3", "9x3", "8x4", "10x4"],
    zones: [
      { id: "name",   label: "Equipment Name",       placeholder: "PUMP MOTOR A",       xPct: 4, yPct: 8,  widthPct: 92, heightPct: 42, align: "center" },
      { id: "serial", label: "Serial / Part Number", placeholder: "SN: 00123-B",        xPct: 4, yPct: 54, widthPct: 92, heightPct: 38, align: "center" },
    ],
  },
  {
    id: "valve-tag",
    name: "Valve Tag",
    description: "Large tag number with a smaller description line below.",
    compatibleSizes: ["3x1", "4x2", "6x2"],
    zones: [
      { id: "tagno", label: "Tag Number",  placeholder: "V-101",             xPct: 4, yPct: 6,  widthPct: 92, heightPct: 52, align: "center" },
      { id: "desc",  label: "Description", placeholder: "FEED WATER SUPPLY", xPct: 4, yPct: 62, widthPct: 92, heightPct: 30, align: "center" },
    ],
  },
  {
    id: "control-panel",
    name: "Control Panel Label",
    description: "Wide-format label with function name and circuit identifier.",
    compatibleSizes: ["6x2", "6x3", "9x3", "8x4", "10x4"],
    zones: [
      { id: "function", label: "Function / Label",  placeholder: "MAIN DISCONNECT",    xPct: 4, yPct: 8,  widthPct: 92, heightPct: 46, align: "center" },
      { id: "circuit",  label: "Circuit / Panel ID", placeholder: "PANEL MCC-3, CB-12", xPct: 4, yPct: 58, widthPct: 92, heightPct: 32, align: "center" },
    ],
  },
  {
    id: "warning",
    name: "Warning / Safety Plate",
    description: "Bold header warning with a body text area for instructions.",
    compatibleSizes: ["6x3", "9x3", "8x4", "10x4"],
    zones: [
      { id: "header", label: "Warning Header",       placeholder: "WARNING",                                         xPct: 4, yPct: 6,  widthPct: 92, heightPct: 30, align: "center" },
      { id: "body",   label: "Safety Instructions",  placeholder: "HIGH VOLTAGE — DO NOT OPEN\nAUTHORIZED PERSONNEL ONLY", xPct: 4, yPct: 40, widthPct: 92, heightPct: 52, align: "center", multiline: true },
    ],
  },
  {
    id: "single-line",
    name: "Single-Line Nameplate",
    description: "Clean single text line centered on the plate.",
    compatibleSizes: ["3x1", "4x2", "6x2", "6x3", "9x3", "8x4", "10x4"],
    zones: [
      { id: "text", label: "Text", placeholder: "MOTOR CONTROL CENTER", xPct: 4, yPct: 18, widthPct: 92, heightPct: 64, align: "center" },
    ],
  },
  {
    id: "three-line",
    name: "Three-Line Nameplate",
    description: "Three stacked text rows for detailed labeling.",
    compatibleSizes: ["6x2", "6x3", "9x3", "8x4", "10x4"],
    zones: [
      { id: "line1", label: "Line 1", placeholder: "ACME INDUSTRIES",          xPct: 4, yPct: 5,  widthPct: 92, heightPct: 28, align: "center" },
      { id: "line2", label: "Line 2", placeholder: "UNIT NO. 4 — COMPRESSOR",  xPct: 4, yPct: 36, widthPct: 92, heightPct: 28, align: "center" },
      { id: "line3", label: "Line 3", placeholder: "SN: 00456 / MFG: 2024",    xPct: 4, yPct: 67, widthPct: 92, heightPct: 28, align: "center" },
    ],
  },
];

export const FONT_OPTIONS: FontOption[] = [
  { id: "arial",     label: "Arial",           family: "Arial, sans-serif" },
  { id: "helvetica", label: "Helvetica Neue",  family: "'Helvetica Neue', Helvetica, sans-serif" },
  { id: "impact",    label: "Impact",          family: "Impact, 'Arial Narrow', sans-serif" },
  { id: "courier",   label: "Courier Mono",    family: "'Courier New', Courier, monospace" },
  { id: "georgia",   label: "Georgia",         family: "Georgia, 'Times New Roman', serif" },
  { id: "times",     label: "Times New Roman", family: "'Times New Roman', Times, serif" },
];

export const FONT_SIZE_OPTIONS = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48];

export function defaultZoneConfig(): ZoneConfig {
  return {
    text: "", fontId: "arial", fontSize: 14,
    bold: true, italic: false,
    hAlign: "center", vAlign: "center",
    wordWrap: false,
  };
}

/** Approximate capital-letter height in inches for a given point size.
 *  Cap height ≈ 72% of em; 1 pt = 1/72 in.
 */
export function approxLetterHeightIn(fontSize: number): string {
  return (fontSize * 0.72 / 72).toFixed(3);
}
