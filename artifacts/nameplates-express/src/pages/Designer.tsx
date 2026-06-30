import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { RotateCcw, Bold, Italic, WrapText, AlertTriangle, Rows3, Columns3, ShoppingCart, Download, Upload, FileJson } from "lucide-react";
import {
  TAG_SIZES, TEMPLATES, FONT_OPTIONS, FONT_SIZE_OPTIONS,
  defaultZoneConfig, approxLetterHeightIn,
  type TagSize, type Template, type TextZone, type ZoneConfigs, type ZoneConfig,
} from "@/data/templates";
import { useAdmin } from "@/context/AdminContext";
import { DEFAULT_COLOR_PALETTE } from "@/lib/admin-store";
import {
  SVG_VW, PAD_RATIO, STEP,
  H_TOP, H_BOT, H_GAP, V_TOP, V_BOT, V_LEFT, V_RIGHT, V_GAP,
  snap, defaultSegments, heightsFromTemplate, adjustOne, moveDivider,
  defaultDivider, defaultDividers,
  computeHZones, computeVZones, computeOverflowMap, computeTextLayout, dividerDashArray,
  type Direction, type DividerConfig, type DividerStyle, type OverflowInfo, type CartItem,
} from "@/lib/plate-utils";
import PlateFinalPreview from "@/components/PlateFinalPreview";
import CsvView from "@/pages/CsvView";
import CartView from "@/pages/CartView";
import CheckoutGuest, { blankGuestInfo, type GuestInfo } from "@/pages/CheckoutGuest";
import CheckoutReview from "@/pages/CheckoutReview";
import CheckoutDone from "@/pages/CheckoutDone";
import QuoteDone from "@/pages/QuoteDone";

// Inner padding used only in the editor preview (decorative divider line inset)
const IPAD_RATIO = 0.008;

// ─── Root ─────────────────────────────────────────────────────────────────────

type AppView =
  | "design" | "csv" | "cart"
  | "checkout" | "checkout-review" | "order-confirmed"
  | "quote"   | "quote-confirmed";

export default function Designer() {
  // ── Admin-managed sizes + selected color ─────────────────────────────────
  const { sizes, activeSizes } = useAdmin();

  // ── Top-level: cart + app view ───────────────────────────────────────────
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [appView, setAppView]     = useState<AppView>("design");
  const [selectedSize, setSelectedSize] = useState<TagSize | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("black");

  // ── Checkout state ───────────────────────────────────────────────────────
  const [guestInfo,      setGuestInfo]      = useState<GuestInfo>(blankGuestInfo());
  const [orderNumber,    setOrderNumber]    = useState<string>("");
  const [confirmedCart,  setConfirmedCart]  = useState<CartItem[]>([]);

  function makeOrderNumber() {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `NX-${year}-${rand}`;
  }

  function startCheckout() { setAppView("checkout"); }
  function startQuote()    { setAppView("quote");    }
  function goToCart()      { setAppView("cart");     }
  function goToDesign()    { setSelectedSize(null); setAppView("design"); }

  // ── Design state ────────────────────────────────────────────────────────
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [direction, setDirection]   = useState<Direction>("horizontal");
  const [heights,   setHeights]     = useState<number[]>([100]);
  const [widths,    setWidths]       = useState<number[]>([100]);
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

  // Admin-managed color options for the selected size
  const adminSizeData = selectedSize ? sizes.find(s => s.id === selectedSize.id) : null;
  const availableColors = adminSizeData?.colors.filter(c => c.enabled) ?? [];
  const selectedColorLabel = availableColors.find(c => c.id === selectedColor)?.label ?? "Black";

  // ── Cart helpers ─────────────────────────────────────────────────────────
  function addSingleToCart() {
    if (!selectedSize || hasOverflow) return;
    const item: CartItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      size: selectedSize,
      direction, heights, widths,
      lineConfigs: JSON.parse(JSON.stringify(lineConfigs)),
      dividers: JSON.parse(JSON.stringify(dividers)),
      color: selectedColor,
      addedAt: Date.now(),
    };
    setCart((prev) => [...prev, item]);
  }

  function addBatchToCart(items: Omit<CartItem, "id" | "addedAt" | "batchId">[]) {
    const batchId = `batch-${Date.now()}`;
    const cartItems: CartItem[] = items.map((item, i) => ({
      ...item,
      id: `${batchId}-${i}`,
      addedAt: Date.now(),
      batchId,
    }));
    setCart((prev) => [...prev, ...cartItems]);
    setAppView("design");
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  // ── Size / template / design actions ────────────────────────────────────
  function pickSize(size: TagSize) {
    setSelectedSize(size);
    setActiveTemplateId(null);
    setDirection("horizontal");
    setHeights([100]); setWidths([100]);
    setLineConfigs({ line1: defaultZoneConfig() });
    setDividers([]);
    // reset to first available enabled color for this size (default: black)
    const adminSize = sizes.find(s => s.id === size.id);
    const firstColor = adminSize?.colors.find(c => c.enabled)?.id ?? "black";
    setSelectedColor(firstColor);
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

  // ── Layout export / import ───────────────────────────────────────────────
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function exportLayout() {
    if (!selectedSize) return;
    const payload = {
      app: "nameplates-express",
      version: "1",
      exportedAt: new Date().toISOString(),
      size: selectedSize,
      direction,
      heights,
      widths,
      lineConfigs,
      dividers,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `nameplate-layout-${selectedSize.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importLayout(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        // Basic identity validation
        if (data?.app !== "nameplates-express" || !data?.version) {
          setImportError("Not a valid Nameplates Express layout file.");
          return;
        }

        // Field presence
        if (!data.size || !data.direction || !Array.isArray(data.heights) ||
            !Array.isArray(data.widths) || !data.lineConfigs || !Array.isArray(data.dividers)) {
          setImportError("Layout file is missing required fields.");
          return;
        }

        // Size must be a known size
        const knownSize = (sizes.find((s) => s.id === data.size.id) ?? TAG_SIZES.find((s) => s.id === data.size.id)) as TagSize | undefined;
        if (!knownSize) {
          setImportError(`Unknown size id "${data.size.id}". Add this size in admin settings or use a different layout file.`);
          return;
        }

        // Direction must be valid
        if (data.direction !== "horizontal" && data.direction !== "vertical") {
          setImportError(`Invalid direction "${data.direction}".`);
          return;
        }

        // Apply — use known size object (not the one from the file) for safety
        setSelectedSize(knownSize);
        setDirection(data.direction as Direction);
        setHeights(data.heights);
        setWidths(data.widths);
        setLineConfigs(data.lineConfigs);
        setDividers(data.dividers);
        setActiveTemplateId(null);
        setImportError(null);
      } catch {
        setImportError("Could not parse the layout file. Make sure it is a valid .json file.");
      }
    };
    reader.readAsText(file);
  }

  // ── Full-screen views ────────────────────────────────────────────────────
  if (appView === "cart") {
    return (
      <CartView
        cart={cart}
        onBack={() => setAppView("design")}
        onRemove={removeFromCart}
        onClearAll={() => setCart([])}
        onCheckout={startCheckout}
        onQuote={startQuote}
      />
    );
  }

  if (appView === "checkout") {
    return (
      <CheckoutGuest
        cart={cart}
        mode="paypal"
        initialInfo={guestInfo}
        onBack={goToCart}
        onSubmit={(info) => { setGuestInfo(info); setAppView("checkout-review"); }}
      />
    );
  }

  if (appView === "checkout-review") {
    return (
      <CheckoutReview
        cart={cart}
        guestInfo={guestInfo}
        onBack={() => setAppView("checkout")}
        onPaid={() => {
          const num = makeOrderNumber();
          setOrderNumber(num);
          setConfirmedCart([...cart]); // snapshot before clearing
          setCart([]);
          setAppView("order-confirmed");
        }}
      />
    );
  }

  if (appView === "order-confirmed") {
    return (
      <CheckoutDone
        orderNumber={orderNumber}
        guestInfo={guestInfo}
        cart={confirmedCart}
        onNewOrder={() => { setGuestInfo(blankGuestInfo()); setConfirmedCart([]); goToDesign(); }}
      />
    );
  }

  if (appView === "quote") {
    return (
      <CheckoutGuest
        cart={cart}
        mode="quote"
        initialInfo={guestInfo}
        onBack={goToCart}
        onSubmit={(info) => { setGuestInfo(info); setAppView("quote-confirmed"); }}
      />
    );
  }

  if (appView === "quote-confirmed") {
    return (
      <QuoteDone
        guestInfo={guestInfo}
        cart={cart}
        onNewOrder={() => { setGuestInfo(blankGuestInfo()); setCart([]); goToDesign(); }}
      />
    );
  }

  if (appView === "csv" && selectedSize) {
    return (
      <CsvView
        size={selectedSize}
        direction={direction}
        heights={heights}
        widths={widths}
        baseLineConfigs={lineConfigs}
        dividers={dividers}
        onAccept={addBatchToCart}
        onBack={() => setAppView("design")}
      />
    );
  }

  if (!selectedSize) {
    return (
      <SizePicker
        sizes={activeSizes}
        onPick={pickSize}
        cartCount={cart.length}
        onCartClick={() => setAppView("cart")}
      />
    );
  }

  // ── Main editor view ─────────────────────────────────────────────────────
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
              {selectedSize.label} · Landscape · {selectedColorLabel} Anodized Aluminum
            </span>
            <button data-testid="button-change-size" onClick={() => setSelectedSize(null)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap">
              <RotateCcw size={11} /> Change Size
            </button>
            {/* Cart badge */}
            <button
              onClick={() => setAppView("cart")}
              className="relative flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <ShoppingCart size={15} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Three-panel layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left: templates */}
        <aside className="lg:w-44 xl:w-52 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto bg-muted/20" style={{ minHeight: 0 }}>
          <TemplatePanel size={selectedSize} templates={compatibleTemplates}
            activeTemplateId={activeTemplateId} onBlank={selectBlank} onTemplate={selectTemplate} />
        </aside>

        {/* Center: editor preview + final preview */}
        <div
          className="flex-1 overflow-y-auto bg-[hsl(220_20%_8%)] px-4 py-5 lg:px-8 lg:py-6"
          style={{ minHeight: "180px", minWidth: 0 }}
        >
          <div className="mx-auto" style={{ maxWidth: "820px" }}>
            {/* ── Editor preview ── */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2 select-none">
              Editor Preview
            </p>
            <PlatePreview
              size={selectedSize} zones={zones} lineConfigs={lineConfigs}
              segments={segments} direction={direction} dividers={dividers}
              overflowMap={overflowMap} onSegmentsChange={handleSegmentsChange}
            />

            {/* ── Separator ── */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 border-t border-slate-700" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 select-none">
                Final Product Preview
              </span>
              <div className="flex-1 border-t border-slate-700" />
            </div>

            {/* ── Final product preview ── */}
            <PlateFinalPreview
              uid="designer-fp"
              size={selectedSize}
              zones={zones}
              lineConfigs={lineConfigs}
              dividers={dividers}
              direction={direction}
              colorId={selectedColor}
            />
          </div>
        </div>

        {/* Right: customize */}
        <aside className="lg:w-72 xl:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto bg-background" style={{ minHeight: 0 }}>
          {/* Hidden file input for layout import */}
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importLayout(f);
              e.target.value = "";
            }}
          />
          {/* ── Plate color selector (only when multiple colors available) ── */}
          {availableColors.length > 1 && (
            <div className="px-3 py-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Plate Color
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {availableColors.map(color => (
                  <button key={color.id} title={color.label}
                    onClick={() => setSelectedColor(color.id)}
                    className={`relative flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all ${
                      selectedColor === color.id
                        ? "border-primary shadow-sm scale-110"
                        : "border-transparent hover:border-slate-500"
                    }`}
                    style={{ backgroundColor: color.hex }}>
                    {selectedColor === color.id && (
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.8"
                          fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
                <span className="text-xs text-muted-foreground">
                  {selectedColorLabel}
                </span>
              </div>
            </div>
          )}

          <CustomizePanel
            zones={zones} lineConfigs={lineConfigs}
            numSegments={numSegments} segments={segments}
            direction={direction} dividers={dividers}
            overflowMap={overflowMap} hasOverflow={hasOverflow}
            cartCount={cart.length}
            importError={importError}
            onChangeDirection={changeDirection}
            onChangeNumSegments={changeNumSegments}
            onAdjustSegment={adjustSegment}
            onUpdateZone={updateZone}
            onUpdateDivider={updateDivider}
            onAddToCart={addSingleToCart}
            onBulkCsv={() => setAppView("csv")}
            onViewCart={() => setAppView("cart")}
            onExportLayout={exportLayout}
            onImportLayout={() => importFileRef.current?.click()}
          />
        </aside>
      </div>
    </div>
  );
}

// ─── Size picker ──────────────────────────────────────────────────────────────

function SizePicker({ sizes, onPick, cartCount, onCartClick }: {
  sizes: TagSize[];
  onPick: (s: TagSize) => void;
  cartCount: number;
  onCartClick: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-[hsl(220_25%_12%)] text-white border-b border-slate-700">
        <div className="px-4 py-3 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
              <span className="text-xs font-black text-white">NX</span>
            </div>
            <span className="text-sm font-bold tracking-tight">
              Nameplates<span className="text-primary">Express</span>
            </span>
          </div>
          {cartCount > 0 && (
            <button
              onClick={onCartClick}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <ShoppingCart size={14} />
              View Order ({cartCount})
            </button>
          )}
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-black text-foreground">Select Nameplate Size</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          All nameplates are landscape orientation. Select a size to open the designer.
        </p>
        {sizes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <p className="text-base font-semibold">No sizes available</p>
            <p className="text-sm">An administrator needs to activate at least one size.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sizes.map((size) => {
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
        )}
      </div>
      <footer className="mt-auto border-t border-border py-4 text-center text-xs text-muted-foreground">
        Nameplates Express &bull; Anodized Aluminum
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

// ─── Center: live SVG plate preview (editor with handles) ─────────────────────

type DragState = {
  idx: number;
  startClientY: number;
  startClientX: number;
  startValues: number[];
  lastDelta: number;
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
  const PAD      = VW * PAD_RATIO;
  const INNER_PAD = VW * IPAD_RATIO;
  const innerW = VW - PAD * 2, innerH = VH - PAD * 2;
  const n = segments.length;

  const hAvailPct = 100 - H_TOP - H_BOT - H_GAP * (n - 1);
  const vAvailPct = 100 - V_LEFT - V_RIGHT - V_GAP * (n - 1);
  const availH    = (hAvailPct / 100) * innerH;
  const availColW = (vAvailPct / 100) * innerW;

  const svgRef  = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draggingIdx,   setDraggingIdx]   = useState<number | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<number | null>(null);

  // ── Pointer-event drag handlers ───────────────────────────────────────────
  // All events flow through the SVG element.  setPointerCapture on the SVG
  // guarantees that pointermove / pointerup / pointercancel fire here even
  // when the cursor leaves the element — no window-level mouse listeners needed.

  function onHandlePointerDown(idx: number, e: React.PointerEvent) {
    e.preventDefault();
    // Capture on the SVG so it receives all future pointer events for this drag.
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      idx, startClientY: e.clientY, startClientX: e.clientX,
      startValues: [...segments], lastDelta: 0, dragDir: direction,
    };
    setDraggingIdx(idx);
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
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
    if (snappedDelta === dragRef.current.lastDelta) return;
    dragRef.current.lastDelta = snappedDelta;
    onSegmentsChange(moveDivider(startValues, idx, snappedDelta));
  }

  function stopDrag(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setDraggingIdx(null);
  }

  // Escape key cancels an in-progress drag and restores the original segment values.
  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape" && dragRef.current) {
        onSegmentsChange([...dragRef.current.startValues]);
        dragRef.current = null;
        setDraggingIdx(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSegmentsChange]);

  const rects = zones.map((zone) => ({
    zone,
    zx: PAD + (zone.xPct      / 100) * innerW,
    zy: PAD + (zone.yPct      / 100) * innerH,
    zw: (zone.widthPct  / 100) * innerW,
    zh: (zone.heightPct / 100) * innerH,
  }));

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`}
      onPointerMove={onSvgPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      style={{ width: "100%", height: "100%", maxWidth: `${VW}px`, display: "block", userSelect: "none", touchAction: "none" }}
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
        const cfg         = lineConfigs[zone.id] ?? defaultZoneConfig();
        const isPlaceholder = !cfg.text;
        const font        = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
        const ov          = overflowMap[zone.id];
        const overflows   = ov?.overflows ?? false;

        // ── Alignment fix: dominantBaseline="hanging" → y = top of em square.
        //    All positioning is in terms of the TEXT BLOCK TOP, not the baseline.
        //    top    → firstLineY = zy
        //    center → firstLineY = zy + (zh − blockH) / 2
        //    bottom → firstLineY = zy + zh − blockH
        //    No font-metric approximations needed.
        const layout = computeTextLayout(cfg, zone, zx, zy, zw, zh, size, isPlaceholder);

        return (
          <g key={zone.id}>
            {/* Zone background rect (editor only) */}
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

            {/* Text — clipped to zone */}
            <g clipPath={`url(#clip-${zone.id})`}>
              {layout.lines.map((line, i) => (
                <text key={i}
                  x={layout.textX}
                  y={layout.firstLineY + i * layout.lineH}
                  textAnchor={layout.anchor}
                  fontFamily={font.family}
                  fontSize={layout.svgPt}
                  fontWeight={cfg.bold ? 700 : 400}
                  fontStyle={cfg.italic ? "italic" : "normal"}
                  fill="hsl(210, 55%, 88%)"
                  style={{ userSelect: "none" }}>
                  {line}
                </text>
              ))}
            </g>

            {/* Overflow badge */}
            {overflows && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={zx + zw - 112} y={zy + 5} width={107} height={19} rx={9.5} fill="hsl(0, 84%, 52%)" />
                <text x={zx + zw - 58.5} y={zy + 17.5} textAnchor="middle" fontSize={11}
                  fill="white" fontFamily="system-ui, sans-serif" fontWeight={600}
                  dominantBaseline="alphabetic"
                  style={{ userSelect: "none" }}>⚠ Text overflow</text>
              </g>
            )}
          </g>
        );
      })}

      {/* Decorative divider lines */}
      {n > 1 && rects.slice(0, -1).map(({ zx, zy, zw, zh }, i) => {
        const div = dividers[i];
        if (!div?.enabled) return null;
        const dArr = dividerDashArray(div.style);
        const next = rects[i + 1];
        if (direction === "horizontal") {
          const midY = (zy + zh + next.zy) / 2;
          return (
            <line key={`divline-${i}`}
              x1={zx + INNER_PAD} y1={midY} x2={zx + zw - INNER_PAD} y2={midY}
              stroke="hsl(210, 35%, 68%)" strokeWidth={VW * 0.0032}
              strokeDasharray={dArr} strokeLinecap="round" style={{ pointerEvents: "none" }} />
          );
        } else {
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
                dominantBaseline="alphabetic"
                fill="rgba(255,255,255,0.9)" fontFamily="sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>
                ▲ ▼
              </text>
            </g>
          );
        } else {
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
              <rect x={midX - 12} y={midY - 30} width={24} height={60} rx={12}
                fill={pillFill} style={{ pointerEvents: "none" }} />
              <text x={midX} y={midY - 8} textAnchor="middle" fontSize={12}
                dominantBaseline="alphabetic"
                fill="rgba(255,255,255,0.9)" fontFamily="sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>
                ◄
              </text>
              <text x={midX} y={midY + 14} textAnchor="middle" fontSize={12}
                dominantBaseline="alphabetic"
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
  hasOverflow, cartCount, importError,
  onChangeDirection, onChangeNumSegments, onAdjustSegment, onUpdateZone, onUpdateDivider,
  onAddToCart, onBulkCsv, onViewCart, onExportLayout, onImportLayout,
}: {
  zones: TextZone[]; lineConfigs: ZoneConfigs;
  numSegments: number; segments: number[];
  direction: Direction; dividers: DividerConfig[];
  overflowMap: Record<string, OverflowInfo>;
  hasOverflow: boolean; cartCount: number;
  importError: string | null;
  onChangeDirection: (d: Direction) => void;
  onChangeNumSegments: (n: number) => void;
  onAdjustSegment: (idx: number, delta: number) => void;
  onUpdateZone: (id: string, patch: Partial<ZoneConfig>) => void;
  onUpdateDivider: (idx: number, patch: Partial<DividerConfig>) => void;
  onAddToCart: () => void;
  onBulkCsv: () => void;
  onViewCart: () => void;
  onExportLayout: () => void;
  onImportLayout: () => void;
}) {
  const segLabel = direction === "horizontal" ? "Lines of Text" : "Columns";

  return (
    <div className="p-3 space-y-4 pb-4">
      {/* Layout file: export / import */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <FileJson size={10} /> Layout File
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={onExportLayout}
            title="Download this layout as a reusable .json file"
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-card py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
          >
            <Download size={11} /> Export
          </button>
          <button
            onClick={onImportLayout}
            title="Load a previously exported layout .json file"
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-card py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
          >
            <Upload size={11} /> Import
          </button>
        </div>
        {importError && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded bg-red-500/10 border border-red-500/30 px-2 py-1.5 text-[10px] text-red-500 leading-snug">
            <AlertTriangle size={10} className="flex-shrink-0 mt-px" />
            {importError}
          </p>
        )}
      </div>

      <div className="border-t border-border" />

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

      {/* Cart actions */}
      <div className="pt-2 border-t border-border space-y-2">
        {/* Add single */}
        <button
          data-testid="button-add-to-cart"
          onClick={onAddToCart}
          disabled={hasOverflow}
          title={hasOverflow ? "Fix text overflow before adding to cart" : "Add this nameplate to your order"}
          className={`w-full rounded py-2.5 text-sm font-bold transition-all ${
            hasOverflow
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
          }`}>
          {hasOverflow ? "Fix overflow to continue" : "Add to Order"}
        </button>

        {/* Bulk CSV */}
        <button
          data-testid="button-bulk-csv"
          onClick={onBulkCsv}
          className="w-full rounded border border-border bg-background py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
        >
          Bulk Add from CSV
        </button>

        {hasOverflow && (
          <p className="text-center text-[10px] text-red-500 leading-snug">
            One or more zones overflow. Reduce text, lower font size, enable word wrap, or increase zone size.
          </p>
        )}

        {/* Cart summary link */}
        {cartCount > 0 && (
          <button
            onClick={onViewCart}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            View order &mdash; {cartCount} item{cartCount !== 1 ? "s" : ""} &rarr;
          </button>
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
        <svg width="100%" height={10} className="mt-2">
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
  const font         = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
  const letterHeight = approxLetterHeightIn(cfg.fontSize);
  const ov           = overflowInfo;
  const overflows    = ov?.overflows ?? false;
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

        {/* 3×3 alignment grid */}
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Alignment</p>
          <div className="grid grid-cols-3 gap-0.5 w-[82px]">
            {(["top", "center", "bottom"] as const).map((v) =>
              (["left", "center", "right"] as const).map((h) => {
                const active = cfg.vAlign === v && cfg.hAlign === h;
                const title  = `${v === "center" ? "Middle" : v.charAt(0).toUpperCase() + v.slice(1)} ${h.charAt(0).toUpperCase() + h.slice(1)}`;
                return (
                  <button key={`${v}-${h}`}
                    data-testid={`button-align-${v}-${h}-${zone.id}`}
                    title={title}
                    onClick={() => onUpdate({ vAlign: v, hAlign: h })}
                    className={`flex h-[26px] w-[26px] items-center justify-center rounded border transition-all ${
                      active ? "border-primary bg-primary" : "border-border bg-background hover:border-primary"
                    }`}>
                    <AlignDot vAlign={v} hAlign={h} active={active} />
                  </button>
                );
              })
            )}
          </div>
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

function AlignDot({ vAlign, hAlign, active }: {
  vAlign: "top" | "center" | "bottom";
  hAlign: "left" | "center" | "right";
  active: boolean;
}) {
  const cx = hAlign === "left" ? 4 : hAlign === "center" ? 8 : 12;
  const cy = vAlign === "top"  ? 4 : vAlign === "center" ? 8 : 12;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx={cx} cy={cy} r={2.2}
        fill={active ? "rgba(255,255,255,0.9)" : "currentColor"}
        className={active ? "" : "text-muted-foreground"} />
    </svg>
  );
}
