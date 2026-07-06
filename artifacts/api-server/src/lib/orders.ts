import crypto from "node:crypto";

export type OrderPaymentMethod = "paypal" | "invoice";
export type OrderState =
  | "draft"
  | "submitted"
  | "paid"
  | "invoiced"
  | "queued_for_n8n"
  | "n8n_sent"
  | "n8n_confirmed"
  | "n8n_failed";

export interface FinalOrderPayload {
  orderId: string;
  orderState: OrderState;
  paymentMethod: OrderPaymentMethod;
  customer: Record<string, unknown>;
  cart: Array<Record<string, unknown>>;
  proofReferences: { label: string; url: string }[];
  pricing: {
    currencyCode: string;
    subtotal: number;
  };
  payment: {
    provider: "paypal" | "invoice";
    status: "paid" | "pending";
    paypalOrderId?: string;
    paypalCaptureId?: string;
    payerId?: string | null;
    payerEmail?: string | null;
    currencyCode?: string | null;
    amount?: string | null;
    capturedAt?: string | null;
  };
  createdAt: string;
}

export function makeOrderId() {
  return `NX-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function checksumPayload(payload: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildFinalOrderPayload(args: {
  orderId: string;
  paymentMethod: OrderPaymentMethod;
  customer: Record<string, unknown>;
  cart: Array<Record<string, unknown>>;
  proofReferences: { label: string; url: string }[];
  paid: boolean;
  pricing: {
    currencyCode: string;
    subtotal: number;
  };
  paymentMetadata?: {
    paypalOrderId: string;
    paypalCaptureId: string;
    payerId: string | null;
    payerEmail: string | null;
    currencyCode: string | null;
    amount: string | null;
    capturedAt: string | null;
  };
}): FinalOrderPayload {
  return {
    orderId: args.orderId,
    orderState: args.paid ? "paid" : "invoiced",
    paymentMethod: args.paymentMethod,
    customer: args.customer,
    cart: args.cart,
    proofReferences: args.proofReferences,
    pricing: args.pricing,
    payment: {
      provider: args.paymentMethod,
      status: args.paid ? "paid" : "pending",
      ...args.paymentMetadata,
    },
    createdAt: new Date().toISOString(),
  };
}
