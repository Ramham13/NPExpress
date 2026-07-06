import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";

const checkoutSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  company: z.string().min(1, "Company name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  paymentPreference: z.enum(["paypal", "po"], {
    required_error: "Please select a payment preference",
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, cartTotal, clearCart, setCustomerData } = useCart();
  const [, setLocation] = useLocation();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      notes: "",
      paymentPreference: "paypal",
    },
  });

  const paymentPref = form.watch("paymentPreference");

  function onSubmit(values: CheckoutFormValues) {
    setCustomerData(values);
    clearCart();
    setLocation("/confirmation");
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-muted-foreground mb-4">Your cart is empty.</p>
        <Link href="/products">
          <span className="text-primary cursor-pointer hover:underline">Browse Products</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/"><span className="hover:text-primary cursor-pointer">Home</span></Link>
        <span>/</span>
        <Link href="/cart"><span className="hover:text-primary cursor-pointer">Quote Cart</span></Link>
        <span>/</span>
        <span className="text-foreground font-medium">Submit Request</span>
      </div>

      <h1 className="mb-2 text-2xl font-black text-foreground">Submit Quote Request</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Complete your information below. No payment is collected — we will follow up with a formal quote.
      </p>

      <div className="flex items-start gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 mb-8 dark:border-amber-700 dark:bg-amber-950/30">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>No payment required.</strong> This is a quote request only. PayPal sandbox checkout is available during testing.
          Industrial accounts may select PO/invoice below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  data-testid="input-name"
                  {...form.register("name")}
                  placeholder="Jane Smith"
                  className="w-full rounded border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Company Name <span className="text-destructive">*</span>
                </label>
                <input
                  data-testid="input-company"
                  {...form.register("company")}
                  placeholder="Acme Manufacturing Co."
                  className="w-full rounded border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {form.formState.errors.company && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.company.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  data-testid="input-email"
                  type="email"
                  {...form.register("email")}
                  placeholder="jane@company.com"
                  className="w-full rounded border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  data-testid="input-phone"
                  type="tel"
                  {...form.register("phone")}
                  placeholder="(555) 000-0000"
                  className="w-full rounded border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                data-testid="input-notes"
                {...form.register("notes")}
                rows={4}
                placeholder="Volume discount inquiry, delivery requirements, specific compliance standards, etc."
                className="w-full rounded border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Payment preference */}
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Preference <span className="text-destructive">*</span>
              </label>
              <div className="space-y-3">
                <label
                  data-testid="radio-payment-paypal"
                  className={`flex cursor-pointer items-start gap-3 rounded border p-4 transition-all ${
                    paymentPref === "paypal"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    value="paypal"
                    {...form.register("paymentPreference")}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pay via PayPal (sandbox testing)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Use the current sandbox checkout for testing, or choose PO/invoice if your account requires terms-based follow-up.
                    </p>
                  </div>
                </label>

                <label
                  data-testid="radio-payment-po"
                  className={`flex cursor-pointer items-start gap-3 rounded border p-4 transition-all ${
                    paymentPref === "po"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    value="po"
                    {...form.register("paymentPreference")}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Submit for PO / Invoice (Industrial Accounts)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Our team will contact you with a formal quote and PO instructions for net-30 or other terms.
                    </p>
                  </div>
                </label>
              </div>
              {form.formState.errors.paymentPreference && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.paymentPreference.message}</p>
              )}

              {paymentPref === "po" && (
                <div className="mt-2 rounded border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                  Our team will contact you with a quote and PO instructions. Standard net-30 terms available for established accounts.
                </div>
              )}
            </div>

            <button
              type="submit"
              data-testid="button-submit-quote"
              className="w-full rounded bg-primary px-6 py-3.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
              Submit Quote Request
            </button>

            <p className="text-center text-xs text-muted-foreground">
              By submitting, you agree that this is a quote request only and no charge is made.
            </p>
          </form>
        </div>

        {/* Order summary sidebar */}
        <div>
          <div className="rounded border border-border bg-card p-5 shadow-sm sticky top-24">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Quote
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-xs leading-tight">{item.templateName}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.size}" &bull; {item.color} &bull; Qty {item.quantity}
                      </p>
                      {item.logoUploaded && (
                        <p className="text-xs text-primary">Logo uploaded ({item.logoFit})</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 font-semibold text-foreground text-xs">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="my-3 border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-lg font-black text-foreground">${cartTotal.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Estimate only. Shipping calculated separately.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
