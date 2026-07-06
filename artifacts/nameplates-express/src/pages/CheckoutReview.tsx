import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MapPin, User, ShoppingCart, AlertTriangle, Receipt } from "lucide-react";
import PlateFinalPreview from "@/components/PlateFinalPreview";
import { computeHZones, computeVZones, type CartItem } from "@/lib/plate-utils";
import { useAdmin } from "@/context/AdminContext";
import { getColorHex, getColorLabel, resolvePrice } from "@/lib/admin-store";
import type { GuestInfo } from "./CheckoutGuest";

interface Props {
  cart: CartItem[];
  guestInfo: GuestInfo;
  onBack: () => void;
  onPaid: (payment: { paypalOrderId: string; paypalCaptureId: string }) => Promise<void>;
}

function cartTextSummary(item: CartItem): string {
  const zones = item.direction === "horizontal"
    ? computeHZones(item.heights)
    : computeVZones(item.widths);
  return zones.map((zone) => item.lineConfigs[zone.id]?.text).filter(Boolean).join(" · ") || "(no text)";
}

function AddrLines({ lines }: { lines: (string | undefined)[] }) {
  return (
    <div className="space-y-0.5 text-sm leading-relaxed text-slate-300">
      {lines.filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}
    </div>
  );
}

function buildCartSummary(cart: CartItem[], sizes: ReturnType<typeof useAdmin>["sizes"]) {
  const counts = new Map<string, number>();
  for (const item of cart) {
    counts.set(item.size.id, (counts.get(item.size.id) ?? 0) + 1);
  }

  const itemPrices = cart.map((item) => {
    const size = sizes.find((entry) => entry.id === item.size.id);
    const qty = counts.get(item.size.id) ?? 1;
    const unitPrice = size ? resolvePrice(size, qty) : 0;
    return {
      itemId: item.id,
      unitPrice,
    };
  });

  const subtotal = itemPrices.reduce((sum, item) => sum + item.unitPrice, 0);
  return {
    itemPrices: new Map(itemPrices.map((item) => [item.itemId, item.unitPrice] as const)),
    subtotal,
  };
}

async function loadPayPalSdk(clientId: string) {
  const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="true"]');
  const expectedSrc = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;

  if (existing?.dataset.src === expectedSrc && window.paypal) {
    return;
  }

  if (existing) {
    existing.remove();
    delete window.paypal;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = expectedSrc;
    script.async = true;
    script.dataset.paypalSdk = "true";
    script.dataset.src = expectedSrc;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the PayPal SDK"));
    document.head.appendChild(script);
  });
}

export default function CheckoutReview({ cart, guestInfo, onBack, onPaid }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const { sizes, workflowSettings } = useAdmin();
  const payPalClientId = String(workflowSettings.sandboxPayPalClientId ?? "").trim();
  const paypalButtonRef = useRef<HTMLDivElement | null>(null);

  const pricing = useMemo(() => buildCartSummary(cart, sizes), [cart, sizes]);
  const anyPriced = cart.some((item) => sizes.find((entry) => entry.id === item.size.id));

  useEffect(() => {
    let cancelled = false;

    async function setupPayPal() {
      if (!payPalClientId || !paypalButtonRef.current) {
        setSdkReady(false);
        return;
      }

      setError(null);
      setSdkReady(false);

      try {
        await loadPayPalSdk(payPalClientId);
        if (cancelled || !paypalButtonRef.current || !window.paypal) {
          return;
        }

        paypalButtonRef.current.innerHTML = "";
        await window.paypal.Buttons({
          style: {
            color: "gold",
            shape: "rect",
            layout: "vertical",
            label: "paypal",
          },
          createOrder: async () => {
            setBusy(true);
            setError(null);

            const response = await fetch("/api/paypal/orders", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ cart }),
            });
            const data = await response.json() as { orderId?: unknown; error?: unknown };
            if (!response.ok || typeof data.orderId !== "string") {
              throw new Error(typeof data.error === "string" ? data.error : "Unable to create the PayPal order");
            }
            return data.orderId;
          },
          onApprove: async (data) => {
            try {
              setBusy(true);
              setError(null);

              const response = await fetch(`/api/paypal/orders/${encodeURIComponent(data.orderID)}/capture`, {
                method: "POST",
                headers: { "content-type": "application/json" },
              });
              const capture = await response.json() as {
                orderId?: unknown;
                captureId?: unknown;
                error?: unknown;
              };
              if (!response.ok || typeof capture.orderId !== "string" || typeof capture.captureId !== "string") {
                throw new Error(typeof capture.error === "string" ? capture.error : "Unable to capture the PayPal payment");
              }

              await onPaid({
                paypalOrderId: capture.orderId,
                paypalCaptureId: capture.captureId,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : "PayPal capture failed");
              setBusy(false);
            }
          },
          onCancel: () => {
            setBusy(false);
            setError("PayPal checkout was canceled before payment was completed.");
          },
          onError: (err) => {
            setBusy(false);
            setError(err instanceof Error ? err.message : "PayPal checkout failed");
          },
        }).render(paypalButtonRef.current);

        if (!cancelled) {
          setSdkReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize PayPal checkout");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void setupPayPal();
    return () => {
      cancelled = true;
    };
  }, [cart, payPalClientId, onPaid]);

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
      <header className="flex flex-shrink-0 items-center gap-4 border-b border-slate-800 bg-[hsl(220_20%_9%)] px-6 py-4">
        <button
          onClick={onBack}
          disabled={busy}
          className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-40"
        >
          <ArrowLeft size={16} /> Back to Contact Info
        </button>
        <div className="flex-1" />
        <h1 className="text-base font-semibold">Review &amp; Pay</h1>
        <div className="flex-1" />
        <span className="text-xs text-slate-500">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart size={13} className="text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Order Items ({cart.length})
              </h2>
            </div>
            <div className="space-y-3">
              {cart.map((item, index) => {
                const zones = item.direction === "horizontal"
                  ? computeHZones(item.heights)
                  : computeVZones(item.widths);
                const sizeColors = (item.size as { colors?: { id: string; label: string; hex: string; enabled: boolean }[] }).colors;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded border border-slate-700 bg-slate-800/60 p-3"
                  >
                    <div className="w-32 shrink-0 overflow-hidden rounded bg-slate-900">
                      <PlateFinalPreview
                        uid={`rv-${item.id}`}
                        size={item.size}
                        zones={zones}
                        lineConfigs={item.lineConfigs}
                        dividers={item.dividers}
                        direction={item.direction}
                        colorId={item.color}
                        colorHex={getColorHex(item.color, sizeColors)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-xs text-slate-500">Item {index + 1}</p>
                      <p className="truncate text-sm font-semibold text-slate-200">{cartTextSummary(item)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.size.label} · {item.direction} · {zones.length} zone{zones.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {anyPriced && (
            <section className="rounded border border-slate-700 bg-slate-800/40 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt size={13} className="text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Order Summary</h2>
              </div>
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const sizeColors = (item.size as { colors?: { id: string; label: string; hex: string; enabled: boolean }[] }).colors;
                  const price = pricing.itemPrices.get(item.id) ?? 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        Item {index + 1} - {item.size.label}
                        {item.color && item.color !== "black" && (
                          <span className="ml-1 text-slate-500">· {getColorLabel(item.color, sizeColors)}</span>
                        )}
                      </span>
                      <span className="font-medium text-slate-200">${price.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="mt-2 flex items-center justify-between border-t border-slate-700 pt-2">
                  <span className="text-sm font-semibold text-slate-300">Order Total</span>
                  <span className="text-base font-bold text-slate-100">${pricing.subtotal.toFixed(2)}</span>
                </div>
              </div>
              {cart.length >= 10 && (
                <p className="mt-2 text-xs text-blue-400">Quantity pricing has been applied where configured for this size.</p>
              )}
              <p className="mt-1 text-xs text-slate-500">The PayPal checkout amount is generated from your current configured website pricing.</p>
            </section>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded border border-slate-700 bg-slate-800/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPin size={12} className="text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Shipping To</h3>
              </div>
              <AddrLines lines={shippingLines} />
            </div>
            <div className="rounded border border-slate-700 bg-slate-800/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <User size={12} className="text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Billing</h3>
              </div>
              {guestInfo.billingSameAsShipping
                ? <p className="text-sm text-slate-400">Same as shipping address</p>
                : (
                  <AddrLines
                    lines={[
                      guestInfo.billingAddress1 + (guestInfo.billingAddress2 ? `, ${guestInfo.billingAddress2}` : ""),
                      `${guestInfo.billingCity}, ${guestInfo.billingState} ${guestInfo.billingZip}`,
                      guestInfo.billingCountry,
                    ]}
                  />
                )}
            </div>
          </section>

          {guestInfo.notes && (
            <div className="rounded border border-slate-700 bg-slate-800/60 px-4 py-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Order Notes</p>
              <p className="text-sm text-slate-300">{guestInfo.notes}</p>
            </div>
          )}

          <section className="rounded border border-[#0070ba]/50 bg-[#001c38] p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl font-black leading-none" style={{ color: "#009CDE", fontFamily: "Arial Black, Arial, sans-serif" }}>Pay</span>
              <span className="text-xl font-black leading-none" style={{ color: "#003087", fontFamily: "Arial Black, Arial, sans-serif" }}>Pal</span>
              <span className="ml-1 text-xs font-normal text-slate-400">Secure Checkout</span>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-slate-300">
              Your order for <strong className="text-slate-200">{cart.length} nameplate{cart.length !== 1 ? "s" : ""}</strong>
              {" "}will be captured immediately through PayPal and then handed to our operations workflow for review and fulfillment.
            </p>

            <div className="mb-4 flex items-start gap-2 rounded border border-amber-700/50 bg-amber-900/20 px-3 py-2.5 text-xs text-amber-300">
              <AlertTriangle size={13} className="mt-px flex-shrink-0 text-amber-400" />
              <span>
                <strong>Sandbox mode:</strong> this checkout uses your configured PayPal sandbox credentials. Test payments stay in PayPal sandbox and do not charge a live account.
              </span>
            </div>

            {!payPalClientId && (
              <div className="mb-4 rounded border border-rose-700/50 bg-rose-900/20 px-3 py-2.5 text-xs text-rose-300">
                PayPal checkout is not available yet because no sandbox client ID is configured in the admin workflow settings.
              </div>
            )}

            {error && (
              <div className="mb-4 rounded border border-rose-700/50 bg-rose-900/20 px-3 py-2.5 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div
              ref={paypalButtonRef}
              className={`min-h-12 rounded ${busy ? "pointer-events-none opacity-70" : ""}`}
            />

            {payPalClientId && !sdkReady && (
              <p className="mt-3 text-center text-xs text-slate-500">
                Loading PayPal checkout...
              </p>
            )}

            <p className="mt-3 text-center text-xs text-slate-500">
              PayPal is the only payment method accepted at checkout.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
