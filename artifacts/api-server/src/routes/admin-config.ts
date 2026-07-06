import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminConfigTable } from "@workspace/db";
import { GetAdminConfigResponse, PutAdminConfigBody, PutAdminConfigResponse } from "@workspace/api-zod";
import { getAdminTokenFromRequest, getAdminPassword, isAdminTokenValid, requireAdminAccess } from "../lib/admin-auth";
import { getPublicPayPalSettings } from "../lib/paypal";

const router: IRouter = Router();

function sanitizeWorkflowSettings(workflowSettings: unknown) {
  const settings = workflowSettings as Record<string, unknown> | null | undefined;
  return {
    webhookEnabled: typeof settings?.webhookEnabled === "boolean" ? settings.webhookEnabled : false,
    ...getPublicPayPalSettings(settings ?? {}),
  };
}

router.get("/admin/config", async (req, res) => {
  try {
    const rows = await db.select().from(adminConfigTable).limit(1);
    const row = rows[0];
    const providedToken = getAdminTokenFromRequest(req);
    const includeSecrets = providedToken == null
      ? false
      : isAdminTokenValid(providedToken, getAdminPassword());

    if (providedToken != null && !includeSecrets) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const data = GetAdminConfigResponse.parse({
      configured: row != null,
      sizes: row?.sizes ?? [],
      workflowSettings: includeSecrets ? row?.workflowSettings ?? {} : sanitizeWorkflowSettings(row?.workflowSettings),
    });
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to get admin config");
    res.status(500).json({ error: "Failed to load admin configuration" });
  }
});

router.put("/admin/config", async (req, res) => {
  if (!requireAdminAccess(req, res)) {
    return;
  }

  try {
    const body = PutAdminConfigBody.parse(req.body);
    const rows = await db.select({ id: adminConfigTable.id }).from(adminConfigTable).limit(1);
    const existing = rows[0];

    let updated;
    if (existing) {
      const result = await db
        .update(adminConfigTable)
        .set({ sizes: body.sizes, workflowSettings: body.workflowSettings ?? {} })
        .where(eq(adminConfigTable.id, existing.id))
        .returning();
      updated = result[0];
    } else {
      const result = await db
        .insert(adminConfigTable)
        .values({ sizes: body.sizes, workflowSettings: body.workflowSettings ?? {} })
        .returning();
      updated = result[0];
    }

    const data = PutAdminConfigResponse.parse({ configured: true, sizes: updated.sizes, workflowSettings: updated.workflowSettings ?? {} });
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to save admin config");
    res.status(500).json({ error: "Failed to save admin configuration" });
  }
});

export default router;
