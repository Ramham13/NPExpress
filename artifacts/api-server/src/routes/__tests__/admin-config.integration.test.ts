import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import { ADMIN_HEADER_NAME } from "../../lib/admin-auth";
import { signAdminToken } from "../../lib/admin-token";
import { adminConfigTable, getTableRows, resetMockDb } from "../../test/mock-workspace-db";

const ADMIN_PASSWORD = "local-dev-password";

function adminHeaders() {
  return {
    [ADMIN_HEADER_NAME]: signAdminToken(ADMIN_PASSWORD),
  };
}

describe("admin config routes", () => {
  beforeEach(() => {
    resetMockDb();
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  });

  it("rejects invalid unlock requests and returns a token for the configured password only", async () => {
    const badBodyResponse = await request(app)
      .post("/api/admin/unlock")
      .send({});
    expect(badBodyResponse.status).toBe(400);
    expect(badBodyResponse.body).toEqual({ error: "Invalid request body" });

    const wrongPasswordResponse = await request(app)
      .post("/api/admin/unlock")
      .send({ password: "wrong-password" });
    expect(wrongPasswordResponse.status).toBe(401);
    expect(wrongPasswordResponse.body).toEqual({ error: "Invalid password" });

    const successResponse = await request(app)
      .post("/api/admin/unlock")
      .send({ password: ADMIN_PASSWORD });
    expect(successResponse.status).toBe(200);
    expect(successResponse.body.token).toEqual(expect.any(String));
  });

  it("persists workflow settings and hides secrets from public callers", async () => {
    const saveResponse = await request(app)
      .put("/api/admin/config")
      .set(adminHeaders())
      .send({
        sizes: [
          {
            id: "6x2",
            label: '6" x 2"',
            width: 6,
            height: 2,
            description: "Standard industrial plate",
            active: true,
            sortOrder: 1,
            basePrice: 12.5,
            pricingTiers: [],
            colors: [{ id: "black", label: "Black", hex: "#000000", enabled: true }],
          },
        ],
        workflowSettings: {
          supportEmail: "orders@example.com",
          webhookEnabled: true,
          n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
          n8nCallbackSecret: "secret-value",
          n8nSharedSecret: "delivery-secret",
          sandboxPayPalClientId: "paypal-client-id",
          sandboxPayPalSecret: "paypal-secret",
        },
      });

    expect(saveResponse.status).toBe(200);
    expect(getTableRows(adminConfigTable)).toHaveLength(1);
    expect(getTableRows(adminConfigTable)[0]?.workflowSettings).toMatchObject({
      supportEmail: "orders@example.com",
      webhookEnabled: true,
      n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
      n8nCallbackSecret: "secret-value",
      n8nSharedSecret: "delivery-secret",
      sandboxPayPalClientId: "paypal-client-id",
      sandboxPayPalSecret: "paypal-secret",
    });

    const publicResponse = await request(app).get("/api/admin/config");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body).toMatchObject({
      configured: true,
      sizes: expect.any(Array),
      workflowSettings: {
        supportEmail: "orders@example.com",
        webhookEnabled: true,
        sandboxPayPalClientId: "paypal-client-id",
        payPalEnvironment: "sandbox",
      },
    });
    expect(publicResponse.body.workflowSettings.n8nOrdersWebhookUrl).toBeUndefined();
    expect(publicResponse.body.workflowSettings.n8nCallbackSecret).toBeUndefined();
    expect(publicResponse.body.workflowSettings.n8nSharedSecret).toBeUndefined();
    expect(publicResponse.body.workflowSettings.sandboxPayPalSecret).toBeUndefined();

    const authedResponse = await request(app)
      .get("/api/admin/config")
      .set(adminHeaders());
    expect(authedResponse.status).toBe(200);
    expect(authedResponse.body.workflowSettings).toMatchObject({
      supportEmail: "orders@example.com",
      webhookEnabled: true,
      n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
      n8nCallbackSecret: "secret-value",
      n8nSharedSecret: "delivery-secret",
      sandboxPayPalClientId: "paypal-client-id",
      sandboxPayPalSecret: "paypal-secret",
    });
  });

  it("keeps admin config writes protected and rejects bad admin tokens on authenticated reads", async () => {
    const protectedWriteResponse = await request(app)
      .put("/api/admin/config")
      .send({
        sizes: [],
        workflowSettings: {},
      });
    expect(protectedWriteResponse.status).toBe(401);
    expect(protectedWriteResponse.body).toEqual({ error: "Unauthorized" });

    await request(app)
      .put("/api/admin/config")
      .set(adminHeaders())
      .send({
        sizes: [],
        workflowSettings: {
          webhookEnabled: true,
          sandboxPayPalClientId: "paypal-client-id",
        },
      })
      .expect(200);

    const badTokenResponse = await request(app)
      .get("/api/admin/config")
      .set(ADMIN_HEADER_NAME, "not-a-valid-token");
    expect(badTokenResponse.status).toBe(401);
    expect(badTokenResponse.body).toEqual({ error: "Unauthorized" });
  });
});
