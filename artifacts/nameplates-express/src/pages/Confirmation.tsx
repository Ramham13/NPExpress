import { Link } from "wouter";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function Confirmation() {
  const { customerData } = useCart();

  const name = customerData?.name ?? "Customer";
  const email = customerData?.email ?? "your email";
  const isPO = customerData?.paymentPreference === "po";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
          <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
        </div>
        <h1 className="mb-3 text-3xl font-black text-foreground">Quote Request Received!</h1>
        <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
          Thank you, <strong className="text-foreground">{name}</strong>. We've received your quote request and will follow up at{" "}
          <strong className="text-foreground">{email}</strong> within 1 business day.
        </p>
      </div>

      {/* Details card */}
      <div className="mb-8 rounded border border-border bg-card p-6 shadow-sm text-sm">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Submission Details
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {customerData?.name && (
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-semibold text-foreground">{customerData.name}</p>
            </div>
          )}
          {customerData?.company && (
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="font-semibold text-foreground">{customerData.company}</p>
            </div>
          )}
          {customerData?.email && (
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-semibold text-foreground">{customerData.email}</p>
            </div>
          )}
          {customerData?.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-semibold text-foreground">{customerData.phone}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Payment Preference</p>
            <p className="font-semibold text-foreground">
              {isPO ? "PO / Invoice (Industrial Account)" : "PayPal (sandbox testing)"}
            </p>
          </div>
        </div>

        {customerData?.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-1">Order Notes</p>
            <p className="text-sm text-foreground">{customerData.notes}</p>
          </div>
        )}
      </div>

      {/* What's next */}
      <div className="mb-8 rounded border border-border bg-muted/40 p-5 text-sm">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">What Happens Next</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-mono font-bold text-primary flex-shrink-0">01</span>
            <span>Our team reviews your quote request (within 1 business day).</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono font-bold text-primary flex-shrink-0">02</span>
            <span>
              {isPO
                ? "We send a formal quote with PO instructions and payment terms."
                : "We confirm pricing and follow up with the current payment workflow or invoice details."}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono font-bold text-primary flex-shrink-0">03</span>
            <span>Upon payment confirmation, your nameplates go into production (5-7 business days).</span>
          </li>
        </ol>
      </div>

      {/* PayPal note */}
      <div className="mb-8 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
        <p className="text-amber-800 dark:text-amber-300">
          <strong>PayPal sandbox testing:</strong> the current testing workflow supports sandbox checkout, while invoice and PO follow-up remain available for terms-based orders.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/products" data-testid="button-start-new-order">
          <span className="inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-8 py-3.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">
            Start a New Order <ArrowRight size={16} />
          </span>
        </Link>
        <p className="text-xs text-muted-foreground">
          Questions? Contact us at <strong>info@nameplatesexpress.com</strong>
        </p>
      </div>
    </div>
  );
}
