/**
 * Cart / order list view.
 * Shows all cart items with plate thumbnails, text summary, size info.
 * Single items and CSV batches are displayed uniformly.
 */
import { Trash2, ArrowLeft, ShoppingCart, Package } from "lucide-react";
import PlateFinalPreview from "@/components/PlateFinalPreview";
import {
  computeHZones, computeVZones, type CartItem,
} from "@/lib/plate-utils";

interface Props {
  cart: CartItem[];
  onBack: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
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

export default function CartView({ cart, onBack, onRemove, onClearAll }: Props) {
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
                      onRemove={() => onRemove(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 border-t border-slate-800 bg-[hsl(220_20%_9%)] px-6 py-4 flex items-center gap-4">
          <span className="text-sm text-slate-400">
            <span className="font-semibold text-slate-200">{cart.length}</span> nameplate{cart.length !== 1 ? "s" : ""} ready to order
          </span>
          <div className="flex-1" />
          <button
            onClick={onBack}
            className="px-4 py-2 rounded text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Add More
          </button>
          <button
            className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-colors"
            title="Checkout is not yet implemented"
          >
            Place Order →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Row component ─────────────────────────────────────────────────────────────
function CartRow({ item, label, onRemove }: { item: CartItem; label: string; onRemove: () => void }) {
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
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-200 truncate">{textSummary(item)}</p>
        <p className="text-xs text-slate-500 mt-1">
          {item.size.label} · {item.direction} · {zones.length} zone{zones.length !== 1 ? "s" : ""}
        </p>
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
