import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function respondHealth(_req: unknown, res: { json: (body: unknown) => void }) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}

router.get("/health", respondHealth);
router.get("/healthz", respondHealth);

export default router;
