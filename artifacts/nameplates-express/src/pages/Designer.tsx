import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { RotateCcw, Bold, Italic, AlignLeft, AlignCenter, AlignRight, WrapText, AlertTriangle, Rows3, Columns3 } from "lucide-react";
import {
  TAG_SIZES, TEMPLATES, FONT_OPTIONS, FONT_SIZE_OPTIONS,
  defaultZoneConfig, approxLetterHeightIn,
  type TagSize, type Template, type TextZone, type ZoneConfigs, type ZoneConfig,
} from "@/data/templates";

// ─── Constants ────────────────────────────────────────────────────────────────
const STEP = 5;
const MIN_H = 10;
const SVG_VW = 1000;
const PAD_RATIO  = 0.018;
const IPAD_RATIO = 0.008;

// Zone geometry — horizontal mode
const H_TOP = 5, H_BOT = 5, H_GAP = 2;
// Zone geometry — vertical mode
const V_TOP = 5, V_BOT = 5, V_LEFT = 4, V_RIGHT = 4, V_GAP = 1;

// ─── Divider / overflow types ─────────────────────────────────────────────────
type Direction     = "horizontal" | "vertical";
type DividerStyle  = "solid" | "dotted" | "dashed";
interface DividerConfig { enabled: boolean; style: DividerStyle; }
interface OverflowInfo  { widthOverflow: boolean; heightOverflow: boolean; overflows: boolean; }

const defaultDivider  = (): DividerConfig  => ({ enabled: false, style: "solid" });
const defaultDividers = (n: number): DividerConfig[] =>
  Array.from({ length: Math.max(0, n - 1) }, defaultDivider);

// ─── Segment helpers (shared for heights and widths) ─────────────────────────
const snap = (v: number) => Math.round(v / STEP) * STEP;

function defaultSegments(n: number): number[] {
  const base = snap(Math.floor(100 / n / STEP) * STEP);
  const arr  = Array(n).fill(base);
  let diff   = 100 - arr.reduce((a: number, b: number) => a + b, 0);
  for (let i = arr.length - 1; i >= 0 && diff !== 0; i--) {
    const add = Math.sign(diff) * STEP; arr[i] += add; diff -= add;
  }
  return arr;
}

function heightsFromTemplate(zones: TextZone[]): number[] {
  const total = zones.reduce((s, z) => s + z.heightPct, 0);
  const raw   = zones.map((z) => snap((z.heightPct / total) * 100));
  const diff  = 100 - raw.reduce((a, b) => a + b, 0);
  const biggest = raw.indexOf(Math.max(...raw));
  raw[biggest] = Math.max(MIN_H, raw[biggest] + diff);
  return raw.map((v) => Math.max(MIN_H, v));
}

/** Adjust one segment by ±STEP, stealing from / giving to the most generous peer. */
function adjustOne(segs: number[], idx: number, delta: number): number[] {
  const n = segs.length;
  const proposed = segs[idx] + delta;
  if (proposed < MIN_H || proposed > 100 - MIN_H * (n - 1)) return segs;
  const others = [...Array(n).keys()].filter((i) => i !== idx);
  if (delta > 0) {
    const donor = others.filter((i) => segs[i] - STEP >= MIN_H).sort((a, b) => segs[b] - segs[a])[0];
    if (donor === undefined) return segs;
    const next = [...segs]; next[idx] += STEP; next[donor] -= STEP; return next;
  } else {
    const recipient = others.sort((a, b) => segs[a] - segs[b])[0];
    const next = [...segs]; next[idx] -= STEP; next[recipient] += STEP; return next;
  }
}

/** Move the divider between segs[idx] and segs[idx+1]; returns same ref if impossible. */
function moveDivider(segs: number[], idx: number, deltaPct: number): number[] {
  const combined = segs[idx] + segs[idx + 1];
  const newI      = Math.max(MIN_H, Math.min(combined - MIN_H, segs[idx] + deltaPct));
  const snappedI  = snap(newI);
  const snappedJ  = combined - snappedI;
  if (snappedJ < MIN_H) return segs;
  const next = [...segs]; next[idx] = snappedI; next[idx + 1] = snappedJ; return next;
}

// ─── Zone geometry ────────────────────────────────────────────────────────────

/** Horizontal layout: stacked zones top-to-bottom. */
function computeHZones(heights: number[]): TextZone[] {
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

/** Vertical layout: side-by-side columns left-to-right. */
function computeVZones(widths: number[]): TextZone[] {
  const n = widths.length;
  const avail = 100 - V_LEFT - V_RIGHT - V_GAP * (n - 1); // % of innerW
  const HAND_LABELS = ["HAND", "OFF", "AUTO", "COL 4", "COL 5"];
  let xOff = V_LEFT;
  return widths.map((w, i) => {
    const wPct = (w / 100) * avail;
    const zone: TextZone = {
      id: `line${i + 1}`,
      label: n === 1 ? "Text" : `Col ${i + 1}`,
      placeholder: n === 1 ? "YOUR TEXT HERE" : HAND_LABELS[i] ?? `COL ${i + 1}`,
      xPct: xOff, yPct: V_TOP, widthPct: wPct, heightPct: 100 - V_TOP - V_BOT,
      align: "center" as const,
    };
    xOff += wPct + V_GAP;
    return zone;
  });
}

// ─── Word-wrap + overflow ─────────────────────────────────────────────────────

function wrapWords(text: string, fontSpec: string, maxW: number): string[] {
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

function computeOverflowMap(
  zones: TextZone[], lineConfigs: ZoneConfigs, size: TagSize,
): Record<string, OverflowInfo> {
  const VW = SVG_VW;
  const VH = Math.round(VW * size.height / size.width);
  const PAD = VW * PAD_RATIO, INNER_PAD = VW * IPAD_RATIO;
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
    const availW = zw - 2 * INNER_PAD;
    const svgFontSize = Math.max(10, Math.min(cfg.fontSize * (VW / 100), zh * 0.58));
    const lineH       = svgFontSize * 1.28;
    const font        = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
    const fontSpec    = `${cfg.italic ? "italic " : ""}${cfg.bold ? "bold " : ""}${svgFontSize}px ${font.family}`;
    ctx.font = fontSpec;
    const renderLines  = cfg.wordWrap ? wrapWords(text, fontSpec, availW) : text.split("\n");
    const maxLineW     = Math.max(...renderLines.map((l) => ctx.measureText(l || " ").width));
    const totalH       = renderLines.length * lineH;
    const widthOverflow  = !cfg.wordWrap && maxLineW > availW;
    const heightOverflow = totalH > zh;
    result[zone.id] = { widthOverflow, heightOverflow, overflows: widthOverflow || heightOverflow };
  }
  return result;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Designer() {
  const [selectedSize, setSelectedSize] = useState<TagSize | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [direction, setDirection]  = useState<Direction>("horizontal");
  const [heights,   setHeights]    = useState<number[]>([100]);
  const [widths,    setWidths]     = useState<number[]>([100]);
  const [lineConfigs, setLineConfigs] = useState<ZoneConfigs>({ line1: defaultZoneConfig() });
  const [dividers,    setDividers]   = useState<DividerConfig[]>([]);

  const segments    = direction === "horizontal" ? heights : widths;
  const numSegments = segments.length;

  const zones = useMemo(
    () => direction === "horizontal" ? computeHZones(heights) : computeVZones(widths),
    [direction, heights, widths],
  );

  const overflowMap = useMemo<Record<string, OverflowInfo>>(
    () => selectedSize ? computeOverflowMap(zones, lineConfigs, selectedSize) : {},
    [zones, lineConfigs, selectedSize],
  );
  const hasOverflow = Object.values(overflowMap).some((v) => v.overflows);

  const compatibleTemplates = selectedSize
    ? TEMPLATES.filter((t) => t.compatibleSizes.includes(selectedSize.id))
    : [];

  function pickSize(size: TagSize) {
    setSelectedSize(size);
    setActiveTemplateId(null);
    setDirection("horizontal");
    setHeights([100]); setWidths([100]);
    setLineConfigs({ line1: defaultZoneConfig() });
    setDividers([]);
  }

  function selectBlank() { setActiveTemplateId(null); }

  function selectTemplate(template: Template) {
    setActiveTemplateId(template.id);
    const h = heightsFromTemplate(template.zones);
    setHeights(h);
    setDividers(defaultDividers(h.length));
    const cfg: ZoneConfigs = {};
    template.zones.forEach((_, i) => {
      const id = `line${i + 1}`;
      cfg[id] = lineConfigs[id] ?? defaultZoneConfig();
    });
    setLineConfigs(cfg);
  }

  function changeDirection(dir: Direction) {
    setDirection(dir);
    setActiveTemplateId(null);
    // Reset dividers to match the segment count for that direction
    const n = dir === "horizontal" ? heights.length : widths.length;
    setDividers(defaultDividers(n));
  }

  function changeNumSegments(n: number) {
    setActiveTemplateId(null);
    const segs    = defaultSegments(n);
    const oldVals = Object.values(lineConfigs);
    const cfg: ZoneConfigs = {};
    segs.forEach((_, i) => { const id = `line${i + 1}`; cfg[id] = oldVals[i] ?? defaultZoneConfig(); });
    if (direction === "horizontal") setHeights(segs); else setWidths(segs);
    setLineConfigs(cfg);
    setDividers((prev) => Array.from({ length: n - 1 }, (_, i) => prev[i] ?? defaultDivider()));
  }

  function adjustSegment(idx: number, delta: number) {
    if (direction === "horizontal") setHeights((p) => adjustOne(p, idx, delta));
    else                            setWidths((p)  => adjustOne(p, idx, delta));
    setActiveTemplateId(null);
  }

  const handleSegmentsChange = useCallback((segs: number[]) => {
    if (direction === "horizontal") setHeights(segs); else setWidths(segs);
    setActiveTemplateId(null);
  }, [direction]);

  function updateZone(zoneId: string, patch: Partial<ZoneConfig>) {
    setLineConfigs((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], ...patch } }));
  }
  function updateDivider(idx: number, patch: Partial<DividerConfig>) {
    setDividers((prev) => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next; });
  }

  if (!selectedSize) return <SizePicker onPick={pickSize} />;

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
      <header className="bg-[hsl(220_25%_12%)] text-white border-b border-slate-700 flex-shrink-0">
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
              <span className="text-xs font-black text-white">NX</span>
            </div>
            <span className="text-sm font-bold tracking-tight hidden sm:block">
              Nameplates<span className="text-primary">Express</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-300 bg-slate-700 rounded px-2 py-0.5">
              {selectedSize.label} · Landscape · Black Anodized Aluminum
            </span>
            <button data-testid="button-change-size" onClick={() => setSelectedSize(null)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap">
              <RotateCcw size={11} /> Change Size
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <aside className="lg:w-44 xl:w-52 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto bg-muted/20" style={{ minHeight: 0 }}>
          <TemplatePanel size={selectedSize} templates={compatibleTemplates}
            activeTemplateId={activeTemplateId} onBlank={selectBlank} onTemplate={selectTemplate} />
        </aside>

        <div className="flex-1 flex items-center justify-center overflow-hidden bg-[hsl(220_20%_8%)] p-4 lg:p-8" style={{ minHeight: "180px", minWidth: 0 }}>
          <PlatePreview size={selectedSize} zones={zones} lineConfigs={lineConfigs}
            segments={segments} direction={direction} dividers={dividers}
            overflowMap={overflowMap} onSegmentsChange={handleSegmentsChange} />
        </div>

        <aside className="lg:w-72 xl:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto bg-background" style={{ minHeight: 0 }}>
          <CustomizePanel zones={zones} lineConfigs={lineConfigs}
            numSegments={numSegments} segments={segments}
            direction={direction} dividers={dividers}
            overflowMap={overflowMap} hasOverflow={hasOverflow}
            onChangeDirection={changeDirection}
            onChangeNumSegments={changeNumSegments}
            onAdjustSegment={adjustSegment}
            onUpdateZone={updateZone} onUpdateDivider={updateDivider} />
        </aside>
      </div>
    </div>
  );
}

// ─── Size picker ──────────────────────────────────────────────────────────────

function SizePicker({ onPick }: { onPick: (s: TagSize) => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-[hsl(220_25%_12%)] text-white border-b border-slate-700">
        <div className="px-4 py-3 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
            <span className="text-xs font-black text-white">NX</span>
          </div>
          <span className="text-sm font-bold tracking-tight">
            Nameplates<span className="text-primary">Express</span>
          </span>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-black text-foreground">Select Nameplate Size</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          All nameplates are landscape orientation. Select a size to open the designer.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {TAG_SIZES.map((size) => {
            const aspect = size.height / size.width;
            const thumbH = Math.min(48, Math.max(14, Math.round(88 * aspect)));
            const thumbW = Math.round(thumbH / aspect);
            return (
              <button key={size.id} data-testid={`button-size-${size.id}`} onClick={() => onPick(size)}
                className="group flex flex-col items-center gap-3 rounded border border-border bg-card p-4 text-center transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
                <div className="rounded-sm flex-shrink-0" style={{
                  width: thumbW, height: thumbH,
                  background: "linear-gradient(145deg, hsl(220 20% 18%), hsl(220 15% 10%))",
                  border: "2px solid hsl(220 20% 30%)",
                }} />
                <p className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">{size.label}</p>
              </button>
            );
          })}
        </div>
      </div>
      <footer className="mt-auto border-t border-border py-4 text-center text-xs text-muted-foreground">
        Nameplates Express &bull; Anodized Aluminum &bull; Black
      </footer>
    </div>
  );
}

// ─── Left panel ───────────────────────────────────────────────────────────────

function TemplatePanel({ size, templates, activeTemplateId, onBlank, onTemplate }: {
  size: TagSize; templates: Template[]; activeTemplateId: string | null;
  onBlank: () => void; onTemplate: (t: Template) => void;
}) {
  const isBlankActive = activeTemplateId === null;
  return (
    <div className="p-2">
      <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Templates</p>
      <button data-testid="button-template-blank" onClick={onBlank}
        className={`w-full rounded mb-1 p-2 text-left transition-all border ${isBlankActive ? "border-primary bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/50"}`}>
        <div className="mb-1.5 w-full rounded" style={{
          height: Math.max(18, Math.round(160 * size.height / size.width)),
          background: "linear-gradient(145deg, hsl(220 20% 18%), hsl(220 15% 10%))",
          border: "1.5px solid hsl(220 20% 30%)",
        }} />
        <p className={`text-xs font-semibold ${isBlankActive ? "text-primary" : "text-foreground"}`}>Blank</p>
        <p className="text-[10px] text-muted-foreground">Start from scratch</p>
      </button>
      {templates.map((t) => {
        const isActive = activeTemplateId === t.id;
        const W = 160, H = Math.max(18, Math.round(W * size.height / size.width));
        return (
          <button key={t.id} data-testid={`button-template-${t.id}`} onClick={() => onTemplate(t)}
            className={`w-full rounded mb-1 p-2 text-left transition-all border ${isActive ? "border-primary bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/50"}`}>
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="mb-1.5 block rounded">
              <defs>
                <linearGradient id={`tg-${t.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 20%, 18%)" />
                  <stop offset="100%" stopColor="hsl(220, 15%, 10%)" />
                </linearGradient>
              </defs>
              <rect width={W} height={H} rx={2} fill={`url(#tg-${t.id})`} />
              <rect width={W} height={H} rx={2} fill="none" stroke="hsl(220, 20%, 30%)" strokeWidth={1} />
              {t.zones.map((zone) => (
                <rect key={zone.id}
                  x={(zone.xPct / 100) * W} y={(zone.yPct / 100) * H}
                  width={(zone.widthPct / 100) * W} height={(zone.heightPct / 100) * H}
                  fill="hsl(215, 25%, 22%)" stroke="hsl(215, 25%, 38%)"
                  strokeWidth={0.5} strokeDasharray="2,2" rx={1} />
              ))}
            </svg>
            <p className={`text-xs font-semibold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>{t.name}</p>
          </button>
        );
      })}
    </div>
  );
}

// ─── Center: live SVG plate preview ──────────────────────────────────────────

type DragState = {
  idx: number;
  startClientY: number;
  startClientX: number;
  startValues: number[];
  lastDelta: number;       // ← tracks last applied snapped delta to enable drag-back-to-origin
  dragDir: Direction;
};

function PlatePreview({ size, zones, lineConfigs, segments, direction, dividers, overflowMap, onSegmentsChange }: {
  size: TagSize; zones: TextZone[]; lineConfigs: ZoneConfigs;
  segments: number[]; direction: Direction; dividers: DividerConfig[];
  overflowMap: Record<string, OverflowInfo>;
  onSegmentsChange: (s: number[]) => void;
}) {
  const VW = SVG_VW;
  const VH = Math.round(VW * size.height / size.width);
  const PAD = VW * PAD_RATIO, INNER_PAD = VW * IPAD_RATIO;
  const innerW = VW - PAD * 2, innerH = VH - PAD * 2;
  const n = segments.length;

  // Available dimension for proportional sizing (excluding margins + gaps)
  const hAvailPct = 100 - H_TOP - H_BOT - H_GAP * (n - 1);
  const vAvailPct = 100 - V_LEFT - V_RIGHT - V_GAP * (n - 1);
  const availH    = (hAvailPct / 100) * innerH;
  const availColW = (vAvailPct / 100) * innerW;

  const svgRef  = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draggingIdx,   setDraggingIdx]   = useState<number | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<number | null>(null);

  function onHandlePointerDown(idx: number, e: React.PointerEvent) {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      idx, startClientY: e.clientY, startClientX: e.clientX,
      startValues: [...segments], lastDelta: 0, dragDir: direction,
    };
    setDraggingIdx(idx);
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current || !svgRef.current) return;
      const { idx, startClientY, startClientX, startValues, dragDir } = dragRef.current;
      const svgRect = svgRef.current.getBoundingClientRect();

      let rawPctDelta: number;
      if (dragDir === "horizontal") {
        const svgDeltaY = (e.clientY - startClientY) * (VH / svgRect.height);
        rawPctDelta = (svgDeltaY / availH) * 100;
      } else {
        const svgDeltaX = (e.clientX - startClientX) * (VW / svgRect.width);
        rawPctDelta = (svgDeltaX / availColW) * 100;
      }

      const snappedDelta = snap(rawPctDelta);
      // Key fix: compare against lastDelta so drag-back-to-origin is always applied
      if (snappedDelta === dragRef.current.lastDelta) return;
      dragRef.current.lastDelta = snappedDelta;

      const moved = moveDivider(startValues, idx, snappedDelta);
      onSegmentsChange(moved);
    }
    function onMouseUp() { dragRef.current = null; setDraggingIdx(null); }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [VH, VW, availH, availColW, onSegmentsChange]);

  // Pre-compute zone rects in SVG units
  const rects = zones.map((zone) => ({
    zone,
    zx: PAD + (zone.xPct      / 100) * innerW,
    zy: PAD + (zone.yPct      / 100) * innerH,
    zw: (zone.widthPct  / 100) * innerW,
    zh: (zone.heightPct / 100) * innerH,
  }));

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", height: "100%", maxWidth: `${VW}px`, display: "block", userSelect: "none" }}
      preserveAspectRatio="xMidYMid meet">

      <defs>
        <linearGradient id="pb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="hsl(220, 18%, 20%)" />
          <stop offset="55%"  stopColor="hsl(220, 15%, 11%)" />
          <stop offset="100%" stopColor="hsl(220, 18%, 17%)" />
        </linearGradient>
        <linearGradient id="ps" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.07)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {rects.map(({ zone, zx, zy, zw, zh }) => (
          <clipPath key={`clip-${zone.id}`} id={`clip-${zone.id}`}>
            <rect x={zx} y={zy} width={zw} height={zh} />
          </clipPath>
        ))}
      </defs>

      {/* Plate body */}
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill="url(#pb)" />
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill="url(#ps)" />
      <rect x={1.5} y={1.5} width={VW - 3} height={VH - 3} rx={VW * 0.007}
        fill="none" stroke="hsl(220, 20%, 35%)" strokeWidth={VW * 0.003} />
      <rect x={5}   y={5}   width={VW - 10} height={VH - 10} rx={VW * 0.005}
        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={VW * 0.002} />

      {/* Zone backgrounds + text */}
      {rects.map(({ zone, zx, zy, zw, zh }) => {
        const cfg          = lineConfigs[zone.id] ?? defaultZoneConfig();
        const font         = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
        const displayText  = cfg.text || zone.placeholder;
        const isPlaceholder = !cfg.text;
        const clampedSize  = Math.max(10, Math.min(cfg.fontSize * (VW / 100), zh * 0.58));
        const lineH        = clampedSize * 1.28;
        const availTextW   = zw - 2 * INNER_PAD;
        const fontSpec     = `${cfg.italic ? "italic " : ""}${cfg.bold ? "bold " : ""}${clampedSize}px ${font.family}`;
        const lines        = (!isPlaceholder && cfg.wordWrap)
          ? wrapWords(displayText, fontSpec, availTextW)
          : displayText.split("\n");
        const totalTH      = lines.length * lineH;

        let textX: number, anchor: "start" | "middle" | "end";
        if (cfg.hAlign === "left")       { textX = zx + INNER_PAD; anchor = "start"; }
        else if (cfg.hAlign === "right") { textX = zx + zw - INNER_PAD; anchor = "end"; }
        else                             { textX = zx + zw / 2;  anchor = "middle"; }

        let baseY: number;
        if (cfg.vAlign === "top")         baseY = zy + INNER_PAD + clampedSize * 0.85;
        else if (cfg.vAlign === "bottom") baseY = zy + zh - totalTH + clampedSize * 0.85 - INNER_PAD;
        else                              baseY = zy + zh / 2 - totalTH / 2 + clampedSize * 0.85;

        const ov = overflowMap[zone.id];
        const overflows = ov?.overflows ?? false;

        return (
          <g key={zone.id}>
            <rect x={zx} y={zy} width={zw} height={zh}
              fill="hsl(215, 22%, 16%)"
              stroke={overflows ? "hsl(0, 84%, 58%)" : isPlaceholder ? "hsl(215, 22%, 32%)" : "hsl(215, 22%, 42%)"}
              strokeWidth={overflows ? VW * 0.004 : VW * 0.0012}
              strokeDasharray={isPlaceholder && !overflows ? `${VW * 0.005},${VW * 0.003}` : "0"}
              rx={VW * 0.004} />
            {overflows && (
              <rect x={zx} y={zy} width={zw} height={zh}
                fill="rgba(239,68,68,0.10)" rx={VW * 0.004} style={{ pointerEvents: "none" }} />
            )}
            <g clipPath={`url(#clip-${zone.id})`}>
              {lines.map((line, i) => (
                <text key={i} x={textX} y={baseY + i * lineH}
                  textAnchor={anchor} fontFamily={font.family} fontSize={clampedSize}
                  fontWeight={cfg.bold ? 700 : 400} fontStyle={cfg.italic ? "italic" : "normal"}
                  fill={isPlaceholder ? "hsl(215, 12%, 44%)" : "hsl(210, 55%, 88%)"}
                  style={{ userSelect: "none" }}>{line}</text>
              ))}
            </g>
            {overflows && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={zx + zw - 112} y={zy + 5} width={107} height={19} rx={9.5} fill="hsl(0, 84%, 52%)" />
                <text x={zx + zw - 58.5} y={zy + 17.5} textAnchor="middle" fontSize={11}
                  fill="white" fontFamily="system-ui, sans-serif" fontWeight={600}
                  style={{ userSelect: "none" }}>⚠ Text overflow</text>
              </g>
            )}
          </g>
        );
      })}

      {/* User-configured decorative divider lines */}
      {n > 1 && rects.slice(0, -1).map(({ zx, zy, zw, zh }, i) => {
        const div = dividers[i];
        if (!div?.enabled) return null;
        const dArr = div.style === "dotted" ? `${VW * 0.003},${VW * 0.009}`
                   : div.style === "dashed" ? `${VW * 0.022},${VW * 0.011}` : "none";
        const next = rects[i + 1];
        if (direction === "horizontal") {
          // Horizontal decorative line in the gap between stacked zones
          const midY = (zy + zh + next.zy) / 2;
          return (
            <line key={`divline-${i}`}
              x1={zx + INNER_PAD} y1={midY} x2={zx + zw - INNER_PAD} y2={midY}
              stroke="hsl(210, 35%, 68%)" strokeWidth={VW * 0.0032}
              strokeDasharray={dArr} strokeLinecap="round" style={{ pointerEvents: "none" }} />
          );
        } else {
          // Vertical decorative line in the gap between side-by-side columns
          const midX = (zx + zw + next.zx) / 2;
          return (
            <line key={`divline-${i}`}
              x1={midX} y1={zy + INNER_PAD} x2={midX} y2={zy + zh - INNER_PAD}
              stroke="hsl(210, 35%, 68%)" strokeWidth={VW * 0.0032}
              strokeDasharray={dArr} strokeLinecap="round" style={{ pointerEvents: "none" }} />
          );
        }
      })}

      {/* Draggable segment-resize handles */}
      {n > 1 && rects.slice(0, -1).map(({ zx, zy, zw, zh }, i) => {
        const next   = rects[i + 1];
        const active = hoveredHandle === i || draggingIdx === i;
        const lineColor = active ? "hsl(24, 95%, 53%)" : "hsl(220, 18%, 44%)";
        const pillFill  = active ? "hsl(24, 95%, 53%)" : "hsl(220, 20%, 30%)";

        if (direction === "horizontal") {
          const midY  = (zy + zh + next.zy) / 2;
          const pillW = 70, pillH = 15;
          return (
            <g key={`hdl-${i}`} style={{ cursor: "ns-resize" }}
              onPointerDown={(e) => onHandlePointerDown(i, e)}
              onMouseEnter={() => setHoveredHandle(i)} onMouseLeave={() => setHoveredHandle(null)}>
              <rect x={zx} y={midY - 12} width={zw} height={24} fill="transparent" style={{ cursor: "ns-resize" }} />
              <line x1={zx} y1={midY} x2={zx + zw} y2={midY}
                stroke={lineColor} strokeWidth={active ? 2.5 : 1.5}
                strokeDasharray={active ? "0" : "6,4"} strokeOpacity={active ? 1 : 0.55}
                style={{ pointerEvents: "none" }} />
              <rect x={zx + zw / 2 - pillW / 2} y={midY - pillH / 2} width={pillW} height={pillH}
                rx={pillH / 2} fill={pillFill} style={{ pointerEvents: "none" }} />
              <text x={zx + zw / 2} y={midY + 4} textAnchor="middle" fontSize={10}
                fill="rgba(255,255,255,0.9)" fontFamily="sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>
                ▲ ▼
              </text>
            </g>
          );
        } else {
          // Vertical mode: handle sits in the gap between columns
          const midX = (zx + zw + next.zx) / 2;
          const midY = zy + zh / 2;
          return (
            <g key={`hdl-${i}`} style={{ cursor: "ew-resize" }}
              onPointerDown={(e) => onHandlePointerDown(i, e)}
              onMouseEnter={() => setHoveredHandle(i)} onMouseLeave={() => setHoveredHandle(null)}>
              <rect x={midX - 12} y={zy} width={24} height={zh} fill="transparent" style={{ cursor: "ew-resize" }} />
              <line x1={midX} y1={zy} x2={midX} y2={zy + zh}
                stroke={lineColor} strokeWidth={active ? 2.5 : 1.5}
                strokeDasharray={active ? "0" : "6,4"} strokeOpacity={active ? 1 : 0.55}
                style={{ pointerEvents: "none" }} />
              {/* Vertical pill */}
              <rect x={midX - 12} y={midY - 30} width={24} height={60} rx={12}
                fill={pillFill} style={{ pointerEvents: "none" }} />
              <text x={midX} y={midY - 8} textAnchor="middle" fontSize={12}
                fill="rgba(255,255,255,0.9)" fontFamily="sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>
                ◄
              </text>
              <text x={midX} y={midY + 14} textAnchor="middle" fontSize={12}
                fill="rgba(255,255,255,0.9)" fontFamily="sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>
                ►
              </text>
            </g>
          );
        }
      })}
    </svg>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function CustomizePanel({
  zones, lineConfigs, numSegments, segments, direction, dividers, overflowMap,
  hasOverflow, onChangeDirection, onChangeNumSegments, onAdjustSegment, onUpdateZone, onUpdateDivider,
}: {
  zones: TextZone[]; lineConfigs: ZoneConfigs;
  numSegments: number; segments: number[];
  direction: Direction; dividers: DividerConfig[];
  overflowMap: Record<string, OverflowInfo>; hasOverflow: boolean;
  onChangeDirection: (d: Direction) => void;
  onChangeNumSegments: (n: number) => void;
  onAdjustSegment: (idx: number, delta: number) => void;
  onUpdateZone: (id: string, patch: Partial<ZoneConfig>) => void;
  onUpdateDivider: (idx: number, patch: Partial<DividerConfig>) => void;
}) {
  const segLabel = direction === "horizontal" ? "Lines of Text" : "Columns";

  return (
    <div className="p-3 space-y-4 pb-4">
      {/* Segment direction */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Segment Direction</p>
        <div className="flex gap-1.5">
          {(["horizontal", "vertical"] as const).map((d) => {
            const Icon  = d === "horizontal" ? Rows3 : Columns3;
            const label = d === "horizontal" ? "Horizontal" : "Vertical";
            return (
              <button key={d} data-testid={`button-direction-${d}`} onClick={() => onChangeDirection(d)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded border py-1.5 text-xs font-bold transition-all ${
                  direction === d ? "border-primary bg-primary text-white" : "border-border bg-card text-foreground hover:border-primary"
                }`}>
                <Icon size={13} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Segment count */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{segLabel}</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} data-testid={`button-numsegs-${n}`} onClick={() => onChangeNumSegments(n)}
              className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-bold transition-all ${
                numSegments === n ? "border-primary bg-primary text-white" : "border-border bg-card text-foreground hover:border-primary"
              }`}>{n}</button>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Zone editors + divider controls interleaved */}
      {zones.map((zone, idx) => (
        <div key={zone.id}>
          <ZoneEditor zone={zone} idx={idx}
            segmentPct={segments[idx] ?? 0}
            showSegmentControl={numSegments > 1}
            direction={direction}
            cfg={lineConfigs[zone.id] ?? defaultZoneConfig()}
            overflowInfo={overflowMap[zone.id]}
            onUpdate={(patch) => onUpdateZone(zone.id, patch)}
            onAdjustSegment={(delta) => onAdjustSegment(idx, delta)} />
          {idx < zones.length - 1 && dividers[idx] !== undefined && (
            <DividerControl idx={idx} direction={direction} config={dividers[idx]}
              onUpdate={(p) => onUpdateDivider(idx, p)} />
          )}
        </div>
      ))}

      {/* Continue button */}
      <div className="pt-2 border-t border-border">
        <button data-testid="button-continue" disabled={hasOverflow}
          title={hasOverflow ? "Fix text overflow before continuing" : undefined}
          className={`w-full rounded py-2.5 text-sm font-bold transition-all ${
            hasOverflow
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
          }`}>
          {hasOverflow ? "Fix overflow to continue" : "Continue to Order →"}
        </button>
        {hasOverflow && (
          <p className="mt-1.5 text-center text-[10px] text-red-500 leading-snug">
            One or more zones overflow. Reduce text, lower font size, enable word wrap, or increase zone size.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Divider control ──────────────────────────────────────────────────────────

function DividerControl({ idx, direction, config, onUpdate }: {
  idx: number; direction: Direction; config: DividerConfig;
  onUpdate: (patch: Partial<DividerConfig>) => void;
}) {
  const STYLES: { value: DividerStyle; label: string }[] = [
    { value: "solid",  label: "Solid" },
    { value: "dotted", label: "Dotted" },
    { value: "dashed", label: "Dashed" },
  ];
  return (
    <div className="mx-1 my-1.5 rounded border border-dashed border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {direction === "horizontal" ? "Divider line" : "Divider line"}
        </span>
        <button data-testid={`button-divider-toggle-${idx}`}
          onClick={() => onUpdate({ enabled: !config.enabled })}
          className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold transition-all ${
            config.enabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary"
          }`}>
          {config.enabled ? "On" : "Off"}
        </button>
      </div>
      {config.enabled && (
        <div className="mt-2 flex items-center gap-1.5">
          {STYLES.map(({ value, label }) => (
            <button key={value} data-testid={`button-divider-style-${value}-${idx}`}
              onClick={() => onUpdate({ style: value })}
              className={`flex-1 rounded border py-0.5 text-[10px] font-semibold transition-all ${
                config.style === value ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary"
              }`}>{label}</button>
          ))}
        </div>
      )}
      {config.enabled && (
        <svg width="100%" height={10} className="mt-2 overflow-visible"
          style={{ transform: direction === "vertical" ? "rotate(90deg)" : "none" }}>
          <line x1={0} y1={5} x2="100%" y2={5}
            stroke="hsl(210, 35%, 60%)" strokeWidth={1.5}
            strokeDasharray={config.style === "dotted" ? "3,5" : config.style === "dashed" ? "10,6" : "none"}
            strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

// ─── Per-zone editor ──────────────────────────────────────────────────────────

function ZoneEditor({ zone, idx, segmentPct, showSegmentControl, direction, cfg, overflowInfo, onUpdate, onAdjustSegment }: {
  zone: TextZone; idx: number; segmentPct: number;
  showSegmentControl: boolean; direction: Direction;
  cfg: ZoneConfig; overflowInfo: OverflowInfo | undefined;
  onUpdate: (patch: Partial<ZoneConfig>) => void;
  onAdjustSegment: (delta: number) => void;
}) {
  const font        = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
  const letterHeight = approxLetterHeightIn(cfg.fontSize);
  const ov       = overflowInfo;
  const overflows = ov?.overflows ?? false;
  const showTextarea = zone.multiline || cfg.wordWrap;
  const segCtrlTitle = direction === "horizontal"
    ? "Zone height in 5% steps — or drag dividers on the preview"
    : "Column width in 5% steps — or drag dividers on the preview";

  return (
    <div className={`rounded border overflow-hidden ${overflows ? "border-red-500/60" : "border-border"} bg-card`}>
      <div className={`flex items-center justify-between border-b px-3 py-1.5 ${overflows ? "border-red-500/30 bg-red-500/5" : "border-border bg-muted/50"}`}>
        <div className="flex items-center gap-2">
          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black flex-shrink-0 ${overflows ? "bg-red-500/20 text-red-500" : "bg-primary/20 text-primary"}`}>
            {overflows ? <AlertTriangle size={8} /> : idx + 1}
          </span>
          <span className="text-xs font-semibold text-foreground">{zone.label}</span>
        </div>
        {showSegmentControl && (
          <div className="flex items-center gap-1" title={segCtrlTitle}>
            <button data-testid={`button-height-minus-${zone.id}`}
              onClick={() => onAdjustSegment(-STEP)}
              className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background text-foreground hover:border-primary text-xs font-bold leading-none"
              aria-label="Decrease by 5%">−</button>
            <span data-testid={`text-height-pct-${zone.id}`}
              className="font-mono text-[10px] font-bold text-muted-foreground w-8 text-center tabular-nums">
              {segmentPct}%
            </span>
            <button data-testid={`button-height-plus-${zone.id}`}
              onClick={() => onAdjustSegment(+STEP)}
              className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background text-foreground hover:border-primary text-xs font-bold leading-none"
              aria-label="Increase by 5%">+</button>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {showTextarea ? (
          <textarea data-testid={`input-zone-${zone.id}`} rows={2}
            value={cfg.text} onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={zone.placeholder}
            className={`w-full rounded border px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none resize-none bg-background ${overflows ? "border-red-500/60 focus:border-red-500" : "border-border focus:border-primary"}`}
            style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }} />
        ) : (
          <input data-testid={`input-zone-${zone.id}`} type="text"
            value={cfg.text} onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={zone.placeholder}
            className={`w-full rounded border px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none bg-background ${overflows ? "border-red-500/60 focus:border-red-500" : "border-border focus:border-primary"}`}
            style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }} />
        )}

        {overflows && (
          <div className="flex items-start gap-1.5 rounded bg-red-500/10 border border-red-500/30 px-2 py-1.5">
            <AlertTriangle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-500 leading-snug">
              {ov?.widthOverflow && !ov?.heightOverflow && "Text is too wide. Shorten it, lower font size, or enable word wrap."}
              {ov?.heightOverflow && !ov?.widthOverflow && "Text is too tall. Shorten it, lower font size, or increase zone size."}
              {ov?.widthOverflow && ov?.heightOverflow  && "Text overflows both dimensions. Shorten text or lower font size."}
            </p>
          </div>
        )}

        <Sel testId={`select-font-${zone.id}`} value={cfg.fontId}
          onChange={(v) => onUpdate({ fontId: v })} style={{ fontFamily: font.family }}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>{f.label}</option>
          ))}
        </Sel>

        <div className="flex items-center gap-1.5">
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <Sel testId={`select-fontsize-${zone.id}`} value={String(cfg.fontSize)}
              onChange={(v) => onUpdate({ fontSize: Number(v) })} className="w-[72px]">
              {FONT_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}pt</option>)}
            </Sel>
            <span data-testid={`text-letter-height-${zone.id}`}
              className="text-center font-mono text-[9px] text-muted-foreground"
              title="Approximate capital letter height in inches">~{letterHeight}"</span>
          </div>
          <ToggleBtn testId={`button-bold-${zone.id}`} active={cfg.bold} title="Bold"
            onClick={() => onUpdate({ bold: !cfg.bold })}><Bold size={11} /></ToggleBtn>
          <ToggleBtn testId={`button-italic-${zone.id}`} active={cfg.italic} title="Italic"
            onClick={() => onUpdate({ italic: !cfg.italic })}><Italic size={11} /></ToggleBtn>
          <ToggleBtn testId={`button-wordwrap-${zone.id}`} active={cfg.wordWrap} title="Word Wrap"
            onClick={() => onUpdate({ wordWrap: !cfg.wordWrap })}><WrapText size={11} /></ToggleBtn>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground w-4">H</span>
          {(["left", "center", "right"] as const).map((v) => {
            const Icon = v === "left" ? AlignLeft : v === "center" ? AlignCenter : AlignRight;
            return (
              <ToggleBtn key={v} testId={`button-halign-${v}-${zone.id}`}
                active={cfg.hAlign === v} title={v} onClick={() => onUpdate({ hAlign: v })}>
                <Icon size={11} />
              </ToggleBtn>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground w-4">V</span>
          {(["top", "center", "bottom"] as const).map((v) => (
            <ToggleBtn key={v} testId={`button-valign-${v}-${zone.id}`}
              active={cfg.vAlign === v}
              title={v === "top" ? "Top" : v === "center" ? "Middle" : "Bottom"}
              onClick={() => onUpdate({ vAlign: v })} wide>
              {v === "top" ? "Top" : v === "center" ? "Mid" : "Bot"}
            </ToggleBtn>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function DropChevron() {
  return (
    <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
      width="9" height="9" viewBox="0 0 12 12">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Sel({ testId, value, onChange, children, style, className }: {
  testId?: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; style?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`relative ${className ?? "w-full"}`}>
      <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} style={style}
        className="w-full appearance-none rounded border border-border bg-background px-2 py-1.5 pr-6 text-xs text-foreground focus:border-primary focus:outline-none">
        {children}
      </select>
      <DropChevron />
    </div>
  );
}

function ToggleBtn({ testId, active, title, onClick, children, wide }: {
  testId?: string; active: boolean; title: string;
  onClick: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <button data-testid={testId} onClick={onClick} aria-pressed={active} title={title}
      className={`flex items-center justify-center rounded border text-[10px] font-bold transition-all h-[26px] ${wide ? "px-1.5 min-w-[28px]" : "w-[26px]"} ${active ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary"}`}>
      {children}
    </button>
  );
}
