import request from "supertest";
import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../app";
import { ADMIN_HEADER_NAME } from "../../lib/admin-auth";
import { signAdminToken } from "../../lib/admin-token";
import {
  getTableRows,
  orderDeliveryAttemptTable,
  orderTable,
  resetMockDb,
  seedAdminConfig,
} from "../../test/mock-workspace-db";

const ADMIN_PASSWORD = "local-dev-password";

function adminHeaders() {
  return {
    [ADMIN_HEADER_NAME]: signAdminToken(ADMIN_PASSWORD),
  };
}

function seedWorkflowSettings() {
  seedAdminConfig({
    sizes: [
      {
        id: "6x2",
        label: '6" x 2"',
        basePrice: 5.5,
        pricingTiers: [{ minQty: 10, priceEach: 4.95 }],
      },
    ],
    workflowSettings: {
      webhookEnabled: true,
      n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
      n8nCallbackSecret: "callback-secret",
      n8nSharedSecret: "delivery-secret",
      sandboxPayPalClientId: "paypal-client-id",
      sandboxPayPalSecret: "paypal-secret",
    },
  });
}

describe("order workflow routes", () => {
  beforeEach(() => {
    resetMockDb();
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    delete process.env.N8N_ORDERS_WEBHOOK_URL;
    delete process.env.N8N_CALLBACK_SECRET;
    delete process.env.N8N_SHARED_SECRET;
    vi.stubGlobal("fetch", vi.fn());
  });

  it("finalizes an order, persists it locally, and records the first delivery attempt", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch).mockResolvedValue(new Response("accepted", { status: 202 }));

    const response = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { label: '6" x 2"' } }],
      });

    expect(response.status).toBe(202);
    expect(response.body.orderId).toMatch(/^NX-\d{4}-[A-F0-9]{6}$/);
    expect(response.body.attemptNumber).toBe(1);

    const [order] = getTableRows(orderTable);
    const [attempt] = getTableRows(orderDeliveryAttemptTable);
    expect(order).toMatchObject({
      orderId: response.body.orderId,
      state: "n8n_sent",
      paymentMethod: "invoice",
    });
    expect(order.n8nDeliveryToken).toBe(
      crypto.createHmac("sha256", "delivery-secret").update(response.body.orderId).digest("hex"),
    );
    expect(order.payload.orderState).toBe("invoiced");
    expect(order.payload.pricing).toMatchObject({
      currencyCode: "USD",
      subtotal: 0,
    });
    expect(order.payload.proofReferences).toEqual([
      { label: "Printable proof document", url: `/api/orders/${response.body.orderId}/proof.html` },
      { label: "Proof data package", url: `/api/orders/${response.body.orderId}/proof-package.json` },
    ]);
    expect(attempt).toMatchObject({
      orderId: response.body.orderId,
      attemptNumber: 1,
      requestStatus: "sent",
      responseStatus: "202",
      confirmationState: "awaiting",
      requestChecksum: order.payloadChecksum,
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("falls back to the callback secret for legacy admin configs without a shared secret", async () => {
    seedAdminConfig({
      sizes: [
        {
          id: "6x2",
          label: '6" x 2"',
          basePrice: 5.5,
          pricingTiers: [{ minQty: 10, priceEach: 4.95 }],
        },
      ],
      workflowSettings: {
        webhookEnabled: true,
        n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
        n8nCallbackSecret: "legacy-callback-secret",
        sandboxPayPalClientId: "paypal-client-id",
        sandboxPayPalSecret: "paypal-secret",
      },
    });
    vi.mocked(fetch).mockResolvedValue(new Response("accepted", { status: 202 }));

    const response = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { label: '6" x 2"' } }],
      });

    expect(response.status).toBe(202);
    expect(getTableRows(orderTable)[0]?.n8nDeliveryToken).toBe(
      crypto.createHmac("sha256", "legacy-callback-secret").update(response.body.orderId).digest("hex"),
    );
  });

  it("creates and captures PayPal orders before finalizing them as paid", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "PAYPAL-ORDER-1", status: "CREATED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "PAYPAL-ORDER-1",
        payer: { payer_id: "PAYER-123", email_address: "buyer@example.com" },
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAPTURE-123",
                  status: "COMPLETED",
                  create_time: "2026-07-05T00:00:00Z",
                  amount: { currency_code: "USD", value: "5.50" },
                },
              ],
            },
          },
        ],
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "PAYPAL-ORDER-1",
        payer: { payer_id: "PAYER-123", email_address: "buyer@example.com" },
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAPTURE-123",
                  status: "COMPLETED",
                  create_time: "2026-07-05T00:00:00Z",
                  amount: { currency_code: "USD", value: "5.50" },
                },
              ],
            },
          },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response("accepted", { status: 202 }));

    const createResponse = await request(app)
      .post("/api/paypal/orders")
      .send({
        cart: [{ id: "plate-1", size: { id: "6x2", label: '6" x 2"' } }],
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toMatchObject({
      orderId: "PAYPAL-ORDER-1",
      amount: "5.50",
      currencyCode: "USD",
    });

    const captureResponse = await request(app)
      .post("/api/paypal/orders/PAYPAL-ORDER-1/capture")
      .send({});

    expect(captureResponse.status).toBe(200);
    expect(captureResponse.body).toMatchObject({
      orderId: "PAYPAL-ORDER-1",
      captureId: "CAPTURE-123",
      status: "COMPLETED",
    });

    const finalizeResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "paypal",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { id: "6x2", label: '6" x 2"' } }],
        paypalOrderId: "PAYPAL-ORDER-1",
        paypalCaptureId: "CAPTURE-123",
      });

    expect(finalizeResponse.status).toBe(202);
    const [order] = getTableRows(orderTable);
    expect(order).toMatchObject({
      paymentMethod: "paypal",
      state: "n8n_sent",
    });
    expect(order.payload.orderState).toBe("paid");
    expect(order.payload.payment).toMatchObject({
      provider: "paypal",
      status: "paid",
      paypalOrderId: "PAYPAL-ORDER-1",
      paypalCaptureId: "CAPTURE-123",
      payerId: "PAYER-123",
      payerEmail: "buyer@example.com",
      amount: "5.50",
      currencyCode: "USD",
    });
    expect(order.payload.pricing).toMatchObject({
      currencyCode: "USD",
      subtotal: 5.5,
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(7);
  });

  it("rejects paid PayPal finalization when the server cannot verify the capture", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "PAYPAL-ORDER-1",
        purchase_units: [],
      }), { status: 200 }));

    const response = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "paypal",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { id: "6x2", label: '6" x 2"' } }],
        paypalOrderId: "PAYPAL-ORDER-1",
        paypalCaptureId: "CAPTURE-123",
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Unable to verify a completed PayPal capture for this order",
    });
    expect(getTableRows(orderTable)).toHaveLength(0);
  });

  it("rejects paid PayPal finalization when the captured amount does not match the order total", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "PAYPAL-ORDER-1",
        payer: { payer_id: "PAYER-123", email_address: "buyer@example.com" },
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAPTURE-123",
                  status: "COMPLETED",
                  create_time: "2026-07-05T00:00:00Z",
                  amount: { currency_code: "USD", value: "9.99" },
                },
              ],
            },
          },
        ],
      }), { status: 200 }));

    const response = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "paypal",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { id: "6x2", label: '6" x 2"' } }],
        paypalOrderId: "PAYPAL-ORDER-1",
        paypalCaptureId: "CAPTURE-123",
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Verified PayPal amount does not match the current order total",
    });
    expect(getTableRows(orderTable)).toHaveLength(0);
  });

  it("treats a repeated PayPal capture finalization as a safe duplicate", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "PAYPAL-ORDER-1",
        payer: { payer_id: "PAYER-123", email_address: "buyer@example.com" },
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAPTURE-123",
                  status: "COMPLETED",
                  create_time: "2026-07-05T00:00:00Z",
                  amount: { currency_code: "USD", value: "5.50" },
                },
              ],
            },
          },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response("accepted", { status: 202 }));

    const firstResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "paypal",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { id: "6x2", label: '6" x 2"' } }],
        paypalOrderId: "PAYPAL-ORDER-1",
        paypalCaptureId: "CAPTURE-123",
      });

    expect(firstResponse.status).toBe(202);

    const secondResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "paypal",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { id: "6x2", label: '6" x 2"' } }],
        paypalOrderId: "PAYPAL-ORDER-1",
        paypalCaptureId: "CAPTURE-123",
      });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body).toEqual({
      orderId: firstResponse.body.orderId,
      state: "n8n_sent",
      duplicate: true,
    });
    expect(getTableRows(orderTable)).toHaveLength(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("marks duplicate confirmations and confirmed-order retries as safe no-ops", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch).mockResolvedValue(new Response("accepted", { status: 202 }));

    const finalizeResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { label: '6" x 2"' } }],
      });

    const [orderBeforeAck] = getTableRows(orderTable);
    const confirmResponse = await request(app)
      .post("/api/webhooks/n8n/order-confirmation")
      .send({
        orderId: finalizeResponse.body.orderId,
        token: orderBeforeAck?.n8nDeliveryToken,
      });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body).toEqual({ ok: true });
    expect(getTableRows(orderTable)[0]?.state).toBe("n8n_confirmed");
    expect(getTableRows(orderDeliveryAttemptTable)[0]?.confirmationState).toBe("confirmed");

    const duplicateResponse = await request(app)
      .post("/api/webhooks/n8n/order-confirmation")
      .send({
        orderId: finalizeResponse.body.orderId,
        token: orderBeforeAck?.n8nDeliveryToken,
      });
    expect(duplicateResponse.status).toBe(200);
    expect(duplicateResponse.body).toEqual({ ok: true, duplicate: true });

    const retryResponse = await request(app)
      .post(`/api/orders/${finalizeResponse.body.orderId}/retry`)
      .set(adminHeaders())
      .send({});
    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body).toEqual({
      ok: true,
      orderId: finalizeResponse.body.orderId,
      state: "n8n_confirmed",
      duplicate: true,
    });
    expect(getTableRows(orderDeliveryAttemptTable)).toHaveLength(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("blocks retries after n8n confirmation even when the order has advanced to a later operational state", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch).mockResolvedValue(new Response("accepted", { status: 202 }));

    const finalizeResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { label: '6" x 2"' } }],
      });

    const [orderBeforeAck] = getTableRows(orderTable);
    await request(app)
      .post("/api/webhooks/n8n/order-confirmation")
      .send({
        orderId: finalizeResponse.body.orderId,
        token: orderBeforeAck?.n8nDeliveryToken,
      })
      .expect(200);

    await request(app)
      .post(`/api/orders/${finalizeResponse.body.orderId}/status`)
      .set(adminHeaders())
      .send({ state: "approved" })
      .expect(200);

    const retryResponse = await request(app)
      .post(`/api/orders/${finalizeResponse.body.orderId}/retry`)
      .set(adminHeaders())
      .send({});

    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body).toEqual({
      ok: true,
      orderId: finalizeResponse.body.orderId,
      state: "approved",
      duplicate: true,
    });
    expect(getTableRows(orderDeliveryAttemptTable)).toHaveLength(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("keeps failed orders retryable and records each retry attempt", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response("accepted", { status: 202 }));

    const finalizeResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { label: '6" x 2"' } }],
      });

    expect(finalizeResponse.status).toBe(502);
    expect(getTableRows(orderTable)[0]?.state).toBe("n8n_failed");
    expect(getTableRows(orderDeliveryAttemptTable)[0]).toMatchObject({
      attemptNumber: 1,
      requestStatus: "sent",
      responseStatus: "502",
      confirmationState: "failed",
    });

    const retryResponse = await request(app)
      .post(`/api/orders/${finalizeResponse.body.orderId}/retry`)
      .set(adminHeaders())
      .send({});

    expect(retryResponse.status).toBe(202);
    expect(retryResponse.body).toMatchObject({
      ok: true,
      orderId: finalizeResponse.body.orderId,
      state: "n8n_sent",
      attemptNumber: 2,
    });
    expect(getTableRows(orderTable)[0]?.state).toBe("n8n_sent");
    expect(getTableRows(orderDeliveryAttemptTable)).toHaveLength(2);
    expect(getTableRows(orderDeliveryAttemptTable)[1]).toMatchObject({
      attemptNumber: 2,
      requestStatus: "retry",
      responseStatus: "202",
      confirmationState: "awaiting",
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("updates operational status and preserves existing fulfillment metadata when later updates omit it", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch).mockResolvedValue(new Response("accepted", { status: 202 }));

    const finalizeResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { label: '6" x 2"' } }],
      });

    const [orderBeforeAck] = getTableRows(orderTable);
    await request(app)
      .post("/api/webhooks/n8n/order-confirmation")
      .send({
        orderId: finalizeResponse.body.orderId,
        token: orderBeforeAck?.n8nDeliveryToken,
      })
      .expect(200);

    const shippedResponse = await request(app)
      .post(`/api/orders/${finalizeResponse.body.orderId}/status`)
      .set(adminHeaders())
      .send({
        state: "shipped",
        trackingNumber: "1Z999AA10123456784",
        carrier: "UPS",
        labelUrl: "https://carrier.example/labels/1",
        source: "admin",
      });

    expect(shippedResponse.status).toBe(200);
    expect(shippedResponse.body).toEqual({
      ok: true,
      orderId: finalizeResponse.body.orderId,
      state: "shipped",
    });
    expect(getTableRows(orderTable)[0]?.payload).toMatchObject({
      trackingNumber: "1Z999AA10123456784",
      carrier: "UPS",
      labelUrl: "https://carrier.example/labels/1",
      source: "admin",
    });

    const deliveredResponse = await request(app)
      .post(`/api/orders/${finalizeResponse.body.orderId}/status`)
      .set(adminHeaders())
      .send({ state: "delivered" });

    expect(deliveredResponse.status).toBe(200);
    expect(deliveredResponse.body).toEqual({
      ok: true,
      orderId: finalizeResponse.body.orderId,
      state: "delivered",
    });
    expect(getTableRows(orderTable)[0]?.payload).toMatchObject({
      trackingNumber: "1Z999AA10123456784",
      carrier: "UPS",
      labelUrl: "https://carrier.example/labels/1",
      source: "admin",
    });
    expect(getTableRows(orderTable)[0]?.payload.statusUpdatedAt).toEqual(expect.any(String));
  });

  it("rejects invalid operational state transitions", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch).mockResolvedValue(new Response("accepted", { status: 202 }));

    const finalizeResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: { name: "Jane Smith", email: "jane@example.com" },
        cart: [{ id: "plate-1", size: { label: '6" x 2"' } }],
      });

    const [orderBeforeAck] = getTableRows(orderTable);
    await request(app)
      .post("/api/webhooks/n8n/order-confirmation")
      .send({
        orderId: finalizeResponse.body.orderId,
        token: orderBeforeAck?.n8nDeliveryToken,
      })
      .expect(200);

    const response = await request(app)
      .post(`/api/orders/${finalizeResponse.body.orderId}/status`)
      .set(adminHeaders())
      .send({ state: "draft" });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("Transition from n8n_confirmed to draft is not allowed");
  });

  it("serves a printable proof document and structured proof package for persisted orders", async () => {
    seedWorkflowSettings();
    vi.mocked(fetch).mockResolvedValue(new Response("accepted", { status: 202 }));

    const finalizeResponse = await request(app)
      .post("/api/orders/finalize")
      .send({
        paymentMethod: "invoice",
        paymentStatus: "pending",
        customer: {
          name: "Jane Smith",
          company: "Example Industries",
          email: "jane@example.com",
        },
        cart: [{
          id: "plate-1",
          label: "Control Panel Plate",
          color: "black",
          direction: "horizontal",
          size: { id: "6x2", label: '6" x 2"', width: 6, height: 2 },
          lineConfigs: {
            line1: { text: "PUMP 01", font: "Arial", fontSize: 18, bold: true },
          },
          dividers: [],
          heights: [100],
          widths: [100],
        }],
      });

    const orderId = finalizeResponse.body.orderId as string;

    const packageResponse = await request(app)
      .get(`/api/orders/${orderId}/proof-package.json`)
      .set(adminHeaders());
    expect(packageResponse.status).toBe(200);
    expect(packageResponse.body).toMatchObject({
      schemaVersion: "2026-07-proof-package-v1",
      orderId,
      customer: {
        name: "Jane Smith",
        company: "Example Industries",
        email: "jane@example.com",
      },
      pricing: {
        currencyCode: "USD",
        subtotal: 5.5,
      },
      lineItems: [
        {
          itemId: "plate-1",
          label: "Control Panel Plate",
          size: { label: '6" x 2"' },
          textZones: [{ zoneId: "line1", text: "PUMP 01", font: "Arial", fontSize: 18 }],
        },
      ],
    });

    const htmlResponse = await request(app)
      .get(`/api/orders/${orderId}/proof.html`)
      .set(adminHeaders());
    expect(htmlResponse.status).toBe(200);
    expect(htmlResponse.headers["content-type"]).toContain("text/html");
    expect(htmlResponse.text).toContain("Nameplates Express Proof Document");
    expect(htmlResponse.text).toContain("Control Panel Plate");
    expect(htmlResponse.text).toContain("/proof-package.json");
  });
});
