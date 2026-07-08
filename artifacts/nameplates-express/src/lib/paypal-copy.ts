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
