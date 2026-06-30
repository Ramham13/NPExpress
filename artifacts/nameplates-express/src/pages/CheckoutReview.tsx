/**
 * Order review + PayPal payment step (PayPal checkout path).
 * Shows cart items with plate previews, shipping/billing summary, and a
 * PayPal button.  In production this initiates the PayPal SDK flow; for now
 * it simulates a successful payment after a short delay.
 */
import { useState } from "react";
import { ArrowLeft, MapPin, User, ShoppingCart, AlertTriangle } from "lucide-react";
import PlateFinalPreview from "@/components/PlateFinalPreview";
import { computeHZones, computeVZones, type CartItem } from "@/lib/plate-utils";
import type { GuestInfo } from "./CheckoutGuest";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  cart: CartItem[];
  guestInfo: GuestInfo;
  onBack: () => void;
  onPaid: () => void;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function cartTextSummary(item: CartItem): string {
  const zones = item.direction === "horizontal"
    ? computeHZones(item.heights)
    : computeVZones(item.widths);
  return zones.map(z => item.lineConfigs[z.id]?.text).filter(Boolean).join(" · ") || "(no text)";
}

function AddrLines({ lines }: { lines: (string | undefined)[] }) {
  return (
    <div className="text-sm text-slate-300 leading-relaxed space-y-0.5">
      {lines.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutReview({ cart, guestInfo, onBack, onPaid }: Props) {
  const [busy, setBusy] = useState(false);

  function handlePayPal() {
    setBusy(true);
    // In production: initiate PayPal JS SDK order creation + approval flow.
    // For now, simulate a 2-second "redirect and return" cycle.
    setTimeout(() => { setBusy(false); onPaid(); }, 2000);
  }

  const shippingLines = [
    guestInfo.name,
    guestInfo.company || undefined,
    guestInfo.address1 + (guestInfo.address2 ? `, ${guestInfo.address2}` : ""),
    `${guestInfo.city}, ${guestInfo.state} ${guestInfo.zip}`,
    guestInfo.country,
    guestInfo.email,
    guestInfo.phone || undefined,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220_20%_6%)] text-slate-200">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-[hsl(220_20%_9%)] flex-shrink-0">
        <button onClick={onBack} disabled={busy}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40">
          <ArrowLeft size={16} /> Back to Contact Info
        </button>
        <div className="flex-1" />
        <h1 className="text-base font-semibold">Review &amp; Pay</h1>
        <div className="flex-1" />
        <span className="text-xs text-slate-500">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">

          {/* ── Cart items ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart size={13} className="text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Order Items ({cart.length})
              </h2>
            </div>
            <div className="space-y-3">
              {cart.map((item, idx) => {
                const zones = item.direction === "horizontal"
                  ? computeHZones(item.heights)
                  : computeVZones(item.widths);
                return (
                  <div key={item.id}
                    className="flex items-center gap-4 rounded border border-slate-700 bg-slate-800/60 p-3">
                    <div className="w-32 shrink-0 rounded overflow-hidden bg-slate-900">
                      <PlateFinalPreview
                        uid={`rv-${item.id}`}
                        size={item.size} zones={zones}
                        lineConfigs={item.lineConfigs} dividers={item.dividers}
                        direction={item.direction} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-0.5">Item {idx + 1}</p>
                      <p className="text-sm font-semibold text-slate-200 truncate">{cartTextSummary(item)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.size.label} · {item.direction} · {zones.length} zone{zones.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Shipping / billing ── */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded border border-slate-700 bg-slate-800/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={12} className="text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Shipping To</h3>
              </div>
              <AddrLines lines={shippingLines} />
            </div>
            <div className="rounded border border-slate-700 bg-slate-800/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={12} className="text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Billing</h3>
              </div>
              {guestInfo.billingSameAsShipping
                ? <p className="text-sm text-slate-400">Same as shipping address</p>
                : <AddrLines lines={[
                    guestInfo.billingAddress1 + (guestInfo.billingAddress2 ? `, ${guestInfo.billingAddress2}` : ""),
                    `${guestInfo.billingCity}, ${guestInfo.billingState} ${guestInfo.billingZip}`,
                    guestInfo.billingCountry,
                  ]} />
              }
            </div>
          </section>

          {guestInfo.notes && (
            <div className="rounded border border-slate-700 bg-slate-800/60 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Order Notes</p>
              <p className="text-sm text-slate-300">{guestInfo.notes}</p>
            </div>
          )}

          {/* ── PayPal payment section ── */}
          <section className="rounded border border-[#0070ba]/50 bg-[#001c38] p-6">
            {/* PayPal wordmark */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl font-black leading-none" style={{ color: "#009CDE", fontFamily: "Arial Black, Arial, sans-serif" }}>Pay</span>
              <span className="text-xl font-black leading-none" style={{ color: "#003087", fontFamily: "Arial Black, Arial, sans-serif" }}>Pal</span>
              <span className="ml-1 text-xs text-slate-400 font-normal">Secure Checkout</span>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Your order for{" "}
              <strong className="text-slate-200">{cart.length} nameplate{cart.length !== 1 ? "s" : ""}</strong>{" "}
              will be sent to our team for review. We will confirm final pricing and send a PayPal payment
              request to <strong className="text-slate-200">{guestInfo.email}</strong> before any charge is made.
            </p>

            {/* Sandbox notice */}
            <div className="mb-4 flex items-start gap-2 rounded border border-amber-700/50 bg-amber-900/20 px-3 py-2.5 text-xs text-amber-300">
              <AlertTriangle size={13} className="flex-shrink-0 mt-px text-amber-400" />
              <span>
                <strong>Sandbox mode:</strong> PayPal integration is not yet connected to live credentials.
                Clicking below simulates a successful payment for UI testing — no real charge is made.
              </span>
            </div>

            <button
              onClick={handlePayPal}
              disabled={busy}
              className="w-full rounded py-4 text-base font-black transition-all disabled:opacity-70"
              style={{ backgroundColor: busy ? "#e0a800" : "#FFC439", color: "#003087" }}
            >
              {busy ? "Connecting to PayPal…" : "Pay with PayPal"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              PayPal is the only payment method accepted at checkout.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
