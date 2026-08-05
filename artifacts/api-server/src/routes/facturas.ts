import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  facturasTable,
  ordenesTable,
  ordenItemsTable,
  clientesTable,
  serviciosTable,
} from "@workspace/db";
import {
  CreateFacturaBody,
  PagarFacturaBody,
  PagarFacturaParams,
  GetFacturaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeFactura(f: typeof facturasTable.$inferSelect) {
  return {
    id: f.id,
    ordenId: f.ordenId,
    numeroFactura: f.numeroFactura,
    total: Number(f.total),
    estadoPago: f.estadoPago,
    metodoPago: f.metodoPago ?? null,
    fechaPago: f.fechaPago?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/facturas", async (req, res): Promise<void> => {
  const estadoPago = req.query["estadoPago"] as string | undefined;
  let rows;
  if (estadoPago) {
    rows = await db
      .select()
      .from(facturasTable)
      .where(eq(facturasTable.estadoPago, estadoPago))
      .orderBy(desc(facturasTable.createdAt));
  } else {
    rows = await db.select().from(facturasTable).orderBy(desc(facturasTable.createdAt));
  }
  res.json(rows.map(serializeFactura));
});

router.post("/facturas", async (req, res): Promise<void> => {
  const parsed = CreateFacturaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [orden] = await db
    .select()
    .from(ordenesTable)
    .where(eq(ordenesTable.id, parsed.data.ordenId));
  if (!orden) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  // Check for existing invoice
  const [existing] = await db
    .select()
    .from(facturasTable)
    .where(eq(facturasTable.ordenId, parsed.data.ordenId));
  if (existing) {
    res.status(400).json({ error: "Ya existe una factura para esta orden" });
    return;
  }

  const count = await db.select().from(facturasTable);
  const numero = `FAC-${String(count.length + 1).padStart(5, "0")}`;

  const [factura] = await db
    .insert(facturasTable)
    .values({
      ordenId: parsed.data.ordenId,
      numeroFactura: numero,
      total: orden.total,
      estadoPago: "pendiente",
    })
    .returning();

  res.status(201).json(serializeFactura(factura!));
});

router.get("/facturas/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetFacturaParams.safeParse({ id: Number(rawId) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [factura] = await db
    .select()
    .from(facturasTable)
    .where(eq(facturasTable.id, parsed.data.id));
  if (!factura) {
    res.status(404).json({ error: "Factura no encontrada" });
    return;
  }

  const [ordenRow] = await db
    .select()
    .from(ordenesTable)
    .leftJoin(clientesTable, eq(ordenesTable.clienteId, clientesTable.id))
    .where(eq(ordenesTable.id, factura.ordenId));

  const items = await db
    .select()
    .from(ordenItemsTable)
    .leftJoin(serviciosTable, eq(ordenItemsTable.servicioId, serviciosTable.id))
    .where(eq(ordenItemsTable.ordenId, factura.ordenId));

  const orden = ordenRow
    ? {
        id: ordenRow.ordenes.id,
        clienteId: ordenRow.ordenes.clienteId,
        clienteNombre: ordenRow.clientes
          ? `${ordenRow.clientes.nombre}${ordenRow.clientes.apellido ? " " + ordenRow.clientes.apellido : ""}`
          : null,
        clienteTelefono: ordenRow.clientes?.telefono ?? null,
        estado: ordenRow.ordenes.estado,
        total: Number(ordenRow.ordenes.total),
        notas: ordenRow.ordenes.notas ?? null,
        fechaEntregaEstimada: ordenRow.ordenes.fechaEntregaEstimada?.toISOString() ?? null,
        fechaEntregaReal: ordenRow.ordenes.fechaEntregaReal?.toISOString() ?? null,
        createdAt: ordenRow.ordenes.createdAt.toISOString(),
        items: items.map((item) => ({
          id: item.orden_items.id,
          ordenId: item.orden_items.ordenId,
          servicioId: item.orden_items.servicioId,
          servicioNombre: item.servicios?.nombre ?? null,
          cantidad: Number(item.orden_items.cantidad),
          precioUnitario: Number(item.orden_items.precioUnitario),
          subtotal: Number(item.orden_items.subtotal),
        })),
        factura: serializeFactura(factura),
      }
    : null;

  res.json({
    ...serializeFactura(factura),
    orden,
  });
});

router.patch("/facturas/:id/pagar", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsParsed = PagarFacturaParams.safeParse({ id: Number(rawId) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const bodyParsed = PagarFacturaBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [factura] = await db
    .update(facturasTable)
    .set({
      estadoPago: "pagado",
      metodoPago: bodyParsed.data.metodoPago,
      fechaPago: new Date(),
    })
    .where(eq(facturasTable.id, paramsParsed.data.id))
    .returning();

  if (!factura) {
    res.status(404).json({ error: "Factura no encontrada" });
    return;
  }
  res.json(serializeFactura(factura));
});

export default router;
