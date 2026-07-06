// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildFinalOrderPayload, checksumPayload, makeOrderId } from "../../../../api-server/src/lib/orders";
import { getNextAttemptNumber } from "../../../../api-server/src/lib/order-state";

describe("order workflow helpers", () => {
  it("builds a stable final order payload", () => {
    const payload = buildFinalOrderPayload({
      orderId: "NX-2026-ABC123",
      paymentMethod: "paypal",
      customer: { name: "Jane Smith", email: "jane@example.com" },
      cart: [{ id: "1", size: "6x2" }],
      proofReferences: [
        { label: "Printable proof document", url: "/api/orders/NX-2026-ABC123/proof.html" },
        { label: "Proof data package", url: "/api/orders/NX-2026-ABC123/proof-package.json" },
      ],
      paid: true,
      pricing: { currencyCode: "USD", subtotal: 5.5 },
      paymentMetadata: {
        paypalOrderId: "PAYPAL-ORDER-1",
        paypalCaptureId: "CAPTURE-123",
        payerId: "PAYER-123",
        payerEmail: "payer@example.com",
        currencyCode: "USD",
        amount: "5.50",
        capturedAt: "2026-07-05T00:00:00Z",
      },
    });

    expect(payload.orderId).toBe("NX-2026-ABC123");
    expect(payload.orderState).toBe("paid");
    expect(payload.payment.status).toBe("paid");
    expect(payload.payment.paypalCaptureId).toBe("CAPTURE-123");
    expect(payload.pricing.subtotal).toBe(5.5);
    expect(payload.proofReferences).toHaveLength(2);
    expect(payload.proofReferences).toEqual([
      { label: "Printable proof document", url: "/api/orders/NX-2026-ABC123/proof.html" },
      { label: "Proof data package", url: "/api/orders/NX-2026-ABC123/proof-package.json" },
    ]);
  });

  it("produces the same checksum for the same payload", () => {
    const payload = { orderId: "NX-1", state: "paid" };
    expect(checksumPayload(payload)).toBe(checksumPayload(payload));
  });

  it("generates an order id with the expected prefix", () => {
    expect(makeOrderId()).toMatch(/^NX-\d{4}-[A-F0-9]{6}$/);
  });

  it("increments delivery attempt numbers monotonically", () => {
    expect(getNextAttemptNumber()).toBe(1);
    expect(getNextAttemptNumber(1)).toBe(2);
    expect(getNextAttemptNumber(4)).toBe(5);
  });
});
