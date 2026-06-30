import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, orderTable, orderDeliveryAttemptTable } from "@workspace/db";
import { buildFinalOrderPayload, checksumPayload, makeOrderId } from "../lib/orders";

const router: IRouter = Router();

function getN8nWebhookUrl() {
  return process.env.N8N_ORDERS_WEBHOOK_URL ?? "";
}

function getN8nCallbackSecret() {
  return process.env.N8N_CALLBACK_SECRET ?? "";
}

function getWebhookToken(orderId: string) {
  return crypto.createHmac("sha256", process.env.N8N_SHARED_SECRET ?? "local-n8n-secret").update(orderId).digest("hex");
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderProofSvg(orderId: string, payload: Record<string, unknown>) {
  const customer = (payload.customer ?? {}) as Record<string, unknown>;
  const cart = Array.isArray(payload.cart) ? payload.cart as Record<string, unknown>[] : [];
  const proofReferences = Array.isArray(payload.proofReferences) ? payload.proofReferences as { label?: unknown; url?: unknown }[] : [];
  const lines = [
    `Order ${orderId}`,
    `State: ${payload.orderState ?? "unknown"}`,
    `Customer: ${customer.name ?? customer.companyName ?? customer.email ?? "Unknown"}`,
    `Items: ${cart.length}`,
    `Proofs: ${proofReferences.length}`,
  ];
  const text = lines.map((line, index) => `<text x="48" y="${96 + index * 44}" font-size="28" fill="#10233d" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`).join("");
  const itemRows = cart.slice(0, 6).map((item, index) => {
    const label = item.label ?? item.name ?? item.size?.label ?? `Line item ${index + 1}`;
    return `<text x="48" y="${360 + index * 34}" font-size="22" fill="#334155" font-family="Arial, Helvetica, sans-serif">${escapeXml(label)}</text>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <rect width="1200" height="1600" fill="#f8fafc"/>
  <rect x="36" y="36" width="1128" height="1528" rx="28" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="48" y="64" font-size="22" fill="#64748b" font-family="Arial, Helvetica, sans-serif">Nameplates Express proof summary</text>
  ${text}
  <rect x="48" y="404" width="1104" height="1" fill="#e2e8f0"/>
  <text x="48" y="448" font-size="24" fill="#0f172a" font-family="Arial, Helvetica, sans-serif">Line items</text>
  ${itemRows}
</svg>`;
}

export const allowedTransitions: Record<string, string[]> = {
  draft: ["submitted", "invoiced"],
  submitted: ["approved", "paid", "ready", "shipped", "delivered", "n8n_confirmed"],
  paid: ["ready", "shipped", "delivered"],
  invoiced: ["submitted", "paid"],
  queued_for_n8n: ["n8n_sent", "n8n_failed", "n8n_confirmed"],
  n8n_sent: ["n8n_confirmed", "n8n_failed"],
  n8n_confirmed: ["approved", "paid", "ready", "shipped", "delivered"],
  n8n_failed: ["queued_for_n8n"],
};

export function isTransitionAllowed(from: string, to: string) {
  return (allowedTransitions[from] ?? []).includes(to);
}

router.post("/orders/finalize", async (req, res) => {
  try {
    const body = req.body as {
      orderId?: string;
      paymentMethod: "paypal" | "invoice";
      paymentStatus: "paid" | "pending";
      customer: Record<string, unknown>;
      cart: Array<Record<string, unknown>>;
      proofReferences?: { label: string; url: string }[];
    };
    const orderId = body.orderId ?? makeOrderId();
    const payload = buildFinalOrderPayload({
      orderId,
      paymentMethod: body.paymentMethod,
      customer: body.customer,
      cart: body.cart,
      proofReferences: body.proofReferences ?? body.cart.map((item, idx) => ({
        label: `Proof ${idx + 1}`,
        url: `/api/orders/${orderId}/proof.svg?item=${encodeURIComponent(String(item?.id ?? idx))}`,
      })),
      paid: body.paymentStatus === "paid",
    });
    const payloadChecksum = checksumPayload(payload);
    const n8nDeliveryToken = getWebhookToken(orderId);

    const existing = await db.select().from(orderTable).where(eq(orderTable.orderId, orderId)).limit(1);
    const record = existing[0]
      ? (await db.update(orderTable).set({
          state: payload.orderState,
          paymentMethod: body.paymentMethod,
          payload,
          payloadChecksum,
          n8nDeliveryToken,
        }).where(eq(orderTable.orderId, orderId)).returning())[0]
      : (await db.insert(orderTable).values({
          orderId,
          state: payload.orderState,
          paymentMethod: body.paymentMethod,
          payload,
          payloadChecksum,
          n8nDeliveryToken,
        }).returning())[0];

    const webhookUrl = getN8nWebhookUrl();
    if (!webhookUrl) {
      await db.insert(orderDeliveryAttemptTable).values({
        orderId: record.orderId,
        requestChecksum: payloadChecksum,
        requestPayload: payload,
        requestStatus: "skipped",
        responseStatus: "not_configured",
        responseBody: { reason: "n8n webhook is not configured" },
        confirmationState: "failed",
      });
      await db.update(orderTable).set({ state: "n8n_failed" }).where(eq(orderTable.orderId, record.orderId));
      res.json({ orderId: record.orderId, state: "n8n_failed", queued: false });
      return;
    }

    await db.insert(orderDeliveryAttemptTable).values({
      orderId: record.orderId,
      requestChecksum: payloadChecksum,
      requestPayload: payload,
      requestStatus: "sent",
      responseStatus: "pending",
      responseBody: null,
      confirmationState: "awaiting",
    });

    await db.update(orderTable).set({ state: "queued_for_n8n" }).where(eq(orderTable.orderId, record.orderId));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-order-id": record.orderId,
        "x-order-token": n8nDeliveryToken,
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    const latest = await db.select().from(orderTable).where(eq(orderTable.orderId, record.orderId)).limit(1);
    if (latest[0]?.state !== "n8n_confirmed") {
      await db.update(orderTable).set({ state: "n8n_sent" }).where(eq(orderTable.orderId, record.orderId));
    }
    await db.update(orderDeliveryAttemptTable)
      .set({ responseStatus: String(response.status), responseBody: { text }, confirmationState: response.ok ? "awaiting" : "failed" })
      .where(eq(orderDeliveryAttemptTable.orderId, record.orderId));

    res.status(response.ok ? 202 : 502).json({ orderId: record.orderId, state: response.ok ? "n8n_sent" : "n8n_failed" });
  } catch (err) {
    req.log.error(err, "Failed to finalize order");
    res.status(500).json({ error: "Failed to finalize order" });
  }
});

router.get("/orders", async (_req, res) => {
  const rows = await db.select().from(orderTable).orderBy(desc(orderTable.createdAt)).limit(25);
  res.json({ orders: rows });
});

router.get("/orders/:orderId", async (req, res) => {
  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, req.params.orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const attempts = await db.select().from(orderDeliveryAttemptTable).where(eq(orderDeliveryAttemptTable.orderId, order.orderId)).orderBy(desc(orderDeliveryAttemptTable.createdAt));
  res.json({ order, attempts });
});

router.get("/orders/:orderId/proof.svg", async (req, res) => {
  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, req.params.orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).type("text/plain").send("Order not found");
    return;
  }
  res.type("image/svg+xml").send(renderProofSvg(order.orderId, order.payload as Record<string, unknown>));
});

router.post("/orders/:orderId/status", async (req, res) => {
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
  if (!isTransitionAllowed(order.state, state)) {
    res.status(409).json({ error: `Transition from ${order.state} to ${state} is not allowed` });
    return;
  }
  await db.update(orderTable).set({
    state,
    payload: {
      ...(order.payload as Record<string, unknown>),
      trackingNumber: typeof trackingNumber === "string" ? trackingNumber : undefined,
      carrier: typeof carrier === "string" ? carrier : undefined,
      labelUrl: typeof labelUrl === "string" ? labelUrl : undefined,
      source: typeof source === "string" ? source : undefined,
      statusUpdatedAt: new Date().toISOString(),
    },
  }).where(eq(orderTable.orderId, orderId));
  res.json({ ok: true, orderId, state });
});

router.post("/orders/:orderId/retry", async (req, res) => {
  const { orderId } = req.params;
  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const webhookUrl = getN8nWebhookUrl();
  if (!webhookUrl) {
    await db.insert(orderDeliveryAttemptTable).values({
      orderId: order.orderId,
      requestChecksum: order.payloadChecksum,
      requestPayload: order.payload,
      requestStatus: "retry_skipped",
      responseStatus: "not_configured",
      responseBody: { reason: "n8n webhook is not configured" },
      confirmationState: "failed",
    });
    await db.update(orderTable).set({ state: "n8n_failed" }).where(eq(orderTable.orderId, orderId));
    res.status(409).json({ error: "n8n webhook is not configured" });
    return;
  }
  const payload = order.payload as Record<string, unknown>;
  const payloadChecksum = checksumPayload(payload);
  const n8nDeliveryToken = getWebhookToken(order.orderId);
  await db.insert(orderDeliveryAttemptTable).values({
    orderId: order.orderId,
    requestChecksum: payloadChecksum,
    requestPayload: payload,
    requestStatus: "retry",
    responseStatus: "pending",
    responseBody: null,
    confirmationState: "awaiting",
  });
  await db.update(orderTable).set({ state: "queued_for_n8n" }).where(eq(orderTable.orderId, orderId));
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-order-id": order.orderId,
      "x-order-token": n8nDeliveryToken,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const latest = await db.select().from(orderTable).where(eq(orderTable.orderId, orderId)).limit(1);
  await db.update(orderDeliveryAttemptTable)
    .set({ responseStatus: String(response.status), responseBody: { text }, confirmationState: response.ok ? "awaiting" : "failed" })
    .where(eq(orderDeliveryAttemptTable.orderId, order.orderId));
  if (response.ok && latest[0]?.state !== "n8n_confirmed") {
    await db.update(orderTable).set({ state: "n8n_sent" }).where(eq(orderTable.orderId, orderId));
  } else if (!response.ok) {
    await db.update(orderTable).set({ state: "n8n_failed" }).where(eq(orderTable.orderId, orderId));
  }
  res.status(response.ok ? 202 : 502).json({ ok: response.ok, orderId, state: response.ok ? "n8n_sent" : "n8n_failed" });
});

router.post("/webhooks/n8n/order-confirmed", async (req, res) => {
  const { orderId, token } = req.body as Record<string, unknown>;
  const callbackSecret = getN8nCallbackSecret();
  if (typeof orderId !== "string" || typeof token !== "string") {
    res.status(400).json({ error: "Missing orderId or token" });
    return;
  }
  const isValidToken = token === getWebhookToken(orderId) || (callbackSecret ? token === callbackSecret : false);
  if (!isValidToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await db.select().from(orderTable).where(eq(orderTable.orderId, orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.state === "n8n_confirmed") {
    res.json({ ok: true, duplicate: true });
    return;
  }
  await db.update(orderTable).set({ state: "n8n_confirmed", n8nAckReceivedAt: new Date() }).where(eq(orderTable.orderId, orderId));
  const attempts = await db.select().from(orderDeliveryAttemptTable).where(eq(orderDeliveryAttemptTable.orderId, orderId)).orderBy(desc(orderDeliveryAttemptTable.createdAt)).limit(1);
  if (attempts[0]) {
    await db.update(orderDeliveryAttemptTable).set({ confirmationState: "confirmed" }).where(eq(orderDeliveryAttemptTable.id, attempts[0].id));
  }
  res.json({ ok: true });
});

export default router;
