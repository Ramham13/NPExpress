import { Link } from "wouter";
import { ArrowRight, CheckCircle, Layers, Clock, Shield, Tag, Lock } from "lucide-react";
import { products } from "@/data/products";

function ProductCard({ product }: { product: typeof products[0] }) {
  return (
    <Link href={`/products/${product.id}`} data-testid={`card-product-${product.id}`}>
      <div className="group relative flex h-full flex-col rounded border border-border bg-card p-5 shadow-sm transition-all hover:border-primary hover:shadow-md cursor-pointer">
        {product.logoReady && (
          <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Logo Ready
          </span>
        )}
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
          <Tag size={24} className="text-primary" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
        <p className="mb-3 flex-1 text-xs text-muted-foreground">{product.description}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{product.sizes.length} sizes available</span>
          <span className="font-semibold text-foreground">From ${product.startingPrice.toFixed(2)}/ea</span>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
          Configure <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const steps = [
    { num: "01", title: "Choose Template", desc: "Select from our catalog of standard anodized aluminum nameplate templates." },
    { num: "02", title: "Configure Options", desc: "Pick your size, confirm black anodized aluminum, set quantity. Logo-ready templates accept your logo upload." },
    { num: "03", title: "Checkout or Request Invoice", desc: "Review your cart and either complete PayPal sandbox checkout or submit for invoice and PO follow-up within 1 business day." },
  ];

  const features = [
    { icon: <Shield size={18} />, label: "Industrial Grade", desc: "Type II anodized aluminum, durable for harsh environments." },
    { icon: <Clock size={18} />, label: "Fast Turnaround", desc: "Standard production in 5-7 business days." },
    { icon: <Layers size={18} />, label: "Predefined Sizes", desc: "Standard sizes ready to order - no custom sizing needed for most applications." },
    { icon: <CheckCircle size={18} />, label: "Compliance Ready", desc: "Suitable for OSHA, NEC, and equipment labeling standards." },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-[hsl(220_25%_12%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Anodized Aluminum &bull; Standard Templates &bull; Black
            </div>
            <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Industrial Nameplates,<br />
              <span className="text-primary">Ready to Order.</span>
            </h1>
            <p className="mb-8 max-w-xl text-lg text-slate-300 leading-relaxed">
              Professional anodized aluminum nameplates for equipment, panels, valves, and safety applications. Choose a template, configure, and submit your quote - no custom sizing complexity, just fast and precise.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products" data-testid="button-hero-browse">
                <span className="inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                  Browse Templates <ArrowRight size={16} />
                </span>
              </Link>
              <Link href="/cart" data-testid="button-hero-quote">
                <span className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-500 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-300 hover:text-white">
                  View Quote Cart
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features bar */}
      <section className="border-b border-border bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 text-primary">{f.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Standard Templates</p>
            <h2 className="text-2xl font-bold text-foreground">Choose a Nameplate Type</h2>
          </div>
          <Link href="/products" data-testid="link-view-all-products">
            <span className="flex cursor-pointer items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight size={14} />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-border bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Simple Process</p>
            <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="flex flex-col items-start">
                <span className="mb-3 font-mono text-4xl font-black text-primary/20">{step.num}</span>
                <h3 className="mb-2 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon - Custom Orders */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Future Roadmap</p>
          <h2 className="text-2xl font-bold text-foreground">Custom Orders</h2>
        </div>
        <div className="rounded border border-dashed border-border bg-muted/50 p-8 opacity-70">
          <div className="flex items-start gap-5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-border bg-card">
              <Lock size={20} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">Custom Orders - Coming Soon</h3>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Coming Soon
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                Upload DXF files for custom cut nameplate shapes and artwork. Choose material thickness and color.
                Material: Anodized Aluminum only. Colors and availability should follow the current catalog configuration.
                Similar workflow to SendCutSend - upload your DXF, upload artwork, configure, and order.
              </p>
              <button
                data-testid="button-notify-me"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground"
                disabled
              >
                Notify Me When Available
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Payment notice */}
      <section className="border-t border-border bg-amber-50 dark:bg-amber-950/20">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-amber-800 dark:text-amber-400">
            <strong>Payment info:</strong> PayPal sandbox checkout is available during testing.
            Industrial customers may still submit orders for PO/invoice handling, and our team will follow up with a formal quote.
          </p>
        </div>
      </section>
    </div>
  );
}
