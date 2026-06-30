/**
 * Cart / order list view.
 * Shows all cart items with plate thumbnails, text summary, size info, and pricing.
 */
import { Trash2, ArrowLeft, ShoppingCart, Package, DollarSign } from "lucide-react";
import PlateFinalPreview from "@/components/PlateFinalPreview";
import { useAdmin } from "@/context/AdminContext";
import {
  computeHZones, computeVZones, type CartItem,
} from "@/lib/plate-utils";
import { DEFAULT_COLOR_PALETTE } from "@/lib/admin-store";

interface Props {
  cart: CartItem[];
  onBack: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onCheckout: () => void;
  onQuote: () => void;
}

function textSummary(item: CartItem): string {
  const zones = item.direction === "horizontal"
    ? computeHZones(item.heights)
    : computeVZones(item.widths);
  return zones
    .map((z) => item.lineConfigs[z.id]?.text)
    .filter(Boolean)
    .join(" · ") || "(no text)";
}

function colorLabel(colorId: string | undefined): string {
  const id = colorId ?? "black";
  return DEFAULT_COLOR_PALETTE.find(c => c.id === id)?.label ?? id;
}

function colorHex(colorId: string | undefined): string {
  const id = colorId ?? "black";
  return DEFAULT_COLOR_PALETTE.find(c => c.id === id)?.hex ?? "#1a2035";
}

export default function CartView({ cart, onBack, onRemove, onClearAll, onCheckout, onQuote }: Props) {
  const { sizes } = useAdmin();

  // Group items by batchId for display
  const batches: Map<string, CartItem[]> = new Map();
  const singles: CartItem[] = [];

  for (const item of cart) {
    if (item.batchId) {
      const existing = batches.get(item.batchId) ?? [];
      batches.set(item.batchId, [...existing, item]);
    } else {
      singles.push(item);
    }
  }

  // Pricing helpers
  function itemPrice(item: CartItem): number | null {
    const as = sizes.find(s => s.id === item.size.id);
    return as ? as.basePrice : null;
  }

  const pricedItems = cart.map(i => itemPrice(i)).filter((p): p is number => p !== null);
  const subtotal    = pricedItems.reduce((s, p) => s + p, 0);
  const anyPriced   = pricedItems.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220_20%_6%)] text-slate-200">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-[hsl(220_20%_9%)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Editor
        </button>
        <div className="flex-1" />
        <h1 className="text-base font-semibold tracking-wide flex items-center gap-2">
          <ShoppingCart size={16} />
          Order ({cart.length} item{cart.length !== 1 ? "s" : ""})
        </h1>
        <div className="flex-1" />
        {cart.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-500">
            <ShoppingCart size={48} strokeWidth={1} />
            <p className="text-lg">No items in your order yet.</p>
            <button
              onClick={onBack}
              className="mt-2 px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              Back to Editor
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl px-6 py-6 space-y-8">
            {/* Single items */}
            {singles.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Individual Nameplates
                </h2>
                <div className="space-y-3">
                  {singles.map((item, idx) => (
                    <CartRow
                      key={item.id}
                      item={item}
                      label={`Item ${idx + 1}`}
                      price={itemPrice(item)}
                      onRemove={() => onRemove(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* CSV batches */}
            {[...batches.entries()].map(([batchId, items], bIdx) => (
              <section key={batchId}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                  <Package size={13} />
                  Batch {bIdx + 1} — {items.length} nameplates from CSV
                </h2>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <CartRow
                      key={item.id}
                      item={item}
                      label={`Batch ${bIdx + 1} · Item ${idx + 1}`}
                      price={itemPrice(item)}
                      onRemove={() => onRemove(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Order subtotal */}
            {anyPriced && (
              <div className="rounded border border-slate-700 bg-[hsl(220_20%_10%)] px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Estimated Subtotal</span>
                  <span className="text-base font-bold text-slate-100">${subtotal.toFixed(2)}</span>
                </div>
                {cart.length >= 10 && (
                  <p className="text-xs text-blue-400 flex items-center gap-1.5">
                    <DollarSign size={11} />
                    Quantity discounts may apply — confirmed at invoice.
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Based on base unit price per size. Final pricing confirmed before any charge.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — two checkout paths */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 border-t border-slate-800 bg-[hsl(220_20%_9%)] px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-slate-400">
              <span className="font-semibold text-slate-200">{cart.length}</span>{" "}
              nameplate{cart.length !== 1 ? "s" : ""} ready to order
            </span>
            {anyPriced && (
              <span className="text-sm font-semibold text-slate-200 ml-1">
                · est. ${subtotal.toFixed(2)}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={onBack}
              className="px-4 py-2 rounded text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Add More
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onCheckout}
              className="flex-1 rounded py-3 text-sm font-bold text-[#003087] transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#FFC439" }}
            >
              Checkout with PayPal
            </button>
            <button
              onClick={onQuote}
              className="flex-1 rounded border border-slate-600 bg-slate-800 hover:border-slate-500 py-3 text-sm font-semibold text-slate-200 transition-all"
            >
              Submit Quote / Request Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row component ─────────────────────────────────────────────────────────────
function CartRow({ item, label, price, onRemove }: {
  item: CartItem; label: string; price: number | null; onRemove: () => void;
}) {
  const zones = item.direction === "horizontal"
    ? computeHZones(item.heights)
    : computeVZones(item.widths);

  return (
    <div className="flex items-center gap-4 rounded-md border border-slate-700 bg-[hsl(220_20%_11%)] p-3">
      {/* Thumbnail */}
      <div className="w-36 shrink-0 bg-[hsl(220_20%_8%)] rounded overflow-hidden">
        <PlateFinalPreview
          uid={`cart-${item.id}`}
          size={item.size}
          zones={zones}
          lineConfigs={item.lineConfigs}
          dividers={item.dividers}
          direction={item.direction}
          colorId={item.color}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-200 truncate">{textSummary(item)}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <p className="text-xs text-slate-500">
            {item.size.label} · {item.direction} · {zones.length} zone{zones.length !== 1 ? "s" : ""}
          </p>
          {/* Color swatch */}
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full border border-slate-600 inline-block"
              style={{ backgroundColor: colorHex(item.color) }} />
            {colorLabel(item.color)}
          </span>
          {/* Price */}
          {price !== null && (
            <span className="text-xs font-semibold text-slate-300">${price.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="shrink-0 p-2 rounded text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-colors"
        title="Remove from order"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
