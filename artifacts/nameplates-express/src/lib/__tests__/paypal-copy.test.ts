import { describe, expect, it } from "vitest";
import { getCustomerFacingPayPalErrorMessage, getPayPalTestModeMessage, getPayPalUnavailableMessage } from "../paypal-copy";

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

  it("maps raw PayPal startup failures to customer-safe language", () => {
    expect(getCustomerFacingPayPalErrorMessage("Failed to load the PayPal SDK")).toBe(
      "We couldn't load PayPal checkout right now. Refresh the page and try again.",
    );
    expect(getCustomerFacingPayPalErrorMessage("Unable to create the PayPal order")).toBe(
      "We couldn't start PayPal checkout right now. Please try again in a moment.",
    );
  });

  it("maps raw PayPal capture and verification failures to customer-safe language", () => {
    expect(getCustomerFacingPayPalErrorMessage("Failed to capture PayPal order")).toBe(
      "We couldn't complete the PayPal payment right now. Please try again.",
    );
    expect(getCustomerFacingPayPalErrorMessage("Unable to verify a completed PayPal capture for this order")).toBe(
      "We couldn't confirm the PayPal payment for this order. Please try again, and contact us if the payment already appears in your PayPal account.",
    );
  });
});
