/**
 * Quote / invoice request confirmation screen.
 * Shown after the quote form is submitted.  No payment is taken.
 */
import { CheckCircle, ArrowRight, FileText } from "lucide-react";
import type { GuestInfo } from "./CheckoutGuest";
import type { CartItem } from "@/lib/plate-utils";

interface Props {
  guestInfo: GuestInfo;
  cart: CartItem[];
  handoffState: "idle" | "sending" | "sent" | "failed";
  onNewOrder: () => void;
}

export default function QuoteDone({ guestInfo, cart, handoffState, onNewOrder }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220_20%_6%)] text-slate-200">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">

          {/* Hero */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-900/50 border border-green-700">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-100 mb-2">Quote Request Received!</h1>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Thank you, <strong className="text-slate-200">{guestInfo.name}</strong>.
              We've received your request for{" "}
              <strong className="text-slate-200">{cart.length} nameplate{cart.length !== 1 ? "s" : ""}</strong>{" "}
              and will follow up at{" "}
              <strong className="text-slate-200">{guestInfo.email}</strong> within 1 business day.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {handoffState === "sent" ? "The invoice handoff has been sent to operations." : "Final handoff is processing."}
            </p>
          </div>

          {/* Submission summary */}
          <div className="rounded border border-slate-700 bg-slate-800/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={13} className="text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Submission Summary</h3>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-400">Name</dt>
              <dd className="text-slate-200 font-medium">{guestInfo.name}</dd>
              {guestInfo.company && <>
                <dt className="text-slate-400">Company</dt>
                <dd className="text-slate-200 font-medium">{guestInfo.company}</dd>
              </>}
              <dt className="text-slate-400">Email</dt>
              <dd className="text-slate-200 font-medium">{guestInfo.email}</dd>
              {guestInfo.phone && <>
                <dt className="text-slate-400">Phone</dt>
                <dd className="text-slate-200 font-medium">{guestInfo.phone}</dd>
              </>}
              {guestInfo.city && <>
                <dt className="text-slate-400">Ship to</dt>
                <dd className="text-slate-200 font-medium">{[guestInfo.city, guestInfo.state].filter(Boolean).join(", ")}</dd>
              </>}
              {guestInfo.poNumber && <>
                <dt className="text-slate-400">PO Number</dt>
                <dd className="text-slate-200 font-medium">{guestInfo.poNumber}</dd>
              </>}
              <dt className="text-slate-400">Items</dt>
              <dd className="text-slate-200 font-medium">{cart.length} nameplate{cart.length !== 1 ? "s" : ""}</dd>
            </dl>
            {guestInfo.taxExemptNote && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Tax-Exempt / Resale Note</p>
                <p className="text-sm text-slate-300">{guestInfo.taxExemptNote}</p>
              </div>
            )}
            {guestInfo.notes && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Order Notes</p>
                <p className="text-sm text-slate-300">{guestInfo.notes}</p>
              </div>
            )}
          </div>

          {/* What's next */}
          <div className="rounded border border-slate-700 bg-slate-800/60 p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">What Happens Next</h3>
            <ol className="space-y-3">
              {[
                "Our team reviews your quote request and nameplate designs (within 1 business day).",
                `We send a formal quote or invoice to ${guestInfo.email} with pricing, shipping, and payment instructions.`,
                guestInfo.poNumber
                  ? "Once your PO is confirmed, your nameplates go into production (5–7 business days)."
                  : "Upon payment confirmation, your nameplates go into production (5–7 business days).",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="font-mono font-bold text-blue-400 flex-shrink-0 w-5">0{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button onClick={onNewOrder}
              className="inline-flex items-center gap-2 rounded bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-sm font-bold text-white transition-colors">
              Design Another Nameplate <ArrowRight size={16} />
            </button>
            <p className="text-xs text-slate-500">
              Questions? Email{" "}
              <strong className="text-slate-400">info@nameplatesexpress.com</strong>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
