import crypto from "node:crypto";

export type WorkflowSettings = Record<string, unknown>;

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: "sandbox";
  apiBaseUrl: string;
}

export interface VerifiedPayPalPayment {
  orderId: string;
  captureId: string;
  status: "COMPLETED";
  payerId: string | null;
  payerEmail: string | null;
  currencyCode: string | null;
  amount: string | null;
  capturedAt: string | null;
}

function readConfiguredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

async function readPayPalJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function parseCapture(order: Record<string, unknown>) {
  const purchaseUnits = Array.isArray(order.purchase_units) ? order.purchase_units as Array<Record<string, unknown>> : [];
  for (const unit of purchaseUnits) {
    const payments = asRecord(unit.payments);
    const captures = Array.isArray(payments.captures) ? payments.captures as Array<Record<string, unknown>> : [];
    for (const capture of captures) {
      if (typeof capture.id === "string" && capture.status === "COMPLETED") {
        const amount = asRecord(capture.amount);
        return {
          captureId: capture.id,
          status: "COMPLETED" as const,
          currencyCode: typeof amount.currency_code === "string" ? amount.currency_code : null,
          amount: typeof amount.value === "string" ? amount.value : null,
          capturedAt: typeof capture.create_time === "string" ? capture.create_time : null,
        };
      }
    }
  }

  return null;
}

function parseVerifiedPayment(order: Record<string, unknown>, expectedCaptureId?: string): VerifiedPayPalPayment | null {
  if (typeof order.id !== "string") {
    return null;
  }

  const capture = parseCapture(order);
  if (!capture) {
    return null;
  }
  if (expectedCaptureId && capture.captureId !== expectedCaptureId) {
    return null;
  }

  const payer = asRecord(order.payer);
  return {
    orderId: order.id,
    captureId: capture.captureId,
    status: capture.status,
    payerId: typeof payer.payer_id === "string" ? payer.payer_id : null,
    payerEmail: typeof payer.email_address === "string" ? payer.email_address : null,
    currencyCode: capture.currencyCode,
    amount: capture.amount,
    capturedAt: capture.capturedAt,
  };
}

export function getPayPalConfig(settings: WorkflowSettings): PayPalConfig | null {
  const configuredClientId = readConfiguredString(settings.sandboxPayPalClientId);
  const configuredSecret = readConfiguredString(settings.sandboxPayPalSecret);
  const clientId = configuredClientId || readConfiguredString(process.env.PAYPAL_SANDBOX_CLIENT_ID) || readConfiguredString(process.env.PAYPAL_CLIENT_ID);
  const clientSecret = configuredSecret || readConfiguredString(process.env.PAYPAL_SANDBOX_CLIENT_SECRET) || readConfiguredString(process.env.PAYPAL_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    environment: "sandbox",
    apiBaseUrl: "https://api-m.sandbox.paypal.com",
  };
}

export function getPublicPayPalSettings(settings: WorkflowSettings) {
  const config = getPayPalConfig(settings);
  return {
    sandboxPayPalClientId: config?.clientId ?? "",
    payPalEnvironment: config?.environment ?? "",
  };
}

async function getAccessToken(config: PayPalConfig) {
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await readPayPalJson<Record<string, unknown>>(response);
    throw new Error(`PayPal auth failed with ${response.status}: ${JSON.stringify(errorBody)}`);
  }

  const payload = await readPayPalJson<Record<string, unknown>>(response);
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("PayPal auth response did not include an access token");
  }

  return payload.access_token;
}

async function paypalApiFetch<T>(config: PayPalConfig, path: string, init?: RequestInit) {
  const accessToken = await getAccessToken(config);
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await readPayPalJson<Record<string, unknown>>(response);
    throw new Error(`PayPal API ${path} failed with ${response.status}: ${JSON.stringify(errorBody)}`);
  }

  return readPayPalJson<T>(response);
}

export async function createPayPalOrder(args: {
  config: PayPalConfig;
  amount: number;
  description: string;
  requestId?: string;
}) {
  const payload = await paypalApiFetch<Record<string, unknown>>(args.config, "/v2/checkout/orders", {
    method: "POST",
    headers: args.requestId ? { "PayPal-Request-Id": args.requestId } : undefined,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: args.description,
          amount: {
            currency_code: "USD",
            value: args.amount.toFixed(2),
          },
        },
      ],
    }),
  });

  if (typeof payload.id !== "string" || !payload.id) {
    throw new Error("PayPal create order response did not include an order id");
  }

  return {
    orderId: payload.id,
    status: typeof payload.status === "string" ? payload.status : null,
  };
}

export async function capturePayPalOrder(args: {
  config: PayPalConfig;
  orderId: string;
  requestId?: string;
}) {
  const payload = await paypalApiFetch<Record<string, unknown>>(args.config, `/v2/checkout/orders/${encodeURIComponent(args.orderId)}/capture`, {
    method: "POST",
    headers: args.requestId ? { "PayPal-Request-Id": args.requestId } : undefined,
    body: JSON.stringify({}),
  });

  const payment = parseVerifiedPayment(payload);
  if (!payment) {
    throw new Error("PayPal capture response did not include a completed capture");
  }

  return payment;
}

export async function verifyPayPalOrder(args: {
  config: PayPalConfig;
  orderId: string;
  captureId: string;
}) {
  const payload = await paypalApiFetch<Record<string, unknown>>(args.config, `/v2/checkout/orders/${encodeURIComponent(args.orderId)}`, {
    method: "GET",
  });
  return parseVerifiedPayment(payload, args.captureId);
}

export function makePayPalRequestId(prefix: string, value: string) {
  const digest = crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
  return `nx-${prefix}-${digest}`;
}
