import { Router, type IRouter } from "express";
import { signAdminToken } from "../lib/admin-token";

const router: IRouter = Router();

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

router.post("/admin/unlock", (req, res) => {
  const { password } = req.body as Record<string, unknown>;

  if (typeof password !== "string" || !password) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    req.log.error("ADMIN_PASSWORD environment variable is not set");
    res.status(503).json({ error: "Admin authentication is not configured" });
    return;
  }

  if (password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = signAdminToken(adminPassword);
  res.json({ token });
});

export default router;
