/**
 * Order confirmation screen — shown after the PayPal payment step completes.
 * Displays an order reference number, summary of what's next, and item thumbnails.
 */
import { CheckCircle, ArrowRight, Package } from "lucide-react";
import PlateFinalPreview from "@/components/PlateFinalPreview";
import { computeHZones, computeVZones, type CartItem } from "@/lib/plate-utils";
import { getColorHex } from "@/lib/admin-store";
import { useAdmin } from "@/context/AdminContext";
import { resolveSupportEmail } from "@/lib/support-email";
import type { GuestInfo } from "./CheckoutGuest";

interface Props {
  orderNumber: string;
  guestInfo: GuestInfo;
  cart: CartItem[];
  handoffState: "idle" | "sending" | "sent" | "failed";
  onNewOrder: () => void;
}

function handoffMessage(handoffState: Props["handoffState"]) {
  if (handoffState === "sent") {
    return {
      tone: "muted",
      text: "The order has been handed off to fulfillment.",
    } as const;
  }
  if (handoffState === "failed") {
    return {
      tone: "warning",
      text: "Your order was saved, but the fulfillment handoff needs manual attention. We can still recover it from the order system.",
    } as const;
  }
  return {
    tone: "muted",
    text: "Final handoff is processing.",
  } as const;
}

export default function CheckoutDone({ orderNumber, guestInfo, cart, handoffState, onNewOrder }: Props) {
  const { workflowSettings } = useAdmin();
  const shipTo = [guestInfo.city, guestInfo.state].filter(Boolean).join(", ");
  const handoff = handoffMessage(handoffState);
  const supportEmail = resolveSupportEmail(workflowSettings.supportEmail);

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220_20%_6%)] text-slate-200">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">

          {/* Hero */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-900/50 border border-green-700">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-100 mb-2">Order Submitted!</h1>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Thank you, <strong className="text-slate-200">{guestInfo.name}</strong>.
              A Nameplates Express team member will review your order and contact you at{" "}
              <strong className="text-slate-200">{guestInfo.email}</strong> if any proof or fulfillment follow-up is needed.
            </p>
            <p className={`mt-3 text-xs ${handoff.tone === "warning" ? "text-amber-400" : "text-slate-500"}`}>
              {handoff.text}
            </p>
          </div>

          {/* Order reference */}
          <div className="rounded border border-slate-700 bg-slate-800/60 px-5 py-4 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Order Reference</p>
            <p className="text-2xl font-black tracking-widest text-blue-400">{orderNumber}</p>
            <p className="mt-1 text-xs text-slate-500">Save this number for your records</p>
          </div>

          {/* Next steps */}
          <div className="rounded border border-slate-700 bg-slate-800/60 p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">What Happens Next</h3>
            <ol className="space-y-3">
              {[
                "Our team reviews your paid order and validates the production details (within 1 business day).",
                `We email ${guestInfo.email} if we need any proof or shipping clarification before production.`,
                "Your nameplates move into production after review and payment confirmation are complete.",
                shipTo ? `Your order ships to ${shipTo}.` : "Your order ships to your address on file.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="font-mono font-bold text-blue-400 flex-shrink-0 w-5">0{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Items summary */}
          <div className="rounded border border-slate-700 bg-slate-800/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package size={13} className="text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Your Items ({cart.length})
              </h3>
            </div>
            <div className="space-y-3">
              {cart.map((item, idx) => {
                const zones = item.direction === "horizontal"
                  ? computeHZones(item.heights)
                  : computeVZones(item.widths);
                const sizeColors = (item.size as { colors?: { id: string; label: string; hex: string; enabled: boolean }[] }).colors;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 rounded overflow-hidden bg-slate-900">
                      <PlateFinalPreview
                        uid={`done-${item.id}`} size={item.size} zones={zones}
                        lineConfigs={item.lineConfigs} dividers={item.dividers}
                        direction={item.direction}
                        colorId={item.color}
                        colorHex={getColorHex(item.color, sizeColors)}
                      />
                    </div>
                    <div className="text-sm">
                      <p className="text-slate-500 text-xs">Item {idx + 1}</p>
                      <p className="text-slate-200 font-semibold">{item.size.label}</p>
                      <p className="text-slate-500 text-xs">{item.direction} · {zones.length} zone{zones.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button onClick={onNewOrder}
              className="inline-flex items-center gap-2 rounded bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-sm font-bold text-white transition-colors">
              Design Another Nameplate <ArrowRight size={16} />
            </button>
            <p className="text-xs text-slate-500">
              Questions? Email{" "}
              <strong className="text-slate-400">{supportEmail}</strong>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
