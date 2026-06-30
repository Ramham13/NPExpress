import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminConfigRouter from "./admin-config";
import adminUnlockRouter from "./admin-unlock";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminUnlockRouter);
router.use(adminConfigRouter);

export default router;
