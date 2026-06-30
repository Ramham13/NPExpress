import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { RotateCcw, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import {
  TAG_SIZES, TEMPLATES, FONT_OPTIONS, FONT_SIZE_OPTIONS,
  defaultZoneConfig, approxLetterHeightIn,
  type TagSize, type Template, type TextZone, type ZoneConfigs, type ZoneConfig,
} from "@/data/templates";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_WEIGHT = 5;   // minimum raw weight per zone (prevents collapse)
const WEIGHT_STEP = 5;  // increment/decrement step for +/- buttons
const SVG_VW = 1000;    // SVG viewBox width (fixed; height derived per size)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build positioned TextZone[] from raw weights (proportional allocation). */
function weightsToZones(weights: number[]): TextZone[] {
  const TOP = 5, BOT = 5, GAP = 2;
  const n = weights.length;
  const available = 100 - TOP - BOT - GAP * (n - 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let yOff = TOP;
  return weights.map((w, i) => {
    const h = (w / total) * available;
    const zone: TextZone = {
      id: `line${i + 1}`,
      label: n === 1 ? "Text" : `Line ${i + 1}`,
      placeholder: n === 1 ? "YOUR TEXT HERE" : `LINE ${i + 1}`,
      xPct: 4, yPct: yOff, widthPct: 92, heightPct: h,
      align: "center" as const,
    };
    yOff += h + GAP;
    return zone;
  });
}

/** Return each weight's share as a rounded integer percentage (sums ≈ 100). */
function normalizedPcts(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => w / total * 100);
  // Round and fix drift so sum == 100
  const floored = raw.map(Math.floor);
  const diff = 100 - floored.reduce((a, b) => a + b, 0);
  const indices = [...raw.keys()].sort((a, b) => (raw[b] % 1) - (raw[a] % 1));
  indices.slice(0, diff).forEach((i) => floored[i]++);
  return floored;
}

/** Derive initial weights from a template's zone heightPcts. */
function weightsFromTemplate(zones: TextZone[]): number[] {
  const total = zones.reduce((s, z) => s + z.heightPct, 0);
  return zones.map((z) => Math.max(MIN_WEIGHT, Math.round((z.heightPct / total) * 100)));
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Designer() {
  const [selectedSize, setSelectedSize] = useState<TagSize | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [weights, setWeights] = useState<number[]>([10]);
  const [lineConfigs, setLineConfigs] = useState<ZoneConfigs>({ line1: defaultZoneConfig() });

  const zones = useMemo(() => weightsToZones(weights), [weights]);
  const heightPcts = useMemo(() => normalizedPcts(weights), [weights]);
  const numLines = weights.length;

  const compatibleTemplates = selectedSize
    ? TEMPLATES.filter((t) => t.compatibleSizes.includes(selectedSize.id))
    : [];

  function pickSize(size: TagSize) {
    setSelectedSize(size);
    setActiveTemplateId(null);
    setWeights([10]);
    setLineConfigs({ line1: defaultZoneConfig() });
  }

  function selectBlank() {
    setActiveTemplateId(null);
  }

  function selectTemplate(template: Template) {
    setActiveTemplateId(template.id);
    const w = weightsFromTemplate(template.zones);
    setWeights(w);
    const cfg: ZoneConfigs = {};
    template.zones.forEach((z, i) => {
      const id = `line${i + 1}`;
      cfg[id] = lineConfigs[id] ?? defaultZoneConfig();
    });
    setLineConfigs(cfg);
  }

  function changeNumLines(n: number) {
    setActiveTemplateId(null);
    const newW = Array(n).fill(10);
    const oldVals = Object.values(lineConfigs);
    const cfg: ZoneConfigs = {};
    newW.forEach((_, i) => {
      const id = `line${i + 1}`;
      cfg[id] = oldVals[i] ?? defaultZoneConfig();
    });
    setWeights(newW);
    setLineConfigs(cfg);
  }

  /** Change one zone's weight by delta; other zones are unaffected (proportions shift naturally). */
  function adjustWeight(idx: number, delta: number) {
    setWeights((prev) => {
      const next = [...prev];
      next[idx] = Math.max(MIN_WEIGHT, next[idx] + delta);
      return next;
    });
    setActiveTemplateId(null);
  }

  /** Called from the SVG drag handler — directly sets new weights. */
  const handleWeightsChange = useCallback((newW: number[]) => {
    setWeights(newW);
    setActiveTemplateId(null);
  }, []);

  function updateZone(zoneId: string, patch: Partial<ZoneConfig>) {
    setLineConfigs((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], ...patch } }));
  }

  if (!selectedSize) return <SizePicker onPick={pickSize} />;

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Header */}
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
            <button
              data-testid="button-change-size"
              onClick={() => setSelectedSize(null)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap"
            >
              <RotateCcw size={11} /> Change Size
            </button>
          </div>
        </div>
      </header>

      {/* Three-panel layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* LEFT */}
        <aside className="lg:w-44 xl:w-52 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto bg-muted/20" style={{ minHeight: 0 }}>
          <TemplatePanel
            size={selectedSize}
            templates={compatibleTemplates}
            activeTemplateId={activeTemplateId}
            onBlank={selectBlank}
            onTemplate={selectTemplate}
          />
        </aside>

        {/* CENTER */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-[hsl(220_20%_8%)] p-4 lg:p-8" style={{ minHeight: "180px", minWidth: 0 }}>
          <PlatePreview
            size={selectedSize}
            zones={zones}
            lineConfigs={lineConfigs}
            weights={weights}
            onWeightsChange={handleWeightsChange}
          />
        </div>

        {/* RIGHT */}
        <aside className="lg:w-72 xl:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto bg-background" style={{ minHeight: 0 }}>
          <CustomizePanel
            zones={zones}
            lineConfigs={lineConfigs}
            numLines={numLines}
            heightPcts={heightPcts}
            onChangeNumLines={changeNumLines}
            onAdjustWeight={adjustWeight}
            onUpdateZone={updateZone}
          />
        </aside>
      </div>
    </div>
  );
}

// ─── Step 1: Size picker ──────────────────────────────────────────────────────

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
  size: TagSize; templates: Template[];
  activeTemplateId: string | null;
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

// ─── Center: interactive SVG plate ────────────────────────────────────────────

function PlatePreview({ size, zones, lineConfigs, weights, onWeightsChange }: {
  size: TagSize; zones: TextZone[]; lineConfigs: ZoneConfigs;
  weights: number[]; onWeightsChange: (w: number[]) => void;
}) {
  const VW = SVG_VW;
  const VH = Math.round(VW * size.height / size.width);
  const PAD = VW * 0.018;
  const INNER_PAD = VW * 0.008;
  const innerW = VW - PAD * 2;
  const innerH = VH - PAD * 2;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ idx: number; startClientY: number; startWeights: number[] } | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoveredDivider, setHoveredDivider] = useState<number | null>(null);

  // GAP between zones in SVG units
  const TOP = 5, BOT = 5, GAP_PCT = 2;
  const n = zones.length;
  const availablePct = 100 - TOP - BOT - GAP_PCT * (n - 1);
  const availH = (availablePct / 100) * innerH;

  function onDividerPointerDown(idx: number, e: React.PointerEvent) {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { idx, startClientY: e.clientY, startWeights: [...weights] };
    setDraggingIdx(idx);
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current || !svgRef.current) return;
      const { idx, startClientY, startWeights } = dragRef.current;

      const svgRect = svgRef.current.getBoundingClientRect();
      const svgScale = VH / svgRect.height;          // SVG units per CSS pixel
      const deltaY = (e.clientY - startClientY) * svgScale; // in SVG units

      // Convert deltaY (SVG units) → weight delta
      const total = startWeights.reduce((a, b) => a + b, 0);
      const deltaWeight = (deltaY / availH) * total;

      const newW = [...startWeights];
      // Only redistribute between the two adjacent zones
      const maxI = startWeights[idx] + startWeights[idx + 1] - MIN_WEIGHT;
      newW[idx] = Math.max(MIN_WEIGHT, Math.min(maxI, startWeights[idx] + deltaWeight));
      newW[idx + 1] = startWeights[idx] + startWeights[idx + 1] - newW[idx];

      onWeightsChange(newW);
    }

    function onMouseUp() {
      dragRef.current = null;
      setDraggingIdx(null);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [VH, availH, onWeightsChange]);

  // Pre-compute zone rects in SVG units
  const zoneRects = zones.map((zone) => ({
    zone,
    zx: PAD + (zone.xPct / 100) * innerW,
    zy: PAD + (zone.yPct / 100) * innerH,
    zw: (zone.widthPct / 100) * innerW,
    zh: (zone.heightPct / 100) * innerH,
  }));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", height: "100%", maxWidth: `${VW}px`, display: "block", userSelect: "none" }}
      preserveAspectRatio="xMidYMid meet"
    >
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
      </defs>

      {/* Plate background */}
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill="url(#pb)" />
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill="url(#ps)" />
      <rect x={1.5} y={1.5} width={VW - 3} height={VH - 3} rx={VW * 0.007}
        fill="none" stroke="hsl(220, 20%, 35%)" strokeWidth={VW * 0.003} />
      <rect x={5} y={5} width={VW - 10} height={VH - 10} rx={VW * 0.005}
        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={VW * 0.002} />

      {/* Zones with text */}
      {zoneRects.map(({ zone, zx, zy, zw, zh }) => {
        const cfg = lineConfigs[zone.id] ?? defaultZoneConfig();
        const font = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
        const displayText = cfg.text || zone.placeholder;
        const isPlaceholder = !cfg.text;
        const lines = displayText.split("\n");
        const clampedSize = Math.max(10, Math.min(cfg.fontSize * (VW / 100), zh * 0.58));
        const lineH = clampedSize * 1.28;
        const totalTH = lines.length * lineH;

        let textX: number;
        let anchor: "start" | "middle" | "end";
        if (cfg.hAlign === "left")       { textX = zx + INNER_PAD; anchor = "start"; }
        else if (cfg.hAlign === "right") { textX = zx + zw - INNER_PAD; anchor = "end"; }
        else                             { textX = zx + zw / 2; anchor = "middle"; }

        let baseY: number;
        if (cfg.vAlign === "top")         baseY = zy + INNER_PAD + clampedSize * 0.85;
        else if (cfg.vAlign === "bottom") baseY = zy + zh - totalTH + clampedSize * 0.85 - INNER_PAD;
        else                              baseY = zy + zh / 2 - totalTH / 2 + clampedSize * 0.85;

        return (
          <g key={zone.id}>
            <rect x={zx} y={zy} width={zw} height={zh}
              fill="hsl(215, 22%, 16%)"
              stroke={isPlaceholder ? "hsl(215, 22%, 32%)" : "hsl(215, 22%, 42%)"}
              strokeWidth={VW * 0.0012}
              strokeDasharray={isPlaceholder ? `${VW * 0.005},${VW * 0.003}` : "0"}
              rx={VW * 0.004} />
            {lines.map((line, i) => (
              <text key={i} x={textX} y={baseY + i * lineH}
                textAnchor={anchor} fontFamily={font.family} fontSize={clampedSize}
                fontWeight={cfg.bold ? 700 : 400} fontStyle={cfg.italic ? "italic" : "normal"}
                fill={isPlaceholder ? "hsl(215, 12%, 44%)" : "hsl(210, 55%, 88%)"}
                style={{ userSelect: "none" }}>
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Draggable dividers between zones (only when multi-line) */}
      {n > 1 && zoneRects.slice(0, -1).map(({ zx, zy, zw, zh }, i) => {
        const next = zoneRects[i + 1];
        const gapTop = zy + zh;
        const gapBot = next.zy;
        const midY = (gapTop + gapBot) / 2;
        const isHover = hoveredDivider === i;
        const isDrag = draggingIdx === i;
        const active = isHover || isDrag;
        const lineColor = active ? "hsl(24, 95%, 53%)" : "hsl(220, 18%, 42%)";
        const pillColor = active ? "hsl(24, 95%, 53%)" : "hsl(220, 20%, 32%)";
        const pillW = 60, pillH = 14, pillR = 7;

        return (
          <g
            key={`divider-${i}`}
            style={{ cursor: "ns-resize" }}
            onPointerDown={(e) => onDividerPointerDown(i, e)}
            onMouseEnter={() => setHoveredDivider(i)}
            onMouseLeave={() => setHoveredDivider(null)}
          >
            {/* Invisible fat hit target */}
            <rect
              x={zx} y={midY - 12}
              width={zw} height={24}
              fill="transparent"
              style={{ cursor: "ns-resize" }}
            />
            {/* Dashed guide line */}
            <line
              x1={zx} y1={midY} x2={zx + zw} y2={midY}
              stroke={lineColor}
              strokeWidth={active ? 2 : 1.5}
              strokeDasharray={active ? "0" : "6,4"}
              strokeOpacity={active ? 1 : 0.6}
              style={{ pointerEvents: "none" }}
            />
            {/* Pill handle */}
            <rect
              x={zx + zw / 2 - pillW / 2} y={midY - pillH / 2}
              width={pillW} height={pillH} rx={pillR}
              fill={pillColor}
              style={{ pointerEvents: "none" }}
            />
            {/* Arrows inside pill */}
            <text
              x={zx + zw / 2} y={midY + 4}
              textAnchor="middle" fontSize={10}
              fill="white" fontFamily="sans-serif"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              ▲ ▼
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function CustomizePanel({ zones, lineConfigs, numLines, heightPcts, onChangeNumLines, onAdjustWeight, onUpdateZone }: {
  zones: TextZone[]; lineConfigs: ZoneConfigs;
  numLines: number; heightPcts: number[];
  onChangeNumLines: (n: number) => void;
  onAdjustWeight: (idx: number, delta: number) => void;
  onUpdateZone: (id: string, patch: Partial<ZoneConfig>) => void;
}) {
  return (
    <div className="p-3 space-y-4">
      {/* Lines of text */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lines of Text</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} data-testid={`button-numlines-${n}`}
              onClick={() => onChangeNumLines(n)}
              className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-bold transition-all ${
                numLines === n ? "border-primary bg-primary text-white" : "border-border bg-card text-foreground hover:border-primary"
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Per-zone editors */}
      {zones.map((zone, idx) => (
        <ZoneEditor
          key={zone.id}
          zone={zone}
          idx={idx}
          heightPct={heightPcts[idx] ?? 0}
          showHeightControl={numLines > 1}
          cfg={lineConfigs[zone.id] ?? defaultZoneConfig()}
          onUpdate={(patch) => onUpdateZone(zone.id, patch)}
          onAdjustHeight={(delta) => onAdjustWeight(idx, delta)}
        />
      ))}
    </div>
  );
}

// ─── Per-zone editor ──────────────────────────────────────────────────────────

function ZoneEditor({ zone, idx, heightPct, showHeightControl, cfg, onUpdate, onAdjustHeight }: {
  zone: TextZone; idx: number; heightPct: number;
  showHeightControl: boolean;
  cfg: ZoneConfig;
  onUpdate: (patch: Partial<ZoneConfig>) => void;
  onAdjustHeight: (delta: number) => void;
}) {
  const font = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
  const letterHeight = approxLetterHeightIn(cfg.fontSize);

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-black text-primary flex-shrink-0">{idx + 1}</span>
          <span className="text-xs font-semibold text-foreground">{zone.label}</span>
        </div>
        {showHeightControl && (
          <div className="flex items-center gap-1" title="Zone height (drag divider on preview or use buttons)">
            <button
              data-testid={`button-height-minus-${zone.id}`}
              onClick={() => onAdjustHeight(-WEIGHT_STEP)}
              className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background text-foreground hover:border-primary text-xs font-bold leading-none"
              aria-label="Decrease height"
            >−</button>
            <span
              data-testid={`text-height-pct-${zone.id}`}
              className="font-mono text-[10px] font-bold text-muted-foreground w-8 text-center tabular-nums"
            >{heightPct}%</span>
            <button
              data-testid={`button-height-plus-${zone.id}`}
              onClick={() => onAdjustHeight(+WEIGHT_STEP)}
              className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background text-foreground hover:border-primary text-xs font-bold leading-none"
              aria-label="Increase height"
            >+</button>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {zone.multiline ? (
          <textarea data-testid={`input-zone-${zone.id}`} rows={2}
            value={cfg.text} onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={zone.placeholder}
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none resize-none"
            style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }}
          />
        ) : (
          <input data-testid={`input-zone-${zone.id}`} type="text"
            value={cfg.text} onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={zone.placeholder}
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }}
          />
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
              title="Approximate capital letter height in inches">
              ~{letterHeight}"
            </span>
          </div>
          <ToggleBtn testId={`button-bold-${zone.id}`} active={cfg.bold} title="Bold" onClick={() => onUpdate({ bold: !cfg.bold })}>
            <Bold size={11} />
          </ToggleBtn>
          <ToggleBtn testId={`button-italic-${zone.id}`} active={cfg.italic} title="Italic" onClick={() => onUpdate({ italic: !cfg.italic })}>
            <Italic size={11} />
          </ToggleBtn>
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
      <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)}
        style={style}
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
