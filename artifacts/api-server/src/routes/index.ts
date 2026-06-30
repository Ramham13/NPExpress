import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminConfigRouter from "./admin-config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminConfigRouter);

export default router;
