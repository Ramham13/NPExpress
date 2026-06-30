import { describe, expect, it } from "vitest";
import { allowedTransitions, isTransitionAllowed } from "../../../../api-server/src/routes/orders";

describe("order state transitions", () => {
  it("allows the required n8n-controlled progression", () => {
    expect(isTransitionAllowed("submitted", "approved")).toBe(true);
    expect(isTransitionAllowed("approved", "paid")).toBe(true);
    expect(isTransitionAllowed("paid", "ready")).toBe(true);
    expect(isTransitionAllowed("ready", "shipped")).toBe(true);
    expect(isTransitionAllowed("shipped", "delivered")).toBe(true);
  });

  it("rejects backward transitions", () => {
    expect(isTransitionAllowed("delivered", "paid")).toBe(false);
    expect(isTransitionAllowed("n8n_confirmed", "draft")).toBe(false);
  });

  it("documents the transition map", () => {
    expect(allowedTransitions.submitted).toContain("approved");
    expect(allowedTransitions.n8n_failed).toContain("queued_for_n8n");
  });
});
