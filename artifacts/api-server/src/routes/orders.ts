import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, adminConfigTable, orderDeliveryAttemptTable, orderTable } from "@workspace/db";
import { buildFinalOrderPayload, checksumPayload, makeOrderId } from "../lib/orders";
import { buildCartPricing } from "../lib/order-pricing";
import { getNextAttemptNumber, isTransitionAllowed } from "../lib/order-state";
import {
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalConfig,
  makePayPalRequestId,
  verifyPayPalOrder,
  type WorkflowSettings,
} from "../lib/paypal";
import { requireAdminAccess } from "../lib/admin-auth";

const router: IRouter = Router();

export const N8N_DELIVERY_TIMEOUT_MS = 10_000;

function getN8nWebhookUrl() {
  return process.env.N8N_ORDERS_WEBHOOK_URL ?? "";
}

function getN8nCallbackSecret() {
  return process.env.N8N_CALLBACK_SECRET ?? "";
}

async function getWorkflowSettings(): Promise<WorkflowSettings> {
  const rows = await db.select().from(adminConfigTable).limit(1);
  return (rows[0]?.workflowSettings ?? {}) as WorkflowSettings;
}

async function getConfiguredSizes() {
  const rows = await db.select().from(adminConfigTable).limit(1);
  return Array.isArray(rows[0]?.sizes) ? rows[0].sizes as Record<string, unknown>[] : [];
}

async function findOrderByPayPalCaptureId(captureId: string) {
  const orders = await db.select().from(orderTable);
  return orders.find((row) => {
    const payload = row.payload as Record<string, unknown>;
    const payment = (payload.payment ?? {}) as Record<string, unknown>;
    return payment.paypalCaptureId === captureId;
  });
}

function getConfiguredWebhookUrl(settings: WorkflowSettings) {
  const configured = typeof settings.n8nOrdersWebhookUrl === "string" ? settings.n8nOrdersWebhookUrl.trim() : "";
  return configured || getN8nWebhookUrl();
}

function isWebhookEnabled(settings: WorkflowSettings) {
  if (typeof settings.webhookEnabled === "boolean") {
    return settings.webhookEnabled;
  }
  return true;
}

function getSharedSecret(settings: WorkflowSettings) {
  const configured = typeof settings.n8nSharedSecret === "string" ? settings.n8nSharedSecret.trim() : "";
  const envSecret = typeof process.env.N8N_SHARED_SECRET === "string" ? process.env.N8N_SHARED_SECRET.trim() : "";
  const legacyFallback = typeof settings.n8nCallbackSecret === "string" ? settings.n8nCallbackSecret.trim() : "";
  return configured || envSecret || legacyFallback;
}

function getCallbackSecret(settings: WorkflowSettings) {
  const configured = typeof settings.n8nCallbackSecret === "string" ? settings.n8nCallbackSecret.trim() : "";
  return configured || getN8nCallbackSecret();
}

function getWebhookToken(orderId: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(orderId).digest("hex");
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildProofReferences(orderId: string) {
  return [
    {
      label: "Printable proof document",
      url: `/api/orders/${orderId}/proof.html`,
    },
    {
      label: "Proof data package",
      url: `/api/orders/${orderId}/proof-package.json`,
    },
  ];
}

function getCartItems(payload: Record<string, unknown>) {
  return Array.isArray(payload.cart) ? payload.cart as Record<string, unknown>[] : [];
}

function getProofPackage(orderId: string, payload: Record<string, unknown>) {
  const customer = (payload.customer ?? {}) as Record<string, unknown>;
  const cart = getCartItems(payload);
  const proofReferences = Array.isArray(payload.proofReferences) ? payload.proofReferences as Array<Record<string, unknown>> : [];
  const payment = (payload.payment ?? {}) as Record<string, unknown>;
  const pricing = (payload.pricing ?? {}) as Record<string, unknown>;

  return {
    schemaVersion: "2026-07-proof-package-v1",
    orderId,
    generatedAt: new Date().toISOString(),
    orderState: String(payload.orderState ?? "unknown"),
    customer: {
      name: customer.name ?? customer.companyName ?? null,
      company: customer.company ?? customer.companyName ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      shippingAddress: {
        address1: customer.address1 ?? null,
        address2: customer.address2 ?? null,
        city: customer.city ?? null,
        state: customer.state ?? null,
        zip: customer.zip ?? null,
        country: customer.country ?? null,
      },
      billingAddress: {
        address1: customer.billingAddress1 ?? null,
        address2: customer.billingAddress2 ?? null,
        city: customer.billingCity ?? null,
        state: customer.billingState ?? null,
        zip: customer.billingZip ?? null,
        country: customer.billingCountry ?? null,
      },
      notes: customer.notes ?? null,
    },
    payment: {
      method: payload.paymentMethod ?? null,
      provider: payment.provider ?? null,
      status: payment.status ?? null,
      paypalOrderId: payment.paypalOrderId ?? null,
      paypalCaptureId: payment.paypalCaptureId ?? null,
      payerId: payment.payerId ?? null,
      payerEmail: payment.payerEmail ?? null,
      capturedAt: payment.capturedAt ?? null,
    },
    pricing: {
      currencyCode: pricing.currencyCode ?? null,
      subtotal: pricing.subtotal ?? null,
    },
    proofAssets: proofReferences.map((reference, index) => ({
      itemNumber: index + 1,
      label: String(reference.label ?? `Proof asset ${index + 1}`),
      url: String(reference.url ?? ""),
    })),
    lineItems: cart.map((item, index) => {
      const size = (item.size ?? {}) as Record<string, unknown>;
      const lineConfigs = (item.lineConfigs ?? {}) as Record<string, Record<string, unknown>>;
      const zoneTexts = Object.entries(lineConfigs).map(([zoneId, config]) => ({
        zoneId,
        text: String(config?.text ?? ""),
        font: config?.font ?? null,
        fontSize: config?.fontSize ?? null,
        bold: Boolean(config?.bold ?? false),
        italic: Boolean(config?.italic ?? false),
      }));

      return {
        itemNumber: index + 1,
        itemId: item.id ?? null,
        label: item.label ?? item.name ?? size.label ?? `Line item ${index + 1}`,
        size: {
          id: size.id ?? null,
          label: size.label ?? null,
          width: size.width ?? null,
          height: size.height ?? null,
        },
        color: item.color ?? null,
        direction: item.direction ?? null,
        heights: Array.isArray(item.heights) ? item.heights : [],
        widths: Array.isArray(item.widths) ? item.widths : [],
        dividers: Array.isArray(item.dividers) ? item.dividers : [],
        textZones: zoneTexts,
        rawConfig: item,
      };
    }),
  };
}

function renderProofHtml(orderId: string, payload: Record<string, unknown>) {
  const proofPackage = getProofPackage(orderId, payload);
  const customer = proofPackage.customer;
  const lineItems = proofPackage.lineItems.map((item) => {
    const zoneRows = item.textZones.length > 0
      ? item.textZones.map((zone) => `
        <tr>
          <td>${escapeXml(zone.zoneId)}</td>
          <td>${escapeXml(zone.text)}</td>
          <td>${escapeXml(zone.font)}</td>
          <td>${escapeXml(zone.fontSize)}</td>
        </tr>`).join("")
      : `<tr><td colspan="4">No text zones recorded.</td></tr>`;

    return `
      <section class="item">
        <h2>${escapeXml(item.label)}</h2>
        <p class="meta">Item ${item.itemNumber} | ${escapeXml(item.size.label)} | ${escapeXml(item.color)} | ${escapeXml(item.direction)}</p>
        <table>
          <thead>
            <tr><th>Zone</th><th>Text</th><th>Font</th><th>Size</th></tr>
          </thead>
          <tbody>${zoneRows}</tbody>
        </table>
      </section>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Nameplates Express Proof ${escapeXml(orderId)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #0f172a; }
      header { margin-bottom: 24px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .subtle { color: #475569; font-size: 14px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0 24px; }
      .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: #f8fafc; }
      .card h2 { margin: 0 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; }
      .item { margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
      .item h2 { margin: 0 0 4px; font-size: 18px; }
      .meta { margin: 0 0 12px; color: #475569; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 13px; vertical-align: top; }
      th { background: #f8fafc; }
      ul { margin: 8px 0 0 18px; }
      code { font-family: Consolas, monospace; }
    </style>
  </head>
  <body>
    <header>
      <h1>Nameplates Express Proof Document</h1>
      <div class="subtle">Order ${escapeXml(orderId)} | State: ${escapeXml(proofPackage.orderState)} | Generated: ${escapeXml(proofPackage.generatedAt)}</div>
    </header>
    <section class="grid">
      <div class="card">
        <h2>Customer</h2>
        <div>${escapeXml(customer.name)}</div>
        <div>${escapeXml(customer.company)}</div>
        <div>${escapeXml(customer.email)}</div>
        <div>${escapeXml(customer.phone)}</div>
      </div>
      <div class="card">
        <h2>Payment</h2>
        <div>Method: ${escapeXml(proofPackage.payment.method)}</div>
        <div>Provider: ${escapeXml(proofPackage.payment.provider)}</div>
        <div>Status: ${escapeXml(proofPackage.payment.status)}</div>
        <div>PayPal Order: ${escapeXml(proofPackage.payment.paypalOrderId)}</div>
        <div>Capture ID: ${escapeXml(proofPackage.payment.paypalCaptureId)}</div>
        <div>Subtotal: ${escapeXml(proofPackage.pricing.currencyCode)} ${escapeXml(proofPackage.pricing.subtotal)}</div>
      </div>
    </section>
    <section class="card" style="margin-bottom: 24px;">
      <h2>Package Assets</h2>
      <ul>
        ${proofPackage.proofAssets.map((asset) => `<li>${escapeXml(asset.label)}: <code>${escapeXml(asset.url)}</code></li>`).join("")}
      </ul>
    </section>
    ${lineItems}
  </body>
</html>`;
}

async function getLatestAttempt(orderId: string) {
  const rows = await db
    .select()
    .from(orderDeliveryAttemptTable)
    .where(eq(orderDeliveryAttemptTable.orderId, orderId))
    .orderBy(desc(orderDeliveryAttemptTable.attemptNumber), desc(orderDeliveryAttemptTable.createdAt))
    .limit(1);
  return rows[0];
}

async function insertAttempt(args: {
  orderId: string;
  requestChecksum: string;
  requestPayload: unknown;
  requestStatus: string;
  responseStatus: string | null;
  responseBody: Record<string, unknown> | null;
  confirmationState: string;
}) {
  const latestAttempt = await getLatestAttempt(args.orderId);
  return (await db.insert(orderDeliveryAttemptTable).values({
    orderId: args.orderId,
    attemptNumber: getNextAttemptNumber(latestAttempt?.attemptNumber),
    requestChecksum: args.requestChecksum,
    requestPayload: args.requestPayload,
    requestStatus: args.requestStatus,
    responseStatus: args.responseStatus,
    responseBody: args.responseBody,
    confirmationState: args.confirmationState,
  }).returning())[0];
}

function isAbortError(err: unknown) {
  return err instanceof Error && err.name === "AbortError";
}

async function deliverToN8n(args: {
  webhookUrl: string;
  orderId: string;
  token: string;
  payload: unknown;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? N8N_DELIVERY_TIMEOUT_MS);

  try {
    const response = await fetch(args.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-order-id": args.orderId,
        "x-order-token": args.token,
      },
      body: JSON.stringify(args.payload),
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body: { text },
    };
  } catch (err) {
    if (isAbortError(err)) {
      return {
        ok: false,
        status: 504,
        body: { error: "timeout", message: `n8n delivery exceeded ${args.timeoutMs ?? N8N_DELIVERY_TIMEOUT_MS}ms` },
      };
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function markAttemptResult(args: {
  attemptId: number;
  orderId: string;
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}) {
  const latest = await db.select().from(orderTable).where(eq(orderTable.orderId, args.orderId)).limit(1);
  await db.update(orderDeliveryAttemptTable)
    .set({
      responseStatus: String(args.status),
      responseBody: args.body,
      confirmationState: args.ok ? "awaiting" : "failed",
    })
    .where(eq(orderDeliveryAttemptTable.id, args.attemptId));

  if (args.ok && latest[0]?.state !== "n8n_confirmed") {
    await db.update(orderTable).set({ state: "n8n_sent" }).where(eq(orderTable.orderId, args.orderId));
  } else if (!args.ok) {
    await db.update(orderTable).set({ state: "n8n_failed" }).where(eq(orderTable.orderId, args.orderId));
  }
}

async function recordConfigurationFailure(args: {
  orderId: string;
  payload: unknown;
  payloadChecksum: string;
  reason: string;
  requestStatus: string;
}) {
  await insertAttempt({
    orderId: args.orderId,
    requestChecksum: args.payloadChecksum,
    requestPayload: args.payload,
    requestStatus: args.requestStatus,
    responseStatus: "not_configured",
    responseBody: { reason: args.reason },
    confirmationState: "failed",
  });
  await db.update(orderTable).set({ state: "n8n_failed" }).where(eq(orderTable.orderId, args.orderId));
}

async function handleN8nOrderConfirmed(req: Request, res: Response) {
  const { orderId, token } = req.body as Record<string, unknown>;
  if (typeof orderId !== "string" || typeof token !== "string") {
    res.status(400).json({ error: "Missing orderId or token" });
    return;
  }
  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const workflowSettings = await getWorkflowSettings();
  const callbackSecret = getCallbackSecret(workflowSettings);
  const sharedSecret = getSharedSecret(workflowSettings);
  const secrets = [
    order.n8nDeliveryToken,
    callbackSecret,
    sharedSecret ? getWebhookToken(orderId, sharedSecret) : "",
  ].filter(Boolean) as string[];
  if (!secrets.some((secret) => token === secret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (order.state === "n8n_confirmed") {
    res.json({ ok: true, duplicate: true });
    return;
  }
  await db.update(orderTable).set({ state: "n8n_confirmed", n8nAckReceivedAt: new Date() }).where(eq(orderTable.orderId, orderId));
  const attempts = await db.select().from(orderDeliveryAttemptTable).where(eq(orderDeliveryAttemptTable.orderId, orderId)).orderBy(desc(orderDeliveryAttemptTable.attemptNumber), desc(orderDeliveryAttemptTable.createdAt)).limit(1);
  if (attempts[0]) {
    await db.update(orderDeliveryAttemptTable).set({ confirmationState: "confirmed" }).where(eq(orderDeliveryAttemptTable.id, attempts[0].id));
  }
  res.json({ ok: true });
}

router.post("/paypal/orders", async (req, res) => {
  try {
    const body = req.body as {
      cart?: Array<Record<string, unknown>>;
    };
    const workflowSettings = await getWorkflowSettings();
    const payPalConfig = getPayPalConfig(workflowSettings);
    if (!payPalConfig) {
      res.status(409).json({ error: "PayPal sandbox credentials are not configured" });
      return;
    }

    const cart = Array.isArray(body.cart) ? body.cart : [];
    if (cart.length === 0) {
      res.status(400).json({ error: "Cart is required" });
      return;
    }

    const pricing = buildCartPricing(cart, await getConfiguredSizes());
    if (pricing.subtotal <= 0) {
      res.status(409).json({ error: "Unable to calculate a payable cart total" });
      return;
    }

    const created = await createPayPalOrder({
      config: payPalConfig,
      amount: pricing.subtotal,
      description: `Nameplates Express order (${cart.length} item${cart.length === 1 ? "" : "s"})`,
      requestId: makePayPalRequestId("create", checksumPayload({ cart, subtotal: pricing.subtotal })),
    });

    res.json({
      orderId: created.orderId,
      status: created.status,
      amount: pricing.subtotal.toFixed(2),
      currencyCode: pricing.currencyCode,
    });
  } catch (err) {
    req.log.error(err, "Failed to create PayPal order");
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
});

router.post("/paypal/orders/:orderId/capture", async (req, res) => {
  try {
    const workflowSettings = await getWorkflowSettings();
    const payPalConfig = getPayPalConfig(workflowSettings);
    if (!payPalConfig) {
      res.status(409).json({ error: "PayPal sandbox credentials are not configured" });
      return;
    }

    const payment = await capturePayPalOrder({
      config: payPalConfig,
      orderId: req.params.orderId,
      requestId: makePayPalRequestId("capture", req.params.orderId),
    });

    res.json(payment);
  } catch (err) {
    req.log.error(err, "Failed to capture PayPal order");
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
});

router.post("/orders/finalize", async (req, res) => {
  try {
    const body = req.body as {
      paymentMethod: "paypal" | "invoice";
      paymentStatus?: "paid" | "pending";
      customer: Record<string, unknown>;
      cart: Array<Record<string, unknown>>;
      proofReferences?: { label: string; url: string }[];
      paypalOrderId?: string;
      paypalCaptureId?: string;
    };
    const workflowSettings = await getWorkflowSettings();
    const pricing = buildCartPricing(body.cart, await getConfiguredSizes());
    const isPayPalOrder = body.paymentMethod === "paypal";
    const isPaid = isPayPalOrder ? true : body.paymentStatus === "paid";

    let verifiedPayment: Awaited<ReturnType<typeof verifyPayPalOrder>> = null;
    if (isPayPalOrder) {
      if (!body.paypalOrderId || !body.paypalCaptureId) {
        res.status(400).json({ error: "Missing PayPal order or capture id" });
        return;
      }

      const existingOrder = await findOrderByPayPalCaptureId(body.paypalCaptureId);
      if (existingOrder) {
        res.status(200).json({
          orderId: existingOrder.orderId,
          state: existingOrder.state,
          duplicate: true,
        });
        return;
      }

      const payPalConfig = getPayPalConfig(workflowSettings);
      if (!payPalConfig) {
        res.status(409).json({ error: "PayPal sandbox credentials are not configured" });
        return;
      }

      verifiedPayment = await verifyPayPalOrder({
        config: payPalConfig,
        orderId: body.paypalOrderId,
        captureId: body.paypalCaptureId,
      });
      if (!verifiedPayment) {
        res.status(409).json({ error: "Unable to verify a completed PayPal capture for this order" });
        return;
      }
      if (verifiedPayment.currencyCode !== pricing.currencyCode || Number(verifiedPayment.amount ?? "0") !== pricing.subtotal) {
        res.status(409).json({ error: "Verified PayPal amount does not match the current order total" });
        return;
      }
    }

    const orderId = makeOrderId();
    const payload = buildFinalOrderPayload({
      orderId,
      paymentMethod: body.paymentMethod,
      customer: body.customer,
      cart: body.cart,
      proofReferences: body.proofReferences ?? buildProofReferences(orderId),
      paid: isPaid,
      pricing,
      paymentMetadata: verifiedPayment ? {
        paypalOrderId: verifiedPayment.orderId,
        paypalCaptureId: verifiedPayment.captureId,
        payerId: verifiedPayment.payerId,
        payerEmail: verifiedPayment.payerEmail,
        currencyCode: verifiedPayment.currencyCode,
        amount: verifiedPayment.amount,
        capturedAt: verifiedPayment.capturedAt,
      } : undefined,
    });
    const payloadChecksum = checksumPayload(payload);
    const sharedSecret = getSharedSecret(workflowSettings);
    const n8nDeliveryToken = sharedSecret ? getWebhookToken(orderId, sharedSecret) : "";

    const record = (await db.insert(orderTable).values({
      orderId,
      state: payload.orderState,
      paymentMethod: body.paymentMethod,
      payload,
      payloadChecksum,
      n8nDeliveryToken,
    }).returning())[0];

    if (!isWebhookEnabled(workflowSettings)) {
      await recordConfigurationFailure({
        orderId: record.orderId,
        payload,
        payloadChecksum,
        reason: "n8n webhook is not enabled",
        requestStatus: "skipped",
      });
      res.json({ orderId: record.orderId, state: "n8n_failed", queued: false });
      return;
    }

    const webhookUrl = getConfiguredWebhookUrl(workflowSettings);
    if (!webhookUrl) {
      await recordConfigurationFailure({
        orderId: record.orderId,
        payload,
        payloadChecksum,
        reason: "n8n webhook is not configured",
        requestStatus: "skipped",
      });
      res.json({ orderId: record.orderId, state: "n8n_failed", queued: false });
      return;
    }

    if (!sharedSecret) {
      await recordConfigurationFailure({
        orderId: record.orderId,
        payload,
        payloadChecksum,
        reason: "n8n shared secret is not configured",
        requestStatus: "failed_config",
      });
      res.status(500).json({ error: "n8n shared secret is not configured", orderId: record.orderId, state: "n8n_failed" });
      return;
    }

    const attempt = await insertAttempt({
      orderId: record.orderId,
      requestChecksum: payloadChecksum,
      requestPayload: payload,
      requestStatus: "sent",
      responseStatus: "pending",
      responseBody: null,
      confirmationState: "awaiting",
    });

    await db.update(orderTable).set({ state: "queued_for_n8n" }).where(eq(orderTable.orderId, record.orderId));

    const result = await deliverToN8n({
      webhookUrl,
      orderId: record.orderId,
      token: n8nDeliveryToken,
      payload,
    });

    await markAttemptResult({
      attemptId: attempt.id,
      orderId: record.orderId,
      ok: result.ok,
      status: result.status,
      body: result.body,
    });

    res.status(result.ok ? 202 : 502).json({
      orderId: record.orderId,
      state: result.ok ? "n8n_sent" : "n8n_failed",
      attemptNumber: attempt.attemptNumber,
    });
  } catch (err) {
    req.log.error(err, "Failed to finalize order");
    res.status(500).json({ error: "Failed to finalize order" });
  }
});

router.get("/orders", async (req, res) => {
  if (!requireAdminAccess(req, res)) {
    return;
  }

  const rows = await db.select().from(orderTable).orderBy(desc(orderTable.createdAt)).limit(25);
  res.json({ orders: rows });
});

router.get("/orders/:orderId", async (req, res) => {
  if (!requireAdminAccess(req, res)) {
    return;
  }

  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, req.params.orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const attempts = await db.select().from(orderDeliveryAttemptTable).where(eq(orderDeliveryAttemptTable.orderId, order.orderId)).orderBy(desc(orderDeliveryAttemptTable.createdAt));
  res.json({ order, attempts });
});

router.get("/orders/:orderId/proof.html", async (req, res) => {
  if (!requireAdminAccess(req, res)) {
    return;
  }

  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, req.params.orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).type("text/plain").send("Order not found");
    return;
  }
  res.type("text/html").send(renderProofHtml(order.orderId, order.payload as Record<string, unknown>));
});

router.get("/orders/:orderId/proof-package.json", async (req, res) => {
  if (!requireAdminAccess(req, res)) {
    return;
  }

  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, req.params.orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(getProofPackage(order.orderId, order.payload as Record<string, unknown>));
});

router.post("/orders/:orderId/status", async (req, res) => {
  if (!requireAdminAccess(req, res)) {
    return;
  }

  const { orderId } = req.params;
  const { state, trackingNumber, carrier, labelUrl, source } = req.body as Record<string, unknown>;
  if (typeof state !== "string") {
    res.status(400).json({ error: "Missing state" });
    return;
  }
  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const nextState = state as typeof order.state;
  if (!isTransitionAllowed(order.state, nextState)) {
    res.status(409).json({ error: `Transition from ${order.state} to ${nextState} is not allowed` });
    return;
  }
  await db.update(orderTable).set({
    state: nextState,
    payload: {
      ...(order.payload as Record<string, unknown>),
      trackingNumber: typeof trackingNumber === "string" ? trackingNumber : undefined,
      carrier: typeof carrier === "string" ? carrier : undefined,
      labelUrl: typeof labelUrl === "string" ? labelUrl : undefined,
      source: typeof source === "string" ? source : undefined,
      statusUpdatedAt: new Date().toISOString(),
    },
  }).where(eq(orderTable.orderId, orderId));
  res.json({ ok: true, orderId, state: nextState });
});

router.post("/orders/:orderId/retry", async (req, res) => {
  if (!requireAdminAccess(req, res)) {
    return;
  }

  const { orderId } = req.params;
  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.state === "n8n_confirmed") {
    res.json({ ok: true, orderId, state: order.state, duplicate: true });
    return;
  }

  const workflowSettings = await getWorkflowSettings();
  if (!isWebhookEnabled(workflowSettings)) {
    await recordConfigurationFailure({
      orderId: order.orderId,
      payload: order.payload as Record<string, unknown>,
      payloadChecksum: order.payloadChecksum,
      reason: "n8n webhook is not enabled",
      requestStatus: "retry_skipped",
    });
    res.status(409).json({ error: "n8n webhook is not enabled" });
    return;
  }

  const webhookUrl = getConfiguredWebhookUrl(workflowSettings);
  if (!webhookUrl) {
    await recordConfigurationFailure({
      orderId: order.orderId,
      payload: order.payload as Record<string, unknown>,
      payloadChecksum: order.payloadChecksum,
      reason: "n8n webhook is not configured",
      requestStatus: "retry_skipped",
    });
    res.status(409).json({ error: "n8n webhook is not configured" });
    return;
  }

  if (!order.n8nDeliveryToken) {
    await recordConfigurationFailure({
      orderId: order.orderId,
      payload: order.payload as Record<string, unknown>,
      payloadChecksum: order.payloadChecksum,
      reason: "n8n shared secret is not configured",
      requestStatus: "retry_failed_config",
    });
    res.status(409).json({ error: "n8n shared secret is not configured" });
    return;
  }

  const payload = order.payload as Record<string, unknown>;
  const payloadChecksum = checksumPayload(payload);
  const attempt = await insertAttempt({
    orderId: order.orderId,
    requestChecksum: payloadChecksum,
    requestPayload: payload,
    requestStatus: "retry",
    responseStatus: "pending",
    responseBody: null,
    confirmationState: "awaiting",
  });

  await db.update(orderTable).set({ state: "queued_for_n8n" }).where(eq(orderTable.orderId, orderId));

  const result = await deliverToN8n({
    webhookUrl,
    orderId: order.orderId,
    token: order.n8nDeliveryToken,
    payload,
  });

  await markAttemptResult({
    attemptId: attempt.id,
    orderId: order.orderId,
    ok: result.ok,
    status: result.status,
    body: result.body,
  });

  res.status(result.ok ? 202 : 502).json({
    ok: result.ok,
    orderId,
    state: result.ok ? "n8n_sent" : "n8n_failed",
    attemptNumber: attempt.attemptNumber,
  });
});

router.post("/webhooks/n8n/order-confirmed", handleN8nOrderConfirmed);
router.post("/webhooks/n8n/order-confirmation", handleN8nOrderConfirmed);

export default router;
