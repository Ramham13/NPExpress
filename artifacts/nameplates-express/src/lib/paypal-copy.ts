export function getPayPalTestModeMessage(environment: unknown): string | null {
  return environment === "sandbox"
    ? "Test mode: PayPal is currently running in a test environment. Payments will not charge a live account."
    : null;
}

export function getPayPalUnavailableMessage(environment: unknown): string {
  return environment === "sandbox"
    ? "PayPal checkout is unavailable because test payment credentials are not configured yet."
    : "PayPal checkout is unavailable because payment credentials are not configured yet.";
}

export function getCustomerFacingPayPalErrorMessage(error: unknown): string {
  const message = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : "";

  if (!message.trim()) {
    return "We couldn't complete PayPal checkout right now. Please try again.";
  }

  if (message === "Failed to load the PayPal SDK" || message === "Failed to initialize PayPal checkout") {
    return "We couldn't load PayPal checkout right now. Refresh the page and try again.";
  }

  if (
    message === "Failed to create PayPal order"
    || message === "Unable to create the PayPal order"
    || message.includes("PayPal checkout is unavailable")
  ) {
    return "We couldn't start PayPal checkout right now. Please try again in a moment.";
  }

  if (
    message === "Failed to capture PayPal order"
    || message === "Unable to capture the PayPal payment"
    || message === "PayPal capture failed"
    || message === "PayPal checkout failed"
  ) {
    return "We couldn't complete the PayPal payment right now. Please try again.";
  }

  if (
    message === "Unable to verify a completed PayPal capture for this order"
    || message === "Verified PayPal amount does not match the current order total"
  ) {
    return "We couldn't confirm the PayPal payment for this order. Please try again, and contact us if the payment already appears in your PayPal account.";
  }

  return message;
}
