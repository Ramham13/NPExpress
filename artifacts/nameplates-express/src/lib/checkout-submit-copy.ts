export function getCustomerFacingCheckoutSubmitErrorMessage(error: unknown, mode: "paypal" | "quote"): string {
  const message = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : "";

  if (
    message === "n8n shared secret is not configured"
    || message === "Failed to finalize order"
    || message.startsWith("Order finalize failed:")
  ) {
    return mode === "quote"
      ? "We couldn't submit your quote request right now. Please try again in a moment."
      : "We couldn't continue checkout right now. Please try again in a moment.";
  }

  if (message.trim()) {
    return message;
  }

  return mode === "quote"
    ? "We couldn't submit your quote request right now. Please try again."
    : "We couldn't continue checkout right now. Please try again.";
}
