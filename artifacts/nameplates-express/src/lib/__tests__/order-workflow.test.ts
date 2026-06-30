import { describe, expect, it } from "vitest";
import { buildFinalOrderPayload, checksumPayload, makeOrderId } from "../../../../api-server/src/lib/orders";

describe("order workflow helpers", () => {
  it("builds a stable final order payload", () => {
    const payload = buildFinalOrderPayload({
      orderId: "NX-2026-ABC123",
      paymentMethod: "paypal",
      customer: { name: "Jane Smith", email: "jane@example.com" },
      cart: [{ id: "1", size: "6x2" }],
      proofReferences: [{ label: "Proof 1", url: "/api/orders/NX-2026-ABC123/proof.svg?item=1" }],
      paid: true,
    });

    expect(payload.orderId).toBe("NX-2026-ABC123");
    expect(payload.orderState).toBe("paid");
    expect(payload.payment.status).toBe("paid");
    expect(payload.proofReferences).toHaveLength(1);
    expect(payload.proofReferences[0]?.url).toContain("/proof.svg");
  });

  it("produces the same checksum for the same payload", () => {
    const payload = { orderId: "NX-1", state: "paid" };
    expect(checksumPayload(payload)).toBe(checksumPayload(payload));
  });

  it("generates an order id with the expected prefix", () => {
    expect(makeOrderId()).toMatch(/^NX-\d{4}-[A-F0-9]{6}$/);
  });
});
