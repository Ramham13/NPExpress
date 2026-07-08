/**
 * Shared guest info form — used by both the PayPal checkout path and the
 * Quote / Invoice request path.  Collects contact info, shipping address,
 * optional billing address, and path-specific extras (PO number, tax-exempt).
 */
import { useState } from "react";
import { ArrowLeft, User, MapPin, FileText, CreditCard } from "lucide-react";
import type { CartItem } from "@/lib/plate-utils";
import { getCustomerFacingCheckoutSubmitErrorMessage } from "@/lib/checkout-submit-copy";

// ─── Shared GuestInfo type (imported by sibling checkout pages) ───────────────

export interface GuestInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
  // Shipping
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  // Billing
  billingSameAsShipping: boolean;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  // Common
  notes: string;
  // Quote-only
  poNumber: string;
  taxExemptNote: string;
}

export function blankGuestInfo(): GuestInfo {
  return {
    name: "", company: "", email: "", phone: "",
    address1: "", address2: "", city: "", state: "", zip: "", country: "US",
    billingSameAsShipping: true,
    billingAddress1: "", billingAddress2: "", billingCity: "", billingState: "", billingZip: "", billingCountry: "US",
    notes: "", poNumber: "", taxExemptNote: "",
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  cart: CartItem[];
  mode: "paypal" | "quote";
  initialInfo: GuestInfo;
  onBack: () => void;
  onSubmit: (info: GuestInfo) => void | Promise<void>;
}

// ─── Reusable input primitives ────────────────────────────────────────────────

const IC = "w-full rounded border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
        {required
          ? <span className="ml-1 text-red-400">*</span>
          : <span className="ml-1 text-slate-600 normal-case font-normal tracking-normal">(optional)</span>
        }
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={IC} value={value} onChange={e => onChange(e.target.value)}>
      <option value="US">United States</option>
      <option value="CA">Canada</option>
      <option value="MX">Mexico</option>
      <option value="GB">United Kingdom</option>
      <option value="AU">Australia</option>
      <option value="DE">Germany</option>
      <option value="FR">France</option>
      <option value="JP">Japan</option>
      <option value="OTHER">Other</option>
    </select>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutGuest({ cart, mode, initialInfo, onBack, onSubmit }: Props) {
  const [info, setInfo] = useState<GuestInfo>(initialInfo);
  const [errors, setErrors] = useState<Partial<Record<keyof GuestInfo, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof GuestInfo>(key: K, value: GuestInfo[K]) {
    setInfo(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof GuestInfo, string>> = {};
    if (!info.name.trim())    e.name    = "Full name is required";
    if (!info.email.trim())   e.email   = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) e.email = "Enter a valid email address";
    if (!info.address1.trim()) e.address1 = "Street address is required";
    if (!info.city.trim())    e.city    = "City is required";
    if (!info.state.trim())   e.state   = "State / province is required";
    if (!info.zip.trim())     e.zip     = "ZIP / postal code is required";
    if (!info.billingSameAsShipping) {
      if (!info.billingAddress1.trim()) e.billingAddress1 = "Billing street address is required";
      if (!info.billingCity.trim())     e.billingCity     = "Billing city is required";
      if (!info.billingState.trim())    e.billingState    = "Billing state / province is required";
      if (!info.billingZip.trim())      e.billingZip      = "Billing ZIP is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(info);
    } catch (err) {
      setSubmitError(getCustomerFacingCheckoutSubmitErrorMessage(err, mode));
    } finally {
      setSubmitting(false);
    }
  }

  const isPaypal   = mode === "paypal";
  const title      = isPaypal ? "Guest Checkout" : "Submit Quote / Request Invoice";
  const submitButtonLabel = submitting
    ? (isPaypal ? "Preparing Order Review..." : "Submitting Quote Request...")
    : (isPaypal ? "Continue to Order Review ->" : "Submit Quote Request ->");
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220_20%_6%)] text-slate-200">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-[hsl(220_20%_9%)] flex-shrink-0">
        <button onClick={onBack} disabled={submitting}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40">
          <ArrowLeft size={16} /> Back to Order
        </button>
        <div className="flex-1" />
        <h1 className="text-base font-semibold">{title}</h1>
        <div className="flex-1" />
        {/* Cart count badge */}
        <span className="text-xs text-slate-500">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">

          {/* Guest badge */}
          <div className="mb-8 flex items-center gap-3 rounded border border-slate-700 bg-slate-800/60 px-4 py-3">
            <User size={16} className="text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-200">Checking out as guest</p>
              <p className="text-xs text-slate-400 mt-0.5">No account required. Your information is only used to process this order.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-10">

            {/* ── Contact ── */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <User size={13} className="text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Contact Information</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full Name" required error={errors.name}>
                  <input className={IC} value={info.name} onChange={e => set("name", e.target.value)} placeholder="Jane Smith" autoComplete="name" />
                </Field>
                <Field label="Company" error={errors.company}>
                  <input className={IC} value={info.company} onChange={e => set("company", e.target.value)} placeholder="Acme Manufacturing" autoComplete="organization" />
                </Field>
                <Field label="Email" required error={errors.email}>
                  <input type="email" className={IC} value={info.email} onChange={e => set("email", e.target.value)} placeholder="jane@company.com" autoComplete="email" />
                </Field>
                <Field label="Phone" error={errors.phone}>
                  <input type="tel" className={IC} value={info.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 000-0000" autoComplete="tel" />
                </Field>
              </div>
            </section>

            {/* ── Shipping ── */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <MapPin size={13} className="text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Shipping Address</h2>
              </div>
              <div className="space-y-4">
                <Field label="Street Address" required error={errors.address1}>
                  <input className={IC} value={info.address1} onChange={e => set("address1", e.target.value)} placeholder="123 Main St" autoComplete="address-line1" />
                </Field>
                <Field label="Apt / Suite / Unit" error={errors.address2}>
                  <input className={IC} value={info.address2} onChange={e => set("address2", e.target.value)} placeholder="Suite 200" autoComplete="address-line2" />
                </Field>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label="City" required error={errors.city}>
                    <input className={IC} value={info.city} onChange={e => set("city", e.target.value)} placeholder="Springfield" autoComplete="address-level2" />
                  </Field>
                  <Field label="State / Province" required error={errors.state}>
                    <input className={IC} value={info.state} onChange={e => set("state", e.target.value)} placeholder="IL" autoComplete="address-level1" />
                  </Field>
                  <Field label="ZIP / Postal" required error={errors.zip}>
                    <input className={IC} value={info.zip} onChange={e => set("zip", e.target.value)} placeholder="62701" autoComplete="postal-code" />
                  </Field>
                </div>
                <Field label="Country">
                  <CountrySelect value={info.country} onChange={v => set("country", v)} />
                </Field>
              </div>
            </section>

            {/* ── Billing ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={13} className="text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Billing Address</h2>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer mb-5">
                <input type="checkbox" checked={info.billingSameAsShipping}
                  onChange={e => set("billingSameAsShipping", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 accent-blue-500 cursor-pointer" />
                <span className="text-sm text-slate-300">Same as shipping address</span>
              </label>
              {!info.billingSameAsShipping && (
                <div className="space-y-4">
                  <Field label="Street Address" required error={errors.billingAddress1}>
                    <input className={IC} value={info.billingAddress1} onChange={e => set("billingAddress1", e.target.value)} placeholder="456 Corporate Blvd" />
                  </Field>
                  <Field label="Apt / Suite / Unit" error={errors.billingAddress2}>
                    <input className={IC} value={info.billingAddress2} onChange={e => set("billingAddress2", e.target.value)} placeholder="Suite 200" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field label="City" required error={errors.billingCity}>
                      <input className={IC} value={info.billingCity} onChange={e => set("billingCity", e.target.value)} placeholder="Chicago" />
                    </Field>
                    <Field label="State / Province" required error={errors.billingState}>
                      <input className={IC} value={info.billingState} onChange={e => set("billingState", e.target.value)} placeholder="IL" />
                    </Field>
                    <Field label="ZIP / Postal" required error={errors.billingZip}>
                      <input className={IC} value={info.billingZip} onChange={e => set("billingZip", e.target.value)} placeholder="60601" />
                    </Field>
                  </div>
                  <Field label="Country">
                    <CountrySelect value={info.billingCountry} onChange={v => set("billingCountry", v)} />
                  </Field>
                </div>
              )}
            </section>

            {/* ── Quote-only fields ── */}
            {!isPaypal && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <FileText size={13} className="text-blue-400" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Quote / Invoice Details</h2>
                </div>
                <div className="space-y-4">
                  <Field label="PO Number" error={errors.poNumber}>
                    <input className={IC} value={info.poNumber} onChange={e => set("poNumber", e.target.value)} placeholder="PO-2024-0042" />
                  </Field>
                  <Field label="Tax-Exempt / Resale Certificate Note" error={errors.taxExemptNote}>
                    <textarea className={`${IC} resize-none`} rows={2} value={info.taxExemptNote}
                      onChange={e => set("taxExemptNote", e.target.value)}
                      placeholder="If tax-exempt, enter your certificate number or state here" />
                  </Field>
                </div>
              </section>
            )}

            {/* ── Notes ── */}
            <Field label="Order Notes / Special Instructions" error={errors.notes}>
              <textarea className={`${IC} resize-none`} rows={3} value={info.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Delivery requirements, urgency, compliance standards, or any other instructions" />
            </Field>

            {submitError && (
              <div className="rounded border border-rose-700/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
                {submitError}
              </div>
            )}

            {/* ── Submit ── */}
            <div className="pt-2 space-y-3">
              <button type="submit" disabled={submitting}
                className="w-full rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-70 py-3.5 text-sm font-bold text-white transition-colors">
                {submitButtonLabel}
              </button>
              <p className="text-center text-xs text-slate-500">
                {isPaypal
                  ? "You will review your full order before any payment is taken."
                  : "No payment is required now. We will follow up with your formal quote or invoice."}
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
