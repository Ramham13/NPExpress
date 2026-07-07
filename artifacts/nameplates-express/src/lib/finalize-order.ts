export type FinalizeHandoffState = "sent" | "failed";

export interface FinalizeOrderResult {
  orderId: string;
  handoffState: FinalizeHandoffState;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getBodyField(body: unknown, key: "error" | "orderId" | "state") {
  if (!isObject(body)) return undefined;
  return body[key];
}

export function resolveFinalizeOrderResult(status: number, body: unknown): FinalizeOrderResult {
  const orderId = getBodyField(body, "orderId");
  const state = getBodyField(body, "state");
  const error = getBodyField(body, "error");

  const hasOrderId = typeof orderId === "string" && orderId.trim().length > 0;
  const hasState = typeof state === "string" && state.trim().length > 0;

  if (hasOrderId && hasState) {
    return {
      orderId,
      handoffState: state === "n8n_failed" ? "failed" : "sent",
    };
  }

  if (typeof error === "string" && error.trim()) {
    throw new Error(error);
  }

  throw new Error(`Order finalize failed: ${status}`);
}
