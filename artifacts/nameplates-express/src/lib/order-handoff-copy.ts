export type CustomerHandoffState = "idle" | "sending" | "sent" | "failed";

export function getCheckoutHandoffMessage(handoffState: CustomerHandoffState) {
  if (handoffState === "sent") {
    return {
      tone: "muted",
      text: "Your order has been received and passed to our fulfillment workflow.",
    } as const;
  }
  if (handoffState === "failed") {
    return {
      tone: "warning",
      text: "Your order has been received. If any follow-up is needed while we finish processing it, our team will contact you.",
    } as const;
  }
  return {
    tone: "muted",
    text: "Your order is finishing its final processing step.",
  } as const;
}

export function getQuoteHandoffMessage(handoffState: CustomerHandoffState) {
  if (handoffState === "sent") {
    return {
      tone: "muted",
      text: "Your request has been received and passed to our quoting workflow.",
    } as const;
  }
  if (handoffState === "failed") {
    return {
      tone: "warning",
      text: "Your request has been received. If any follow-up is needed while we finish processing it, our team will contact you.",
    } as const;
  }
  return {
    tone: "muted",
    text: "Your request is finishing its final processing step.",
  } as const;
}
