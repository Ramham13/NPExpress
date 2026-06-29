import { useState, useMemo } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import {
  TAG_SIZES,
  TEMPLATES,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  type TagSize,
  type Template,
} from "@/data/templates";

type Step = 1 | 2 | 3;

export default function Designer() {
  const [step, setStep] = useState<Step>(1);
  const [selectedSize, setSelectedSize] = useState<TagSize | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [fontId, setFontId] = useState("arial");
  const [fontSize, setFontSize] = useState(14);

  const selectedFont = FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0];

  const compatibleTemplates = useMemo(
    () =>
      selectedSize
        ? TEMPLATES.filter((t) => t.compatibleSizes.includes(selectedSize.id))
        : [],
    [selectedSize]
  );

  function pickSize(size: TagSize) {
    setSelectedSize(size);
    setSelectedTemplate(null);
    setTextValues({});
    setStep(2);
  }

  function pickTemplate(template: Template) {
    setSelectedTemplate(template);
    const defaults: Record<string, string> = {};
    template.zones.forEach((z) => (defaults[z.id] = ""));
    setTextValues(defaults);
    setStep(3);
  }

  function reset() {
    setStep(1);
    setSelectedSize(null);
    setSelectedTemplate(null);
    setTextValues({});
    setFontId("arial");
    setFontSize(14);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
            <button
              data-testid="button-start-over"
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={13} />
              Start Over
            </button>
          )}
        </div>
      </header>

      {/* Breadcrumb stepper */}
      <div className="border-b border-border bg-muted/50">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2 text-xs">
          <StepCrumb num={1} label="Select Size" active={step === 1} done={step > 1} onClick={step > 1 ? () => { setStep(1); setSelectedTemplate(null); } : undefined} />
          <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
          <StepCrumb num={2} label="Choose Template" active={step === 2} done={step > 2} onClick={step > 2 ? () => { setStep(2); setSelectedTemplate(null); } : undefined} disabled={step < 2} />
          <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
          <StepCrumb num={3} label="Enter Text & Preview" active={step === 3} done={false} disabled={step < 3} />
        </div>
      </div>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        {step === 1 && <SizeStep onPick={pickSize} />}
        {step === 2 && selectedSize && (
          <TemplateStep
            size={selectedSize}
            templates={compatibleTemplates}
            onPick={pickTemplate}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && selectedSize && selectedTemplate && (
          <TextStep
            size={selectedSize}
            template={selectedTemplate}
            textValues={textValues}
            setTextValues={setTextValues}
            fontId={fontId}
            setFontId={setFontId}
            fontSize={fontSize}
            setFontSize={setFontSize}
            fontFamily={selectedFont.family}
            onBack={() => setStep(2)}
          />
        )}
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Nameplates Express &bull; Anodized Aluminum &bull; Black
      </footer>
    </div>
  );
}

// ─── Step breadcrumb ────────────────────────────────────────────────────────

function StepCrumb({
  num, label, active, done, disabled, onClick,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || (!onClick && !active)}
      className={`flex items-center gap-1.5 transition-colors ${
        disabled ? "opacity-40 cursor-default" : onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
          active
            ? "bg-primary text-white"
            : done
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {num}
      </span>
      <span
        className={`font-medium ${
          active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Step 1: Size picker ─────────────────────────────────────────────────────

function SizeStep({ onPick }: { onPick: (s: TagSize) => void }) {
  return (
    <div>
      <h1 className="mb-1 text-xl font-black text-foreground">Select Tag Size</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose the dimensions for your anodized aluminum nameplate.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {TAG_SIZES.map((size) => {
          const aspect = size.height / size.width;
          const previewH = Math.min(72, 36 * aspect);
          const previewW = previewH / aspect;
          return (
            <button
              key={size.id}
              data-testid={`button-size-${size.id}`}
              onClick={() => onPick(size)}
              className="group flex flex-col items-center gap-3 rounded border border-border bg-card p-5 text-center transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {/* Mini plate visual */}
              <div
                className="rounded-sm"
                style={{
                  width: previewW,
                  height: previewH,
                  background: "linear-gradient(145deg, hsl(220 20% 18%), hsl(220 15% 10%))",
                  border: "2px solid hsl(220 20% 30%)",
                  flexShrink: 0,
                }}
              />
              <div>
                <p className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {size.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Template picker ──────────────────────────────────────────────────

function TemplateStep({
  size,
  templates,
  onPick,
  onBack,
}: {
  size: TagSize;
  templates: Template[];
  onPick: (t: Template) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button
          data-testid="button-back-to-sizes"
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-xl font-black text-foreground">Choose a Layout Template</h1>
          <p className="text-sm text-muted-foreground">
            Showing templates available for <span className="font-semibold text-foreground">{size.label}</span>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <button
            key={t.id}
            data-testid={`button-template-${t.id}`}
            onClick={() => onPick(t)}
            className="group flex flex-col items-start gap-3 rounded border border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {/* Mini template preview */}
            <MiniPlatePreview size={size} template={t} />
            <div>
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {t.name}
              </p>
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
  const W = 160;
  const H = Math.min(120, W * aspect);
  const actualW = H / aspect;

  return (
    <svg
      width={actualW}
      height={H}
      style={{ display: "block", borderRadius: 3, overflow: "hidden" }}
    >
      {/* Plate body */}
      <defs>
        <linearGradient id={`grad-mini-${template.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(220, 20%, 18%)" />
          <stop offset="100%" stopColor="hsl(220, 15%, 10%)" />
        </linearGradient>
      </defs>
      <rect width={actualW} height={H} fill={`url(#grad-mini-${template.id})`} rx={3} />
      <rect width={actualW} height={H} fill="none" stroke="hsl(220, 20%, 30%)" strokeWidth={1.5} rx={3} />

      {template.zones.map((zone) => {
        const x = (zone.xPct / 100) * actualW;
        const y = (zone.yPct / 100) * H;
        const w = (zone.widthPct / 100) * actualW;
        const h = (zone.heightPct / 100) * H;
        return (
          <rect
            key={zone.id}
            x={x} y={y} width={w} height={h}
            fill="hsl(215, 25%, 22%)"
            stroke="hsl(215, 25%, 35%)"
            strokeWidth={0.75}
            strokeDasharray="2,2"
            rx={1.5}
          />
        );
      })}
    </svg>
  );
}

// ─── Step 3: Text editor + live preview ───────────────────────────────────────

function TextStep({
  size,
  template,
  textValues,
  setTextValues,
  fontId,
  setFontId,
  fontSize,
  setFontSize,
  fontFamily,
  onBack,
}: {
  size: TagSize;
  template: Template;
  textValues: Record<string, string>;
  setTextValues: (v: Record<string, string>) => void;
  fontId: string;
  setFontId: (id: string) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  fontFamily: string;
  onBack: () => void;
}) {
  function setZoneText(zoneId: string, value: string) {
    setTextValues({ ...textValues, [zoneId]: value });
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button
          data-testid="button-back-to-templates"
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-xl font-black text-foreground">Enter Your Text</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{template.name}</span> &bull; {size.label}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* LEFT: controls */}
        <div className="space-y-5">
          {/* Text zones */}
          {template.zones.map((zone) => (
            <div key={zone.id}>
              <label
                htmlFor={`zone-${zone.id}`}
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {zone.label}
              </label>
              {zone.placeholder.includes("\n") ? (
                <textarea
                  id={`zone-${zone.id}`}
                  data-testid={`input-zone-${zone.id}`}
                  rows={3}
                  value={textValues[zone.id] ?? ""}
                  onChange={(e) => setZoneText(zone.id, e.target.value)}
                  placeholder={zone.placeholder}
                  className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              ) : (
                <input
                  id={`zone-${zone.id}`}
                  data-testid={`input-zone-${zone.id}`}
                  type="text"
                  value={textValues[zone.id] ?? ""}
                  onChange={(e) => setZoneText(zone.id, e.target.value)}
                  placeholder={zone.placeholder}
                  className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}
            </div>
          ))}

          <div className="border-t border-border pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Text Options
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Font */}
              <div>
                <label
                  htmlFor="font-select"
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  Font
                </label>
                <div className="relative">
                  <select
                    id="font-select"
                    data-testid="select-font"
                    value={fontId}
                    onChange={(e) => setFontId(e.target.value)}
                    className="w-full appearance-none rounded border border-border bg-card px-3 py-2 pr-7 text-sm text-foreground focus:border-primary focus:outline-none"
                    style={{ fontFamily }}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                </div>
              </div>

              {/* Font size */}
              <div>
                <label
                  htmlFor="fontsize-select"
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  Font Size
                </label>
                <div className="relative">
                  <select
                    id="fontsize-select"
                    data-testid="select-fontsize"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full appearance-none rounded border border-border bg-card px-3 py-2 pr-7 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {FONT_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}pt
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Preview
          </p>
          <div className="flex items-start justify-center rounded border border-border bg-[hsl(220_20%_8%)] p-6">
            <PlatePreview
              size={size}
              template={template}
              textValues={textValues}
              fontFamily={fontFamily}
              fontSize={fontSize}
            />
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground font-mono">
            {size.label} · Black Anodized Aluminum · Not to scale
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SVG Plate Preview ────────────────────────────────────────────────────────

function PlatePreview({
  size,
  template,
  textValues,
  fontFamily,
  fontSize,
}: {
  size: TagSize;
  template: Template;
  textValues: Record<string, string>;
  fontFamily: string;
  fontSize: number;
}) {
  // Scale to a fixed max display width
  const maxW = 380;
  const maxH = 300;
  const aspect = size.height / size.width;
  let W = maxW;
  let H = W * aspect;
  if (H > maxH) {
    H = maxH;
    W = H / aspect;
  }

  const PAD = 10; // inner padding px

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", maxWidth: "100%" }}
    >
      <defs>
        <linearGradient id="plate-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(220, 18%, 19%)" />
          <stop offset="60%" stopColor="hsl(220, 15%, 11%)" />
          <stop offset="100%" stopColor="hsl(220, 18%, 16%)" />
        </linearGradient>
        {/* Highlight overlay */}
        <linearGradient id="plate-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={W} height={H} rx={4} />
        </clipPath>
      </defs>

      {/* Plate body */}
      <rect x={0} y={0} width={W} height={H} rx={4} fill="url(#plate-grad)" />
      {/* Shine */}
      <rect x={0} y={0} width={W} height={H} rx={4} fill="url(#plate-shine)" clipPath="url(#plate-clip)" />
      {/* Border */}
      <rect x={0.75} y={0.75} width={W - 1.5} height={H - 1.5} rx={3.5} fill="none" stroke="hsl(220, 20%, 32%)" strokeWidth={1.5} />
      {/* Inner shadow line */}
      <rect x={2.5} y={2.5} width={W - 5} height={H - 5} rx={2.5} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

      {template.zones.map((zone) => {
        const x = PAD + (zone.xPct / 100) * (W - PAD * 2);
        const y = PAD + (zone.yPct / 100) * (H - PAD * 2);
        const w = (zone.widthPct / 100) * (W - PAD * 2);
        const h = (zone.heightPct / 100) * (H - PAD * 2);
        const displayText = textValues[zone.id] || zone.placeholder;
        const isPlaceholder = !textValues[zone.id];
        const textX = zone.align === "center" ? x + w / 2 : x + 6;

        // Clamp font size so it fits zone height
        const maxFontForZone = Math.max(8, Math.min(fontSize, h * 0.6));

        return (
          <g key={zone.id}>
            <rect
              x={x} y={y} width={w} height={h}
              fill="hsl(215, 22%, 16%)"
              stroke="hsl(215, 22%, 32%)"
              strokeWidth={0.75}
              strokeDasharray={isPlaceholder ? "3,2" : "0"}
              rx={2}
            />
            {/* Render each line of text */}
            {displayText.split("\n").map((line, i, arr) => {
              const lineH = maxFontForZone * 1.3;
              const totalH = arr.length * lineH;
              const startY = y + h / 2 - totalH / 2 + lineH * 0.75;
              return (
                <text
                  key={i}
                  x={textX}
                  y={startY + i * lineH}
                  textAnchor={zone.align === "center" ? "middle" : "start"}
                  fontFamily={fontFamily}
                  fontSize={maxFontForZone}
                  fill={isPlaceholder ? "hsl(215, 16%, 42%)" : "hsl(210, 60%, 88%)"}
                  style={{ userSelect: "none" }}
                >
                  {line}
                </text>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
