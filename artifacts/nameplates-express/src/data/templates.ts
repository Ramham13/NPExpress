export interface TagSize {
  id: string;
  width: number;
  height: number;
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

export const TAG_SIZES: TagSize[] = [
  { id: "1x3",  width: 1,  height: 3,  label: '1" × 3"' },
  { id: "2x4",  width: 2,  height: 4,  label: '2" × 4"' },
  { id: "2x6",  width: 2,  height: 6,  label: '2" × 6"' },
  { id: "3x6",  width: 3,  height: 6,  label: '3" × 6"' },
  { id: "3x9",  width: 3,  height: 9,  label: '3" × 9"' },
  { id: "4x8",  width: 4,  height: 8,  label: '4" × 8"' },
  { id: "4x10", width: 4,  height: 10, label: '4" × 10"' },
];

export const TEMPLATES: Template[] = [
  {
    id: "equipment-id",
    name: "Equipment ID Tag",
    description: "Two-line tag for equipment name and serial/part number.",
    compatibleSizes: ["1x3", "2x4", "2x6", "3x6", "3x9", "4x8", "4x10"],
    zones: [
      {
        id: "name",
        label: "Equipment Name",
        placeholder: "PUMP MOTOR A",
        xPct: 5, yPct: 8, widthPct: 90, heightPct: 44,
        align: "center",
      },
      {
        id: "serial",
        label: "Serial / Part Number",
        placeholder: "SN: 00123-B",
        xPct: 5, yPct: 56, widthPct: 90, heightPct: 36,
        align: "center",
      },
    ],
  },
  {
    id: "valve-tag",
    name: "Valve Tag",
    description: "Large tag number with a smaller description line below.",
    compatibleSizes: ["1x3", "2x4", "2x6"],
    zones: [
      {
        id: "tagno",
        label: "Tag Number",
        placeholder: "V-101",
        xPct: 5, yPct: 8, widthPct: 90, heightPct: 52,
        align: "center",
      },
      {
        id: "desc",
        label: "Description",
        placeholder: "FEED WATER SUPPLY",
        xPct: 5, yPct: 64, widthPct: 90, heightPct: 28,
        align: "center",
      },
    ],
  },
  {
    id: "control-panel",
    name: "Control Panel Label",
    description: "Wide-format label with function name and circuit identifier.",
    compatibleSizes: ["2x6", "3x6", "3x9", "4x8", "4x10"],
    zones: [
      {
        id: "function",
        label: "Function / Label",
        placeholder: "MAIN DISCONNECT",
        xPct: 5, yPct: 10, widthPct: 90, heightPct: 48,
        align: "center",
      },
      {
        id: "circuit",
        label: "Circuit / Panel ID",
        placeholder: "PANEL MCC-3, CB-12",
        xPct: 5, yPct: 62, widthPct: 90, heightPct: 28,
        align: "center",
      },
    ],
  },
  {
    id: "warning",
    name: "Warning / Safety Plate",
    description: "Bold header warning with a body text area for instructions.",
    compatibleSizes: ["3x6", "3x9", "4x8", "4x10"],
    zones: [
      {
        id: "header",
        label: "Warning Header",
        placeholder: "WARNING",
        xPct: 5, yPct: 6, widthPct: 90, heightPct: 30,
        align: "center",
      },
      {
        id: "body",
        label: "Safety Instructions",
        placeholder: "HIGH VOLTAGE — DO NOT OPEN\nAUTHORIZED PERSONNEL ONLY",
        xPct: 5, yPct: 40, widthPct: 90, heightPct: 52,
        align: "center",
      },
    ],
  },
  {
    id: "single-line",
    name: "Single-Line Nameplate",
    description: "Clean single text line centered on the plate.",
    compatibleSizes: ["1x3", "2x4", "2x6", "3x6", "3x9", "4x8", "4x10"],
    zones: [
      {
        id: "text",
        label: "Text",
        placeholder: "MOTOR CONTROL CENTER",
        xPct: 5, yPct: 20, widthPct: 90, heightPct: 60,
        align: "center",
      },
    ],
  },
  {
    id: "three-line",
    name: "Three-Line Nameplate",
    description: "Three stacked text rows for detailed labeling.",
    compatibleSizes: ["2x6", "3x6", "3x9", "4x8", "4x10"],
    zones: [
      {
        id: "line1",
        label: "Line 1",
        placeholder: "ACME INDUSTRIES",
        xPct: 5, yPct: 6, widthPct: 90, heightPct: 26,
        align: "center",
      },
      {
        id: "line2",
        label: "Line 2",
        placeholder: "UNIT NO. 4 — COMPRESSOR",
        xPct: 5, yPct: 37, widthPct: 90, heightPct: 26,
        align: "center",
      },
      {
        id: "line3",
        label: "Line 3",
        placeholder: "SN: 00456 / MFG: 2024",
        xPct: 5, yPct: 68, widthPct: 90, heightPct: 26,
        align: "center",
      },
    ],
  },
];

export const FONT_OPTIONS: FontOption[] = [
  { id: "arial",    label: "Arial",           family: "Arial, sans-serif" },
  { id: "helvetica",label: "Helvetica Neue",  family: "'Helvetica Neue', Helvetica, sans-serif" },
  { id: "impact",   label: "Impact",          family: "Impact, 'Arial Narrow', sans-serif" },
  { id: "courier",  label: "Courier Mono",    family: "'Courier New', Courier, monospace" },
  { id: "georgia",  label: "Georgia",         family: "Georgia, 'Times New Roman', serif" },
  { id: "times",    label: "Times New Roman", family: "'Times New Roman', Times, serif" },
];

export const FONT_SIZE_OPTIONS = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48];
