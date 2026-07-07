import { describe, expect, it } from "vitest";
import { resolveFinalizeOrderResult } from "@/lib/finalize-order";

describe("resolveFinalizeOrderResult", () => {
  it("treats n8n_sent responses as successful handoffs", () => {
    expect(resolveFinalizeOrderResult(202, {
      orderId: "NX-2026-AAA111",
      state: "n8n_sent",
      attemptNumber: 1,
    })).toEqual({
      orderId: "NX-2026-AAA111",
      handoffState: "sent",
    });
  });

  it("treats n8n_failed responses with an order id as saved orders needing attention", () => {
    expect(resolveFinalizeOrderResult(200, {
      orderId: "NX-2026-BBB222",
      state: "n8n_failed",
      queued: false,
    })).toEqual({
      orderId: "NX-2026-BBB222",
      handoffState: "failed",
    });
  });

  it("preserves saved-order outcomes even when the API status is not ok", () => {
    expect(resolveFinalizeOrderResult(500, {
      orderId: "NX-2026-CCC333",
      state: "n8n_failed",
      error: "n8n shared secret is not configured",
    })).toEqual({
      orderId: "NX-2026-CCC333",
      handoffState: "failed",
    });
  });

  it("throws a user-facing error when the order was not persisted", () => {
    expect(() => resolveFinalizeOrderResult(409, {
      error: "Unable to verify a completed PayPal capture for this order",
    })).toThrow("Unable to verify a completed PayPal capture for this order");
  });
});
