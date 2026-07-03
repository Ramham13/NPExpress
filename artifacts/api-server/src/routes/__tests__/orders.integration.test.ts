import request from "supertest";
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
    sizes: [],
    workflowSettings: {
      webhookEnabled: true,
      n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
      n8nCallbackSecret: "shared-secret",
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
    expect(order.payload.orderState).toBe("invoiced");
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
