import { useState, useMemo } from "react";
import { ChevronRight, RotateCcw, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import {
  TAG_SIZES,
  TEMPLATES,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  defaultZoneConfig,
  approxLetterHeightIn,
  type TagSize,
  type Template,
  type ZoneConfigs,
  type ZoneConfig,
} from "@/data/templates";

type Step = 1 | 2 | 3;

// ─── Root ────────────────────────────────────────────────────────────────────

export default function Designer() {
  const [step, setStep] = useState<Step>(1);
  const [selectedSize, setSelectedSize] = useState<TagSize | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [zoneConfigs, setZoneConfigs] = useState<ZoneConfigs>({});

  const compatibleTemplates = useMemo(
    () => selectedSize ? TEMPLATES.filter((t) => t.compatibleSizes.includes(selectedSize.id)) : [],
    [selectedSize]
  );

  function pickSize(size: TagSize) {
    setSelectedSize(size);
    setSelectedTemplate(null);
    setZoneConfigs({});
    setStep(2);
  }

  function pickTemplate(template: Template) {
    setSelectedTemplate(template);
    const configs: ZoneConfigs = {};
    template.zones.forEach((z) => { configs[z.id] = defaultZoneConfig(); });
    setZoneConfigs(configs);
    setStep(3);
  }

  function updateZone(zoneId: string, patch: Partial<ZoneConfig>) {
    setZoneConfigs((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], ...patch } }));
  }

  function reset() {
    setStep(1);
    setSelectedSize(null);
    setSelectedTemplate(null);
    setZoneConfigs({});
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-[hsl(220_25%_12%)] text-white border-b border-slate-700">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary flex-shrink-0">
              <span className="text-xs font-black text-white">NX</span>
            </div>
            <span className="text-base font-bold tracking-tight">
              Nameplates<span className="text-primary">Express</span>
            </span>
          </div>
          {step > 1 && (
            <button data-testid="button-start-over" onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <RotateCcw size={13} /> Start Over
            </button>
          )}
        </div>
      </header>

      <div className="border-b border-border bg-muted/50">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2 text-xs">
          <StepCrumb num={1} label="Select Size" active={step === 1} done={step > 1}
            onClick={step > 1 ? () => { setStep(1); setSelectedTemplate(null); } : undefined} />
          <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
          <StepCrumb num={2} label="Choose Template" active={step === 2} done={step > 2}
            onClick={step > 2 ? () => { setStep(2); setSelectedTemplate(null); } : undefined}
            disabled={step < 2} />
          <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
          <StepCrumb num={3} label="Enter Text & Preview" active={step === 3} done={false} disabled={step < 3} />
        </div>
      </div>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        {step === 1 && <SizeStep onPick={pickSize} />}
        {step === 2 && selectedSize && (
          <TemplateStep size={selectedSize} templates={compatibleTemplates}
            onPick={pickTemplate} onBack={() => setStep(1)} />
        )}
        {step === 3 && selectedSize && selectedTemplate && (
          <TextStep size={selectedSize} template={selectedTemplate}
            zoneConfigs={zoneConfigs} onUpdateZone={updateZone} onBack={() => setStep(2)} />
        )}
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Nameplates Express &bull; Anodized Aluminum &bull; Black &bull; Landscape
      </footer>
    </div>
  );
}

// ─── Breadcrumb step ──────────────────────────────────────────────────────────

function StepCrumb({ num, label, active, done, disabled, onClick }: {
  num: number; label: string; active: boolean; done: boolean;
  disabled?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled || (!onClick && !active)}
      className={`flex items-center gap-1.5 transition-colors ${disabled ? "opacity-40 cursor-default" : onClick ? "cursor-pointer" : "cursor-default"}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
        active ? "bg-primary text-white" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
        {num}
      </span>
      <span className={`font-medium ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
    </button>
  );
}

// ─── Step 1: Size picker ──────────────────────────────────────────────────────

function SizeStep({ onPick }: { onPick: (s: TagSize) => void }) {
  const THUMB_W = 96;
  const THUMB_H_MAX = 52;

  return (
    <div>
      <h1 className="mb-1 text-xl font-black text-foreground">Select Tag Size</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        All tags are landscape orientation (wider than tall). Choose your dimensions.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {TAG_SIZES.map((size) => {
          const aspect = size.height / size.width;
          const thumbH = Math.min(Math.max(16, Math.round(THUMB_W * aspect)), THUMB_H_MAX);
          const thumbW = Math.round(thumbH / aspect);
          return (
            <button key={size.id} data-testid={`button-size-${size.id}`} onClick={() => onPick(size)}
              className="group flex flex-col items-center gap-3 rounded border border-border bg-card p-5 text-center transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
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
  );
}

// ─── Step 2: Template picker ──────────────────────────────────────────────────

function TemplateStep({ size, templates, onPick, onBack }: {
  size: TagSize; templates: Template[];
  onPick: (t: Template) => void; onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button data-testid="button-back-to-sizes" onClick={onBack}
          className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back</button>
        <div>
          <h1 className="text-xl font-black text-foreground">Choose a Layout Template</h1>
          <p className="text-sm text-muted-foreground">
            Templates for <span className="font-semibold text-foreground">{size.label}</span> (landscape)
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <button key={t.id} data-testid={`button-template-${t.id}`} onClick={() => onPick(t)}
            className="group flex flex-col items-start gap-3 rounded border border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
            <MiniPlatePreview size={size} template={t} />
            <div>
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniPlatePreview({ size, template }: { size: TagSize; template: Template }) {
  const aspect = size.height / size.width;
  const W = 200;
  const H = Math.max(28, Math.round(W * aspect));
  return (
    <svg width={W} height={H} style={{ display: "block", borderRadius: 3 }}>
      <defs>
        <linearGradient id={`mg-${template.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(220, 20%, 18%)" />
          <stop offset="100%" stopColor="hsl(220, 15%, 10%)" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx={3} fill={`url(#mg-${template.id})`} />
      <rect width={W} height={H} rx={3} fill="none" stroke="hsl(220, 20%, 30%)" strokeWidth={1.5} />
      {template.zones.map((zone) => (
        <rect key={zone.id}
          x={(zone.xPct / 100) * W} y={(zone.yPct / 100) * H}
          width={(zone.widthPct / 100) * W} height={(zone.heightPct / 100) * H}
          fill="hsl(215, 25%, 22%)" stroke="hsl(215, 25%, 38%)"
          strokeWidth={0.75} strokeDasharray="3,2" rx={1.5} />
      ))}
    </svg>
  );
}

// ─── Step 3: Per-field editor + live preview ──────────────────────────────────

function TextStep({ size, template, zoneConfigs, onUpdateZone, onBack }: {
  size: TagSize; template: Template;
  zoneConfigs: ZoneConfigs;
  onUpdateZone: (id: string, patch: Partial<ZoneConfig>) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button data-testid="button-back-to-templates" onClick={onBack}
          className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back</button>
        <div>
          <h1 className="text-xl font-black text-foreground">Enter Text & Style</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{template.name}</span>
            {" "}&bull; {size.label} &bull; Landscape
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* LEFT: per-zone editors */}
        <div className="space-y-4">
          {template.zones.map((zone, idx) => {
            const cfg = zoneConfigs[zone.id] ?? defaultZoneConfig();
            const font = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
            const letterHeight = approxLetterHeightIn(cfg.fontSize);

            return (
              <div key={zone.id} className="rounded border border-border bg-card overflow-hidden">
                {/* Zone header */}
                <div className="border-b border-border bg-muted/50 px-4 py-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{zone.label}</span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Text input */}
                  {zone.multiline ? (
                    <textarea data-testid={`input-zone-${zone.id}`} rows={3}
                      value={cfg.text} onChange={(e) => onUpdateZone(zone.id, { text: e.target.value })}
                      placeholder={zone.placeholder}
                      className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }} />
                  ) : (
                    <input data-testid={`input-zone-${zone.id}`} type="text"
                      value={cfg.text} onChange={(e) => onUpdateZone(zone.id, { text: e.target.value })}
                      placeholder={zone.placeholder}
                      className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      style={{ fontFamily: font.family, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal" }} />
                  )}

                  {/* Row 1: font family + size + letter height + bold + italic */}
                  <div className="flex items-start gap-2 flex-wrap">
                    {/* Font family */}
                    <div className="relative flex-1 min-w-[140px]">
                      <select data-testid={`select-font-${zone.id}`} value={cfg.fontId}
                        onChange={(e) => onUpdateZone(zone.id, { fontId: e.target.value })}
                        className="w-full appearance-none rounded border border-border bg-background px-2.5 py-1.5 pr-7 text-xs text-foreground focus:border-primary focus:outline-none"
                        style={{ fontFamily: font.family }}>
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>{f.label}</option>
                        ))}
                      </select>
                      <DropChevron />
                    </div>

                    {/* Font size + letter height stacked */}
                    <div className="flex flex-col gap-0.5">
                      <div className="relative w-[82px]">
                        <select data-testid={`select-fontsize-${zone.id}`} value={cfg.fontSize}
                          onChange={(e) => onUpdateZone(zone.id, { fontSize: Number(e.target.value) })}
                          className="w-full appearance-none rounded border border-border bg-background px-2.5 py-1.5 pr-7 text-xs text-foreground focus:border-primary focus:outline-none">
                          {FONT_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}pt</option>)}
                        </select>
                        <DropChevron />
                      </div>
                      <p
                        data-testid={`text-letter-height-${zone.id}`}
                        className="text-center font-mono text-[10px] text-muted-foreground leading-tight"
                        title="Approximate capital letter height in inches"
                      >
                        ~{letterHeight}"
                      </p>
                    </div>

                    {/* Bold */}
                    <button data-testid={`button-bold-${zone.id}`} onClick={() => onUpdateZone(zone.id, { bold: !cfg.bold })}
                      aria-pressed={cfg.bold} title="Bold"
                      className={`flex h-7 w-7 items-center justify-center rounded border transition-all ${cfg.bold ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary"}`}>
                      <Bold size={13} />
                    </button>

                    {/* Italic */}
                    <button data-testid={`button-italic-${zone.id}`} onClick={() => onUpdateZone(zone.id, { italic: !cfg.italic })}
                      aria-pressed={cfg.italic} title="Italic"
                      className={`flex h-7 w-7 items-center justify-center rounded border transition-all ${cfg.italic ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary"}`}>
                      <Italic size={13} />
                    </button>
                  </div>

                  {/* Row 2: H-align + V-align */}
                  <div className="flex items-center gap-4 pt-0.5">
                    {/* Horizontal alignment */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground mr-0.5 uppercase tracking-wide">H</span>
                      {(["left", "center", "right"] as const).map((val) => {
                        const Icon = val === "left" ? AlignLeft : val === "center" ? AlignCenter : AlignRight;
                        const label = val === "left" ? "Left" : val === "center" ? "Center" : "Right";
                        return (
                          <button key={val}
                            data-testid={`button-halign-${val}-${zone.id}`}
                            onClick={() => onUpdateZone(zone.id, { hAlign: val })}
                            aria-pressed={cfg.hAlign === val} title={`Align ${label}`}
                            className={`flex h-7 w-7 items-center justify-center rounded border transition-all ${cfg.hAlign === val ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary"}`}>
                            <Icon size={12} />
                          </button>
                        );
                      })}
                    </div>

                    <div className="h-5 w-px bg-border" />

                    {/* Vertical alignment */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground mr-0.5 uppercase tracking-wide">V</span>
                      {(["top", "center", "bottom"] as const).map((val) => {
                        const label = val === "top" ? "Top" : val === "center" ? "Mid" : "Bot";
                        const title = val === "top" ? "Align Top" : val === "center" ? "Align Middle" : "Align Bottom";
                        return (
                          <button key={val}
                            data-testid={`button-valign-${val}-${zone.id}`}
                            onClick={() => onUpdateZone(zone.id, { vAlign: val })}
                            aria-pressed={cfg.vAlign === val} title={title}
                            className={`flex h-7 w-9 items-center justify-center rounded border text-[10px] font-bold transition-all ${cfg.vAlign === val ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary"}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</p>
          <div className="flex items-center justify-center rounded border border-border bg-[hsl(220_20%_8%)] p-6">
            <PlatePreview size={size} template={template} zoneConfigs={zoneConfigs} />
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
            {size.label} &bull; Landscape &bull; Black Anodized Aluminum &bull; Not to scale
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Small helper: dropdown chevron ───────────────────────────────────────────

function DropChevron() {
  return (
    <svg className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      width="10" height="10" viewBox="0 0 12 12">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── SVG plate preview ────────────────────────────────────────────────────────

function PlatePreview({ size, template, zoneConfigs }: {
  size: TagSize; template: Template; zoneConfigs: ZoneConfigs;
}) {
  const MAX_W = 420;
  const MAX_H = 260;
  const aspect = size.height / size.width; // < 1 for landscape
  let W = MAX_W;
  let H = W * aspect;
  if (H > MAX_H) { H = MAX_H; W = H / aspect; }

  const PAD = 8;
  const INNER_PAD = 4; // text padding inside zone

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", maxWidth: "100%" }}>
      <defs>
        <linearGradient id="plate-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="hsl(220, 18%, 19%)" />
          <stop offset="55%"  stopColor="hsl(220, 15%, 11%)" />
          <stop offset="100%" stopColor="hsl(220, 18%, 16%)" />
        </linearGradient>
        <linearGradient id="plate-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.07)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Plate body */}
      <rect x={0} y={0} width={W} height={H} rx={4} fill="url(#plate-bg)" />
      <rect x={0} y={0} width={W} height={H} rx={4} fill="url(#plate-shine)" />
      <rect x={1} y={1} width={W - 2} height={H - 2} rx={3.5} fill="none"
        stroke="hsl(220, 20%, 34%)" strokeWidth={1.5} />
      <rect x={3} y={3} width={W - 6} height={H - 6} rx={2.5} fill="none"
        stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

      {template.zones.map((zone) => {
        const cfg = zoneConfigs[zone.id] ?? defaultZoneConfig();
        const font = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];

        const innerW = W - PAD * 2;
        const innerH = H - PAD * 2;
        const zx = PAD + (zone.xPct / 100) * innerW;
        const zy = PAD + (zone.yPct / 100) * innerH;
        const zw = (zone.widthPct / 100) * innerW;
        const zh = (zone.heightPct / 100) * innerH;

        const displayText = cfg.text || zone.placeholder;
        const isPlaceholder = !cfg.text;
        const lines = displayText.split("\n");

        // Clamp font size to zone height
        const clampedSize = Math.max(6, Math.min(cfg.fontSize, zh * 0.55));
        const lineH = clampedSize * 1.25;
        const totalTextH = lines.length * lineH;

        // Horizontal alignment
        let textX: number;
        let textAnchor: "start" | "middle" | "end";
        if (cfg.hAlign === "left") {
          textX = zx + INNER_PAD;
          textAnchor = "start";
        } else if (cfg.hAlign === "right") {
          textX = zx + zw - INNER_PAD;
          textAnchor = "end";
        } else {
          textX = zx + zw / 2;
          textAnchor = "middle";
        }

        // Vertical alignment — baseline of first line
        let firstBaselineY: number;
        if (cfg.vAlign === "top") {
          firstBaselineY = zy + INNER_PAD + clampedSize * 0.85;
        } else if (cfg.vAlign === "bottom") {
          firstBaselineY = zy + zh - totalTextH + clampedSize * 0.85 - INNER_PAD;
        } else {
          // center
          firstBaselineY = zy + zh / 2 - totalTextH / 2 + clampedSize * 0.85;
        }

        return (
          <g key={zone.id}>
            <rect x={zx} y={zy} width={zw} height={zh}
              fill="hsl(215, 22%, 16%)"
              stroke={isPlaceholder ? "hsl(215, 22%, 32%)" : "hsl(215, 22%, 40%)"}
              strokeWidth={0.75} strokeDasharray={isPlaceholder ? "3,2" : "0"} rx={2} />
            {lines.map((line, i) => (
              <text key={i}
                x={textX} y={firstBaselineY + i * lineH}
                textAnchor={textAnchor}
                fontFamily={font.family}
                fontSize={clampedSize}
                fontWeight={cfg.bold ? 700 : 400}
                fontStyle={cfg.italic ? "italic" : "normal"}
                fill={isPlaceholder ? "hsl(215, 14%, 42%)" : "hsl(210, 55%, 88%)"}
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
