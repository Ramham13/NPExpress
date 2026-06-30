import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminConfigRouter from "./admin-config";
import adminUnlockRouter from "./admin-unlock";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminUnlockRouter);
router.use(adminConfigRouter);
router.use(ordersRouter);

export default router;
