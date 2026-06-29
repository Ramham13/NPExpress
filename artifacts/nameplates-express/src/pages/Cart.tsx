import { Link, useLocation } from "wouter";
import { Trash2, ArrowRight, AlertCircle, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function Cart() {
  const { items, removeItem, updateQuantity, cartTotal } = useCart();
  const [, setLocation] = useLocation();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-5 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingCart size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Your Quote Cart is Empty</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Browse our catalog and add nameplate templates to your quote request.
          </p>
          <Link href="/products" data-testid="button-browse-products-empty">
            <span className="inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              Browse Products <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/"><span className="hover:text-primary cursor-pointer">Home</span></Link>
        <span>/</span>
        <span className="text-foreground font-medium">Quote Cart</span>
      </div>

      <h1 className="mb-2 text-2xl font-black text-foreground">Quote Review</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Review your selections below before submitting a quote request.
      </p>

      {/* Payment notice banner */}
      <div className="mb-6 flex items-start gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <strong>No payment is collected at this step.</strong> This is a quote request.
          Online payment via PayPal is coming soon. Industrial customers may submit for PO/invoice handling — our team will follow up.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`cart-item-${item.id}`}
              className="rounded border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{item.templateName}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Size: </span>
                      <span className="font-mono font-semibold text-foreground">{item.size}"</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Color: </span>
                      <span className="font-semibold text-foreground">{item.color}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit price: </span>
                      <span className="font-semibold text-foreground">${item.unitPrice.toFixed(2)}/ea</span>
                    </div>
                    {item.logoUploaded !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Logo: </span>
                        <span className={`font-semibold ${item.logoUploaded ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {item.logoUploaded ? `Uploaded (${item.logoFit ?? "scale"})` : "No logo"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  data-testid={`button-remove-item-${item.id}`}
                  onClick={() => removeItem(item.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-0 rounded border border-border overflow-hidden">
                  <button
                    data-testid={`button-qty-minus-${item.id}`}
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="flex h-8 w-8 items-center justify-center bg-card text-foreground hover:bg-muted transition-colors font-bold"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="flex h-8 w-12 items-center justify-center border-x border-border bg-card text-center text-sm font-semibold text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    data-testid={`button-qty-plus-${item.id}`}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center bg-card text-foreground hover:bg-muted transition-colors font-bold"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm font-bold text-foreground">
                  ${item.totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          <Link href="/products" data-testid="link-continue-shopping">
            <span className="inline-flex cursor-pointer items-center gap-1 text-sm text-primary hover:underline">
              + Add more items
            </span>
          </Link>
        </div>

        {/* Summary */}
        <div>
          <div className="rounded border border-border bg-card p-5 shadow-sm sticky top-24">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Order Summary
            </h2>

            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground truncate pr-2 text-xs">
                    {item.templateName} &times; {item.quantity}
                  </span>
                  <span className="font-semibold text-foreground flex-shrink-0">
                    ${item.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-border" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Estimated Total</span>
              <span className="text-lg font-black text-foreground">${cartTotal.toFixed(2)}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Final pricing confirmed upon quote review. Shipping calculated separately.
            </p>

            <button
              data-testid="button-proceed-to-checkout"
              onClick={() => setLocation("/checkout")}
              className="mt-5 w-full rounded bg-primary px-6 py-3.5 text-sm font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Submit Quote Request <ArrowRight size={16} />
            </button>

            <div className="mt-4 rounded bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Payment Options (Coming Soon)</p>
              <p>PayPal checkout will be available after testing. Industrial customers: submit for PO/invoice handling.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
