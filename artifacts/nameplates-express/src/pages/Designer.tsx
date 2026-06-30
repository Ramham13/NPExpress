import { useState } from "react";
import { RotateCcw, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import {
  TAG_SIZES, TEMPLATES, FONT_OPTIONS, FONT_SIZE_OPTIONS,
  defaultZoneConfig, approxLetterHeightIn,
  type TagSize, type Template, type TextZone, type ZoneConfigs, type ZoneConfig,
} from "@/data/templates";

// ─── Auto-layout: divide plate into N equal horizontal bands ─────────────────

function computeAutoZones(n: number): TextZone[] {
  const TOP = 5, BOT = 5, GAP = 3;
  const avail = 100 - TOP - BOT - GAP * (n - 1);
  const h = avail / n;
  return Array.from({ length: n }, (_, i) => ({
    id: `line${i + 1}`,
    label: n === 1 ? "Text" : `Line ${i + 1}`,
    placeholder: n === 1 ? "YOUR TEXT HERE" : `LINE ${i + 1}`,
    xPct: 4,
    yPct: TOP + i * (h + GAP),
    widthPct: 92,
    heightPct: h,
    align: "center" as const,
  }));
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Designer() {
  const [selectedSize, setSelectedSize] = useState<TagSize | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [numLines, setNumLines] = useState(1);
  const [zones, setZones] = useState<TextZone[]>(computeAutoZones(1));
  const [lineConfigs, setLineConfigs] = useState<ZoneConfigs>({ line1: defaultZoneConfig() });

  const compatibleTemplates = selectedSize
    ? TEMPLATES.filter((t) => t.compatibleSizes.includes(selectedSize.id))
    : [];

  function pickSize(size: TagSize) {
    setSelectedSize(size);
    // Reset to blank, 1 line
    const z = computeAutoZones(1);
    setActiveTemplateId(null);
    setNumLines(1);
    setZones(z);
    setLineConfigs({ line1: defaultZoneConfig() });
  }

  function selectBlank() {
    setActiveTemplateId(null);
    const z = computeAutoZones(numLines);
    setZones(z);
    const cfg: ZoneConfigs = {};
    z.forEach((zone) => { cfg[zone.id] = lineConfigs[zone.id] ?? defaultZoneConfig(); });
    setLineConfigs(cfg);
  }

  function selectTemplate(template: Template) {
    setActiveTemplateId(template.id);
    setNumLines(template.zones.length);
    setZones(template.zones);
    const cfg: ZoneConfigs = {};
    template.zones.forEach((z) => { cfg[z.id] = lineConfigs[z.id] ?? defaultZoneConfig(); });
    setLineConfigs(cfg);
  }

  function changeNumLines(n: number) {
    setActiveTemplateId(null);
    setNumLines(n);
    const newZones = computeAutoZones(n);
    setZones(newZones);
    const oldVals = Object.values(lineConfigs);
    const cfg: ZoneConfigs = {};
    newZones.forEach((z, i) => { cfg[z.id] = oldVals[i] ?? defaultZoneConfig(); });
    setLineConfigs(cfg);
  }

  function updateZone(zoneId: string, patch: Partial<ZoneConfig>) {
    setLineConfigs((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], ...patch } }));
  }

  if (!selectedSize) {
    return <SizePicker onPick={pickSize} />;
  }

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Compact header */}
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

      {/* Three-panel layout — fills remaining height */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* LEFT: template selector */}
        <aside
          className="lg:w-44 xl:w-52 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto bg-muted/20"
          style={{ minHeight: 0 }}
        >
          <TemplatePanel
            size={selectedSize}
            templates={compatibleTemplates}
            activeTemplateId={activeTemplateId}
            onBlank={selectBlank}
            onTemplate={selectTemplate}
          />
        </aside>

        {/* CENTER: live preview */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden bg-[hsl(220_20%_8%)] p-4 lg:p-8"
          style={{ minHeight: "180px", minWidth: 0 }}
        >
          <PlatePreview size={selectedSize} zones={zones} lineConfigs={lineConfigs} />
        </div>

        {/* RIGHT: customization panel */}
        <aside
          className="lg:w-72 xl:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto bg-background"
          style={{ minHeight: 0 }}
        >
          <CustomizePanel
            zones={zones}
            lineConfigs={lineConfigs}
            numLines={numLines}
            onChangeNumLines={changeNumLines}
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
              <button
                key={size.id}
                data-testid={`button-size-${size.id}`}
                onClick={() => onPick(size)}
                className="group flex flex-col items-center gap-3 rounded border border-border bg-card p-4 text-center transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div
                  className="rounded-sm flex-shrink-0"
                  style={{
                    width: thumbW, height: thumbH,
                    background: "linear-gradient(145deg, hsl(220 20% 18%), hsl(220 15% 10%))",
                    border: "2px solid hsl(220 20% 30%)",
                  }}
                />
                <p className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {size.label}
                </p>
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

// ─── Left panel: template selector ───────────────────────────────────────────

function TemplatePanel({ size, templates, activeTemplateId, onBlank, onTemplate }: {
  size: TagSize;
  templates: Template[];
  activeTemplateId: string | null;
  onBlank: () => void;
  onTemplate: (t: Template) => void;
}) {
  const isBlankActive = activeTemplateId === null;

  return (
    <div className="p-2">
      <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Templates
      </p>

      {/* Blank */}
      <button
        data-testid="button-template-blank"
        onClick={onBlank}
        className={`w-full rounded mb-1 p-2 text-left transition-all border ${
          isBlankActive
            ? "border-primary bg-primary/10"
            : "border-transparent hover:border-border hover:bg-muted/50"
        }`}
      >
        <div
          className="mb-1.5 w-full rounded"
          style={{
            height: Math.max(18, Math.round(160 * size.height / size.width)),
            background: "linear-gradient(145deg, hsl(220 20% 18%), hsl(220 15% 10%))",
            border: "1.5px solid hsl(220 20% 30%)",
          }}
        />
        <p className={`text-xs font-semibold ${isBlankActive ? "text-primary" : "text-foreground"}`}>
          Blank
        </p>
        <p className="text-[10px] text-muted-foreground">Start from scratch</p>
      </button>

      {/* Template cards */}
      {templates.map((t) => {
        const isActive = activeTemplateId === t.id;
        const aspect = size.height / size.width;
        const W = 160;
        const H = Math.max(18, Math.round(W * aspect));
        return (
          <button
            key={t.id}
            data-testid={`button-template-${t.id}`}
            onClick={() => onTemplate(t)}
            className={`w-full rounded mb-1 p-2 text-left transition-all border ${
              isActive
                ? "border-primary bg-primary/10"
                : "border-transparent hover:border-border hover:bg-muted/50"
            }`}
          >
            {/* Mini preview SVG */}
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
              className="mb-1.5 block rounded" style={{ display: "block" }}>
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
            <p className={`text-xs font-semibold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
              {t.name}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ─── Center: plate SVG preview ────────────────────────────────────────────────

function PlatePreview({ size, zones, lineConfigs }: {
  size: TagSize;
  zones: TextZone[];
  lineConfigs: ZoneConfigs;
}) {
  const VW = 1000;
  const VH = Math.round(VW * size.height / size.width);
  const PAD = VW * 0.018;
  const INNER_PAD = VW * 0.008;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", height: "100%", maxWidth: `${VW}px`, display: "block" }}
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
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill="url(#pb)" />
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill="url(#ps)" />
      <rect x={1.5} y={1.5} width={VW - 3} height={VH - 3} rx={VW * 0.007}
        fill="none" stroke="hsl(220, 20%, 35%)" strokeWidth={VW * 0.003} />
      <rect x={5} y={5} width={VW - 10} height={VH - 10} rx={VW * 0.005}
        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={VW * 0.002} />

      {zones.map((zone) => {
        const cfg = lineConfigs[zone.id] ?? defaultZoneConfig();
        const font = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];

        const innerW = VW - PAD * 2;
        const innerH = VH - PAD * 2;
        const zx = PAD + (zone.xPct / 100) * innerW;
        const zy = PAD + (zone.yPct / 100) * innerH;
        const zw = (zone.widthPct / 100) * innerW;
        const zh = (zone.heightPct / 100) * innerH;

        const displayText = cfg.text || zone.placeholder;
        const isPlaceholder = !cfg.text;
        const lines = displayText.split("\n");
        const clampedSize = Math.max(10, Math.min(cfg.fontSize * (VW / 100), zh * 0.58));
        const lineH = clampedSize * 1.28;
        const totalH = lines.length * lineH;

        // Horizontal
        let textX: number;
        let anchor: "start" | "middle" | "end";
        if (cfg.hAlign === "left")       { textX = zx + INNER_PAD; anchor = "start"; }
        else if (cfg.hAlign === "right") { textX = zx + zw - INNER_PAD; anchor = "end"; }
        else                             { textX = zx + zw / 2; anchor = "middle"; }

        // Vertical — baseline of first line
        let baseY: number;
        if (cfg.vAlign === "top")         baseY = zy + INNER_PAD + clampedSize * 0.85;
        else if (cfg.vAlign === "bottom") baseY = zy + zh - totalH + clampedSize * 0.85 - INNER_PAD;
        else                              baseY = zy + zh / 2 - totalH / 2 + clampedSize * 0.85;

        return (
          <g key={zone.id}>
            <rect x={zx} y={zy} width={zw} height={zh}
              fill="hsl(215, 22%, 16%)"
              stroke={isPlaceholder ? "hsl(215, 22%, 32%)" : "hsl(215, 22%, 42%)"}
              strokeWidth={VW * 0.0012}
              strokeDasharray={isPlaceholder ? `${VW * 0.005},${VW * 0.003}` : "0"}
              rx={VW * 0.004} />
            {lines.map((line, i) => (
              <text key={i}
                x={textX} y={baseY + i * lineH}
                textAnchor={anchor}
                fontFamily={font.family}
                fontSize={clampedSize}
                fontWeight={cfg.bold ? 700 : 400}
                fontStyle={cfg.italic ? "italic" : "normal"}
                fill={isPlaceholder ? "hsl(215, 12%, 44%)" : "hsl(210, 55%, 88%)"}
                style={{ userSelect: "none" }}>
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Right panel: customization ───────────────────────────────────────────────

function CustomizePanel({ zones, lineConfigs, numLines, onChangeNumLines, onUpdateZone }: {
  zones: TextZone[];
  lineConfigs: ZoneConfigs;
  numLines: number;
  onChangeNumLines: (n: number) => void;
  onUpdateZone: (id: string, patch: Partial<ZoneConfig>) => void;
}) {
  return (
    <div className="p-3 space-y-4">
      {/* Number of lines */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
          Lines of Text
        </p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <button key={n}
              data-testid={`button-numlines-${n}`}
              onClick={() => onChangeNumLines(n)}
              className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-bold transition-all ${
                numLines === n
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-foreground hover:border-primary"
              }`}>
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Changing lines resets to auto-layout.
        </p>
      </div>

      <div className="border-t border-border" />

      {/* Per-zone editors */}
      {zones.map((zone, idx) => (
        <ZoneEditor
          key={zone.id}
          zone={zone}
          idx={idx}
          cfg={lineConfigs[zone.id] ?? defaultZoneConfig()}
          onUpdate={(patch) => onUpdateZone(zone.id, patch)}
        />
      ))}
    </div>
  );
}

// ─── Per-zone editor ──────────────────────────────────────────────────────────

function ZoneEditor({ zone, idx, cfg, onUpdate }: {
  zone: TextZone;
  idx: number;
  cfg: ZoneConfig;
  onUpdate: (patch: Partial<ZoneConfig>) => void;
}) {
  const font = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
  const letterHeight = approxLetterHeightIn(cfg.fontSize);

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-black text-primary flex-shrink-0">
          {idx + 1}
        </span>
        <span className="text-xs font-semibold text-foreground">{zone.label}</span>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Text input */}
        {zone.multiline ? (
          <textarea
            data-testid={`input-zone-${zone.id}`} rows={2}
            value={cfg.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={zone.placeholder}
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none resize-none"
            style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }}
          />
        ) : (
          <input
            data-testid={`input-zone-${zone.id}`} type="text"
            value={cfg.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={zone.placeholder}
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }}
          />
        )}

        {/* Font family */}
        <Sel
          testId={`select-font-${zone.id}`}
          value={cfg.fontId}
          onChange={(v) => onUpdate({ fontId: v })}
          style={{ fontFamily: font.family }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>{f.label}</option>
          ))}
        </Sel>

        {/* Font size + approx letter height + bold + italic */}
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <Sel
              testId={`select-fontsize-${zone.id}`}
              value={String(cfg.fontSize)}
              onChange={(v) => onUpdate({ fontSize: Number(v) })}
              className="w-[72px]"
            >
              {FONT_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}pt</option>)}
            </Sel>
            <span
              data-testid={`text-letter-height-${zone.id}`}
              className="text-center font-mono text-[9px] text-muted-foreground"
              title="Approximate capital letter height in inches"
            >
              ~{letterHeight}"
            </span>
          </div>

          <ToggleBtn
            testId={`button-bold-${zone.id}`}
            active={cfg.bold} title="Bold"
            onClick={() => onUpdate({ bold: !cfg.bold })}>
            <Bold size={11} />
          </ToggleBtn>
          <ToggleBtn
            testId={`button-italic-${zone.id}`}
            active={cfg.italic} title="Italic"
            onClick={() => onUpdate({ italic: !cfg.italic })}>
            <Italic size={11} />
          </ToggleBtn>
        </div>

        {/* H-align */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground w-4">H</span>
          {(["left", "center", "right"] as const).map((v) => {
            const Icon = v === "left" ? AlignLeft : v === "center" ? AlignCenter : AlignRight;
            return (
              <ToggleBtn key={v}
                testId={`button-halign-${v}-${zone.id}`}
                active={cfg.hAlign === v} title={v}
                onClick={() => onUpdate({ hAlign: v })}>
                <Icon size={11} />
              </ToggleBtn>
            );
          })}
        </div>

        {/* V-align */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground w-4">V</span>
          {(["top", "center", "bottom"] as const).map((v) => (
            <ToggleBtn key={v}
              testId={`button-valign-${v}-${zone.id}`}
              active={cfg.vAlign === v}
              title={v === "top" ? "Top" : v === "center" ? "Middle" : "Bottom"}
              onClick={() => onUpdate({ vAlign: v })}
              wide>
              {v === "top" ? "Top" : v === "center" ? "Mid" : "Bot"}
            </ToggleBtn>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Small shared UI helpers ──────────────────────────────────────────────────

function DropChevron() {
  return (
    <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
      width="9" height="9" viewBox="0 0 12 12">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Sel({ testId, value, onChange, children, style, className }: {
  testId?: string; value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? "w-full"}`}>
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={style}
        className="w-full appearance-none rounded border border-border bg-background px-2 py-1.5 pr-6 text-xs text-foreground focus:border-primary focus:outline-none"
      >
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
    <button
      data-testid={testId}
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex items-center justify-center rounded border text-[10px] font-bold transition-all h-[26px] ${
        wide ? "px-1.5 min-w-[28px]" : "w-[26px]"
      } ${active ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary"}`}
    >
      {children}
    </button>
  );
}
