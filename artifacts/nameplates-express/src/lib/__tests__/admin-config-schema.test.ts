import { describe, expect, it } from "vitest";
import { GetAdminConfigResponse, PutAdminConfigBody } from "../../../../../lib/api-zod/src/generated/api";

describe("admin config schema", () => {
  it("accepts top-level workflow settings on get and put payloads", () => {
    const payload = {
      configured: true,
      sizes: [],
      workflowSettings: {
        n8nOrdersWebhookUrl: "http://example.test/webhook/orders",
        n8nCallbackSecret: "secret-value",
        webhookEnabled: true,
      },
    };

    expect(GetAdminConfigResponse.parse(payload).workflowSettings.n8nOrdersWebhookUrl).toBe(
      "http://example.test/webhook/orders",
    );
    expect(PutAdminConfigBody.parse({ sizes: [], workflowSettings: payload.workflowSettings }).workflowSettings.webhookEnabled).toBe(true);
  });
});
