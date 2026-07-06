import { useState, useRef } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowRight, Upload, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";

type LogoFit = "crop" | "scale" | "stretch";

const COLORS = [
  { id: "black", label: "Black Anodized Aluminum", available: true },
  { id: "red", label: "Red Anodized Aluminum", available: false },
  { id: "blue", label: "Blue Anodized Aluminum", available: false },
  { id: "yellow", label: "Yellow Anodized Aluminum", available: false },
  { id: "green", label: "Green Anodized Aluminum", available: false },
];

function PlatePreview({
  product,
  size,
  logoUploaded,
  logoFit,
}: {
  product: typeof products[0];
  size: string;
  logoUploaded: boolean;
  logoFit: LogoFit;
}) {
  const [w, h] = size.split("x").map(Number);
  const aspectRatio = w && h ? h / w : 0.4;
  const isLogoReady = product.logoReady;
  const isPremium = product.id === "logo-premium";
  const isValve = product.id === "valve-tag";
  const isControl = product.id === "control-panel";
  const isWarning = product.id === "warning-safety";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-md">
        <div
          className="relative mx-auto w-full rounded overflow-hidden shadow-2xl"
          style={{
            aspectRatio: isValve ? "1 / 1" : `${1 / aspectRatio}`,
            background: "linear-gradient(145deg, hsl(220 20% 18%), hsl(220 15% 10%), hsl(220 20% 15%))",
            border: "3px solid hsl(220 20% 30%)",
          }}
        >
          <div className="absolute inset-0 flex flex-col gap-2 p-4">
            {/* Equipment tag layout */}
            {!isLogoReady && !isControl && !isWarning && !isValve && (
              <>
                <ZoneBox label="EQUIPMENT NAME / DESCRIPTION" flex={3} />
                <ZoneBox label="SERIAL NO. / PART NO." flex={2} />
              </>
            )}

            {/* Valve tag layout */}
            {isValve && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <ZoneBox label="TAG NO." flex={2} fullWidth />
                <ZoneBox label="DESCRIPTION" flex={1} fullWidth />
              </div>
            )}

            {/* Control panel layout */}
            {isControl && (
              <div className="flex gap-2 h-full">
                <ZoneBox label="ICON" flex={1} />
                <div className="flex flex-col gap-2 flex-[2]">
                  <ZoneBox label="LABEL" flex={1} />
                  <ZoneBox label="CIRCUIT / FUNCTION" flex={1} />
                </div>
              </div>
            )}

            {/* Warning layout */}
            {isWarning && (
              <>
                <div
                  className="rounded flex items-center justify-center text-[10px] font-black uppercase tracking-widest"
                  style={{
                    flex: 1,
                    border: "1.5px dashed hsl(24 95% 53% / 0.6)",
                    color: "hsl(24 95% 65%)",
                    background: "hsl(24 95% 53% / 0.08)",
                  }}
                >
                  WARNING / CAUTION HEADER
                </div>
                <ZoneBox label="HAZARD DESCRIPTION AND SAFETY INSTRUCTIONS" flex={3} />
              </>
            )}

            {/* Logo-ready standard: left logo, right text */}
            {isLogoReady && !isPremium && (
              <div className="flex gap-2 h-full">
                <LogoZone logoUploaded={logoUploaded} logoFit={logoFit} flex={2} />
                <div className="flex flex-col gap-2 flex-[3]">
                  <ZoneBox label="COMPANY / PRODUCT NAME" flex={2} />
                  <ZoneBox label="PART NO. / SERIAL NO." flex={1} />
                </div>
              </div>
            )}

            {/* Logo-ready premium: top logo, bottom text */}
            {isLogoReady && isPremium && (
              <>
                <LogoZone logoUploaded={logoUploaded} logoFit={logoFit} flex={3} />
                <ZoneBox label="PRODUCT / COMPANY TAGLINE" flex={1} />
              </>
            )}
          </div>

          {/* Metallic highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)",
            }}
          />
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-mono text-muted-foreground">
          {size}" &bull; Black Anodized Aluminum &bull; Preview (not to scale)
        </p>
      </div>
    </div>
  );
}

function ZoneBox({
  label,
  flex,
  fullWidth,
}: {
  label: string;
  flex?: number;
  fullWidth?: boolean;
}) {
  return (
    <div
      className="rounded flex items-center justify-center text-center"
      style={{
        flex: flex ?? 1,
        width: fullWidth ? "100%" : undefined,
        border: "1.5px dashed hsl(215 25% 40%)",
        color: "hsl(215 16% 55%)",
        fontSize: "9px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 600,
        padding: "4px",
      }}
    >
      {label}
    </div>
  );
}

function LogoZone({
  logoUploaded,
  logoFit,
  flex,
}: {
  logoUploaded: boolean;
  logoFit: LogoFit;
  flex?: number;
}) {
  const fitStyle: Record<LogoFit, React.CSSProperties> = {
    crop: { objectFit: "none", overflow: "hidden" },
    scale: { objectFit: "contain" } as any,
    stretch: { objectFit: "fill" } as any,
  };

  return (
    <div
      className="rounded flex items-center justify-center relative overflow-hidden"
      style={{
        flex: flex ?? 1,
        border: "1.5px dashed hsl(24 95% 53% / 0.5)",
        background: logoUploaded
          ? "hsl(24 95% 53% / 0.12)"
          : "hsl(215 25% 20% / 0.5)",
      }}
    >
      {logoUploaded ? (
        <div
          className="absolute inset-1 flex items-center justify-center rounded"
          style={{ background: "hsl(24 95% 53% / 0.15)" }}
        >
          <span
            style={{
              fontSize: "8px",
              color: "hsl(24 95% 65%)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {logoFit === "crop" && "LOGO (CROPPED)"}
            {logoFit === "scale" && "LOGO (SCALED TO FIT)"}
            {logoFit === "stretch" && "LOGO (STRETCHED)"}
          </span>
        </div>
      ) : (
        <span
          style={{
            fontSize: "8px",
            color: "hsl(24 95% 53% / 0.7)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textAlign: "center",
            padding: "4px",
          }}
        >
          LOGO AREA
        </span>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const product = products.find((p) => p.id === id);
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState(product?.sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [logoFit, setLogoFit] = useState<LogoFit>("scale");
  const [added, setAdded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Link href="/products"><span className="mt-4 inline-block text-primary cursor-pointer hover:underline">Back to Products</span></Link>
      </div>
    );
  }

  const [w, h] = selectedSize.split("x").map(Number);
  const unitPrice = product.startingPrice + (w * h * 0.15);
  const totalPrice = unitPrice * quantity;

  function handleAddToQuote() {
    addItem({
      productId: product!.id,
      templateName: product!.name,
      size: selectedSize,
      color: "Black Anodized Aluminum",
      quantity,
      logoUploaded: product!.logoReady ? logoUploaded : false,
      logoFit: product!.logoReady ? logoFit : null,
      unitPrice,
      totalPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleFakeUpload() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFileName(file.name);
      setLogoUploaded(true);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/"><span className="hover:text-primary cursor-pointer">Home</span></Link>
        <span>/</span>
        <Link href="/products"><span className="hover:text-primary cursor-pointer">Products</span></Link>
        <span>/</span>
        <span className="text-foreground font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* LEFT: Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded border border-border bg-card p-6 shadow-sm">
            <PlatePreview
              product={product}
              size={selectedSize}
              logoUploaded={logoUploaded}
              logoFit={logoFit}
            />
          </div>
        </div>

        {/* RIGHT: Config */}
        <div>
          {product.logoReady && (
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Logo Upload Available
            </span>
          )}
          <h1 className="mb-1 text-2xl font-black text-foreground">{product.name}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{product.description}</p>

          {/* Size */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Size (inches)
            </label>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  data-testid={`button-size-${size}`}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded border px-4 py-2 font-mono text-sm font-semibold transition-all ${
                    selectedSize === size
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-foreground hover:border-primary"
                  }`}
                >
                  {size}"
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Material / Color
            </label>
            <div className="relative">
              <select
                data-testid="select-color"
                className="w-full appearance-none rounded border border-border bg-card px-3 py-2.5 pr-8 text-sm text-foreground focus:border-primary focus:outline-none"
                value="black"
                onChange={() => {}}
              >
                {COLORS.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.available}>
                    {c.label}{!c.available ? " (not currently enabled)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Additional color availability follows the current catalog configuration.
            </p>
          </div>

          {/* Quantity */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quantity
            </label>
            <div className="flex items-center gap-0 w-fit rounded border border-border overflow-hidden">
              <button
                data-testid="button-qty-minus"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center bg-card text-foreground hover:bg-muted transition-colors font-bold text-lg"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <input
                data-testid="input-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 w-16 border-x border-border bg-card text-center text-sm font-semibold text-foreground focus:outline-none"
              />
              <button
                data-testid="button-qty-plus"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center bg-card text-foreground hover:bg-muted transition-colors font-bold text-lg"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Logo Upload (logo-ready products only) */}
          {product.logoReady && (
            <div className="mb-5 rounded border border-dashed border-primary/40 bg-primary/5 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Logo Upload</p>

              {!logoUploaded ? (
                <>
                  <div
                    className="mb-3 flex flex-col items-center justify-center gap-2 rounded border border-dashed border-border bg-card px-4 py-6 cursor-pointer hover:border-primary transition-colors"
                    onClick={handleFakeUpload}
                    data-testid="dropzone-logo"
                    role="button"
                  >
                    <Upload size={24} className="text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Click to upload your logo</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: SVG, EPS, PDF, or high-resolution PNG/TIFF (min 300 DPI)
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,.eps,.pdf,.png,.tif,.tiff"
                    className="hidden"
                    onChange={handleFileChange}
                    data-testid="input-logo-file"
                  />
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>Files are not processed during this prototype. Upload guidance only.</span>
                  </div>
                </>
              ) : (
                <div className="mb-3 flex items-center gap-3 rounded border border-border bg-card px-4 py-3">
                  <Check size={16} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{logoFileName}</p>
                    <p className="text-xs text-muted-foreground">Logo selected (preview only)</p>
                  </div>
                  <button
                    data-testid="button-remove-logo"
                    onClick={() => { setLogoUploaded(false); setLogoFileName(null); }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Logo fit options */}
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo Fit</p>
                <div className="flex flex-col gap-2">
                  {(["scale", "crop", "stretch"] as LogoFit[]).map((fit) => {
                    const labels: Record<LogoFit, string> = {
                      scale: "Scale to fit (maintain aspect ratio)",
                      crop: "Crop to fit",
                      stretch: "Stretch to fill",
                    };
                    return (
                      <label
                        key={fit}
                        data-testid={`radio-logo-fit-${fit}`}
                        className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground"
                      >
                        <input
                          type="radio"
                          name="logoFit"
                          value={fit}
                          checked={logoFit === fit}
                          onChange={() => setLogoFit(fit)}
                          className="accent-primary"
                        />
                        {labels[fit]}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="mb-5 rounded border border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unit price</span>
              <span className="font-semibold text-foreground">${unitPrice.toFixed(2)}/ea</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Qty {quantity}</span>
              <span className="font-bold text-lg text-foreground">${totalPrice.toFixed(2)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Final pricing confirmed upon quote review. Volume discounts available — note in your request.
            </p>
          </div>

          {/* CTA */}
          <button
            data-testid="button-add-to-quote"
            onClick={handleAddToQuote}
            className={`w-full rounded px-6 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              added
                ? "bg-green-600 text-white cursor-default"
                : "bg-primary text-white hover:opacity-90"
            }`}
          >
            {added ? (
              <><Check size={16} /> Added to Quote Cart</>
            ) : (
              <>Add to Quote Cart <ArrowRight size={16} /></>
            )}
          </button>

          {added && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Item added to your quote.</span>
              <Link href="/cart">
                <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">View Quote Cart →</span>
              </Link>
            </div>
          )}

          <p className="mt-4 text-xs text-center text-muted-foreground">
            No payment collected. This adds the item to your quote request.
          </p>
        </div>
      </div>
    </div>
  );
}
