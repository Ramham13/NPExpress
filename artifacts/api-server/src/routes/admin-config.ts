import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminConfigTable } from "@workspace/db";
import { GetAdminConfigResponse, PutAdminConfigBody, PutAdminConfigResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Returns the current admin key from the environment.
 * Falls back to the hardcoded default — task #1 replaces this with a real secret.
 */
function getAdminKey(): string {
  return process.env.ADMIN_KEY ?? "admin1234";
}

router.get("/admin/config", async (req, res) => {
  try {
    const rows = await db.select().from(adminConfigTable).limit(1);
    const row = rows[0];
    const data = GetAdminConfigResponse.parse({
      configured: row != null,
      sizes: row?.sizes ?? [],
    });
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to get admin config");
    res.status(500).json({ error: "Failed to load admin configuration" });
  }
});

router.put("/admin/config", async (req, res) => {
  const providedKey = req.headers["x-admin-key"];
  if (!providedKey || providedKey !== getAdminKey()) {
    res.status(401).json({ error: "Unauthorized" });
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
        .set({ sizes: body.sizes })
        .where(eq(adminConfigTable.id, existing.id))
        .returning();
      updated = result[0];
    } else {
      const result = await db
        .insert(adminConfigTable)
        .values({ sizes: body.sizes })
        .returning();
      updated = result[0];
    }

    const data = PutAdminConfigResponse.parse({ configured: true, sizes: updated.sizes });
    res.json(data);
  } catch (err) {
    req.log.error(err, "Failed to save admin config");
    res.status(500).json({ error: "Failed to save admin configuration" });
  }
});

export default router;
