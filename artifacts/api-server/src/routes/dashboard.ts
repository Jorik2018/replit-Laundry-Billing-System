import { Router, type IRouter } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, ordenesTable, clientesTable, facturasTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/resumen", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    ordenesHoyRes,
    ordenesPendientesRes,
    ordenesEnProcesoRes,
    ordenesListasRes,
    ingresosHoyRes,
    ingresosMesRes,
    clientesTotalesRes,
    facturasPendientesRes,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(ordenesTable)
      .where(sql`${ordenesTable.createdAt} >= ${startOfDay}`),
    db
      .select({ count: count() })
      .from(ordenesTable)
      .where(eq(ordenesTable.estado, "pendiente")),
    db
      .select({ count: count() })
      .from(ordenesTable)
      .where(eq(ordenesTable.estado, "en_proceso")),
    db
      .select({ count: count() })
      .from(ordenesTable)
      .where(eq(ordenesTable.estado, "listo")),
    db
      .select({ total: sql<string>`COALESCE(SUM(total), 0)` })
      .from(facturasTable)
      .where(
        sql`${facturasTable.estadoPago} = 'pagado' AND ${facturasTable.fechaPago} >= ${startOfDay}`,
      ),
    db
      .select({ total: sql<string>`COALESCE(SUM(total), 0)` })
      .from(facturasTable)
      .where(
        sql`${facturasTable.estadoPago} = 'pagado' AND ${facturasTable.fechaPago} >= ${startOfMonth}`,
      ),
    db.select({ count: count() }).from(clientesTable),
    db
      .select({
        count: count(),
        monto: sql<string>`COALESCE(SUM(total), 0)`,
      })
      .from(facturasTable)
      .where(eq(facturasTable.estadoPago, "pendiente")),
  ]);

  res.json({
    ordenesHoy: ordenesHoyRes[0]?.count ?? 0,
    ordenesPendientes: ordenesPendientesRes[0]?.count ?? 0,
    ordenesEnProceso: ordenesEnProcesoRes[0]?.count ?? 0,
    ordenesListas: ordenesListasRes[0]?.count ?? 0,
    ingresosHoy: Number(ingresosHoyRes[0]?.total ?? 0),
    ingresosMes: Number(ingresosMesRes[0]?.total ?? 0),
    clientesTotales: clientesTotalesRes[0]?.count ?? 0,
    facturasPendientes: facturasPendientesRes[0]?.count ?? 0,
    facturasPendientesMonto: Number(facturasPendientesRes[0]?.monto ?? 0),
  });
});

export default router;
