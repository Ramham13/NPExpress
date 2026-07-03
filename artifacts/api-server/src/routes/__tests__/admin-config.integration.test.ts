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
          webhookEnabled: true,
          n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
          n8nCallbackSecret: "secret-value",
        },
      });

    expect(saveResponse.status).toBe(200);
    expect(getTableRows(adminConfigTable)).toHaveLength(1);
    expect(getTableRows(adminConfigTable)[0]?.workflowSettings).toMatchObject({
      webhookEnabled: true,
      n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
      n8nCallbackSecret: "secret-value",
    });

    const publicResponse = await request(app).get("/api/admin/config");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body).toMatchObject({
      configured: true,
      sizes: expect.any(Array),
      workflowSettings: {
        webhookEnabled: true,
      },
    });
    expect(publicResponse.body.workflowSettings.n8nOrdersWebhookUrl).toBeUndefined();
    expect(publicResponse.body.workflowSettings.n8nCallbackSecret).toBeUndefined();

    const authedResponse = await request(app)
      .get("/api/admin/config")
      .set(adminHeaders());
    expect(authedResponse.status).toBe(200);
    expect(authedResponse.body.workflowSettings).toMatchObject({
      webhookEnabled: true,
      n8nOrdersWebhookUrl: "https://n8n.internal/webhook/orders",
      n8nCallbackSecret: "secret-value",
    });
  });
});
