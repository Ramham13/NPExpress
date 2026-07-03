export const allowedTransitions: Record<string, string[]> = {
  draft: ["submitted", "invoiced"],
  submitted: ["approved", "paid", "ready", "shipped", "delivered", "n8n_confirmed"],
  approved: ["paid", "ready", "shipped", "delivered"],
  paid: ["ready", "shipped", "delivered"],
  ready: ["shipped", "delivered"],
  shipped: ["delivered"],
  invoiced: ["submitted", "paid"],
  queued_for_n8n: ["n8n_sent", "n8n_failed", "n8n_confirmed"],
  n8n_sent: ["n8n_confirmed", "n8n_failed"],
  n8n_confirmed: ["approved", "paid", "ready", "shipped", "delivered"],
  n8n_failed: ["queued_for_n8n"],
};

export function isTransitionAllowed(from: string, to: string) {
  return (allowedTransitions[from] ?? []).includes(to);
}

export function getNextAttemptNumber(previousAttemptNumber?: number | null) {
  return (previousAttemptNumber ?? 0) + 1;
}
