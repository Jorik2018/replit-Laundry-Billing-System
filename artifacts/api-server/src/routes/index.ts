import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientesRouter from "./clientes";
import serviciosRouter from "./servicios";
import ordenesRouter from "./ordenes";
import facturasRouter from "./facturas";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientesRouter);
router.use(serviciosRouter);
router.use(ordenesRouter);
router.use(facturasRouter);
router.use(dashboardRouter);

export default router;
