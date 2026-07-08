import { describe, expect, it } from "vitest";
import { getPayPalTestModeMessage, getPayPalUnavailableMessage } from "../paypal-copy";

describe("PayPal customer-facing checkout copy", () => {
  it("shows a clear test-mode message for sandbox environments", () => {
    expect(getPayPalTestModeMessage("sandbox")).toBe(
      "Test mode: PayPal is currently running in a test environment. Payments will not charge a live account.",
    );
  });

  it("hides the test-mode banner outside sandbox environments", () => {
    expect(getPayPalTestModeMessage("")).toBeNull();
    expect(getPayPalTestModeMessage("live")).toBeNull();
  });

  it("avoids internal admin terminology when PayPal credentials are missing", () => {
    expect(getPayPalUnavailableMessage("sandbox")).toBe(
      "PayPal checkout is unavailable because test payment credentials are not configured yet.",
    );
    expect(getPayPalUnavailableMessage("")).toBe(
      "PayPal checkout is unavailable because payment credentials are not configured yet.",
    );
  });
});
