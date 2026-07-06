import { Link } from "wouter";
import { ArrowRight, Tag } from "lucide-react";
import { products } from "@/data/products";

export default function Products() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-2">
        <Link href="/">
          <span className="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">Home</span>
        </Link>
        <span className="mx-2 text-xs text-muted-foreground">/</span>
        <span className="text-xs text-foreground font-medium">Products</span>
      </div>

      <div className="mb-8 mt-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Standard Catalog</p>
        <h1 className="text-3xl font-black text-foreground">Anodized Aluminum Nameplates</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          All nameplates are produced on Type II anodized aluminum in black. Select a template below to configure size, quantity, and add to your quote.
        </p>
      </div>

      <div className="mb-6 rounded border border-border bg-muted px-4 py-3 text-sm text-muted-foreground flex items-center gap-3">
        <span className="inline-block h-2 w-2 rounded-full bg-primary flex-shrink-0" />
        <span>
          <strong className="text-foreground">Material:</strong> Anodized Aluminum &bull;
          <strong className="text-foreground ml-2">Color:</strong> Color availability follows the current catalog configuration &bull;
          <strong className="text-foreground ml-2">Payment:</strong> Quote request or PayPal sandbox checkout during testing
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link key={product.id} href={`/products/${product.id}`} data-testid={`card-product-${product.id}`}>
            <div className="group flex h-full flex-col rounded border border-border bg-card p-6 shadow-sm transition-all hover:border-primary hover:shadow-md cursor-pointer">
              {product.logoReady && (
                <div className="mb-3">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Logo Upload Available
                  </span>
                </div>
              )}

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                <Tag size={28} className="text-primary" />
              </div>

              <h2 className="mb-1.5 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {product.name}
              </h2>
              <p className="mb-4 flex-1 text-xs text-muted-foreground leading-relaxed">{product.description}</p>

              <div className="mb-4 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((size) => (
                    <span
                      key={size}
                      className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {size}"
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-foreground">
                  From ${product.startingPrice.toFixed(2)}/ea
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                  Configure <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded border border-dashed border-border bg-muted/40 p-6 text-center">
        <p className="text-sm font-semibold text-foreground mb-1">Need a custom shape or artwork?</p>
        <p className="text-xs text-muted-foreground">
          Custom DXF-based orders are on our roadmap. Check back soon for upload-based custom nameplate ordering.
        </p>
      </div>
    </div>
  );
}
