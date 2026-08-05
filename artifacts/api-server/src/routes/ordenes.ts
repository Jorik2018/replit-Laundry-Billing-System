import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, ordenesTable, ordenItemsTable, clientesTable, serviciosTable, facturasTable } from "@workspace/db";
import {
  CreateOrdenBody,
  UpdateOrdenBody,
  UpdateOrdenParams,
  DeleteOrdenParams,
  GetOrdenParams,
  AddOrdenItemBody,
  AddOrdenItemParams,
  DeleteOrdenItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeOrden(
  o: typeof ordenesTable.$inferSelect,
  clienteNombre?: string | null,
  clienteTelefono?: string | null,
) {
  return {
    id: o.id,
    clienteId: o.clienteId,
    clienteNombre: clienteNombre ?? null,
    clienteTelefono: clienteTelefono ?? null,
    estado: o.estado,
    total: Number(o.total),
    notas: o.notas ?? null,
    fechaEntregaEstimada: o.fechaEntregaEstimada?.toISOString() ?? null,
    fechaEntregaReal: o.fechaEntregaReal?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  };
}

function serializeItem(i: typeof ordenItemsTable.$inferSelect, servicioNombre?: string | null) {
  return {
    id: i.id,
    ordenId: i.ordenId,
    servicioId: i.servicioId,
    servicioNombre: servicioNombre ?? null,
    cantidad: Number(i.cantidad),
    precioUnitario: Number(i.precioUnitario),
    subtotal: Number(i.subtotal),
  };
}

router.get("/ordenes/recientes", async (req, res): Promise<void> => {
  const ordenes = await db
    .select()
    .from(ordenesTable)
    .leftJoin(clientesTable, eq(ordenesTable.clienteId, clientesTable.id))
    .orderBy(desc(ordenesTable.createdAt))
    .limit(20);

  const result = [];
  for (const row of ordenes) {
    const items = await db
      .select()
      .from(ordenItemsTable)
      .leftJoin(serviciosTable, eq(ordenItemsTable.servicioId, serviciosTable.id))
      .where(eq(ordenItemsTable.ordenId, row.ordenes.id));

    const [factura] = await db
      .select()
      .from(facturasTable)
      .where(eq(facturasTable.ordenId, row.ordenes.id));

    result.push({
      ...serializeOrden(
        row.ordenes,
        row.clientes
          ? `${row.clientes.nombre}${row.clientes.apellido ? " " + row.clientes.apellido : ""}`
          : null,
        row.clientes?.telefono ?? null,
      ),
      items: items.map((item) => serializeItem(item.orden_items, item.servicios?.nombre ?? null)),
      factura: factura
        ? {
            id: factura.id,
            ordenId: factura.ordenId,
            numeroFactura: factura.numeroFactura,
            total: Number(factura.total),
            estadoPago: factura.estadoPago,
            metodoPago: factura.metodoPago ?? null,
            fechaPago: factura.fechaPago?.toISOString() ?? null,
            createdAt: factura.createdAt.toISOString(),
          }
        : undefined,
    });
  }
  res.json(result);
});

router.get("/ordenes", async (req, res): Promise<void> => {
  const estado = req.query["estado"] as string | undefined;
  const clienteIdRaw = req.query["clienteId"];
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : undefined;

  let query = db
    .select()
    .from(ordenesTable)
    .leftJoin(clientesTable, eq(ordenesTable.clienteId, clientesTable.id))
    .orderBy(desc(ordenesTable.createdAt))
    .$dynamic();

  const conditions = [];
  if (estado) conditions.push(eq(ordenesTable.estado, estado));
  if (clienteId) conditions.push(eq(ordenesTable.clienteId, clienteId));
  if (conditions.length === 1) {
    query = query.where(conditions[0]!);
  } else if (conditions.length > 1) {
    query = query.where(sql`${conditions[0]} AND ${conditions[1]}`);
  }

  const rows = await query;
  res.json(
    rows.map((row) =>
      serializeOrden(
        row.ordenes,
        row.clientes
          ? `${row.clientes.nombre}${row.clientes.apellido ? " " + row.clientes.apellido : ""}`
          : null,
        row.clientes?.telefono ?? null,
      ),
    ),
  );
});

router.post("/ordenes", async (req, res): Promise<void> => {
  const parsed = CreateOrdenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [orden] = await db
    .insert(ordenesTable)
    .values({
      clienteId: parsed.data.clienteId,
      estado: "pendiente",
      total: "0",
      notas: parsed.data.notas ?? null,
      fechaEntregaEstimada: parsed.data.fechaEntregaEstimada
        ? new Date(parsed.data.fechaEntregaEstimada)
        : null,
    })
    .returning();

  let total = 0;
  if (parsed.data.items && parsed.data.items.length > 0) {
    for (const item of parsed.data.items) {
      const [servicio] = await db
        .select()
        .from(serviciosTable)
        .where(eq(serviciosTable.id, item.servicioId));
      if (!servicio) continue;
      const precioUnitario = item.precioUnitario ?? Number(servicio.precio);
      const subtotal = precioUnitario * item.cantidad;
      total += subtotal;
      await db.insert(ordenItemsTable).values({
        ordenId: orden!.id,
        servicioId: item.servicioId,
        cantidad: String(item.cantidad),
        precioUnitario: String(precioUnitario),
        subtotal: String(subtotal),
      });
    }
    await db
      .update(ordenesTable)
      .set({ total: String(total) })
      .where(eq(ordenesTable.id, orden!.id));
  }

  const [updated] = await db.select().from(ordenesTable).where(eq(ordenesTable.id, orden!.id));
  res.status(201).json(serializeOrden(updated!));
});

router.get("/ordenes/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetOrdenParams.safeParse({ id: Number(rawId) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [row] = await db
    .select()
    .from(ordenesTable)
    .leftJoin(clientesTable, eq(ordenesTable.clienteId, clientesTable.id))
    .where(eq(ordenesTable.id, parsed.data.id));

  if (!row) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  const items = await db
    .select()
    .from(ordenItemsTable)
    .leftJoin(serviciosTable, eq(ordenItemsTable.servicioId, serviciosTable.id))
    .where(eq(ordenItemsTable.ordenId, row.ordenes.id));

  const [factura] = await db
    .select()
    .from(facturasTable)
    .where(eq(facturasTable.ordenId, row.ordenes.id));

  res.json({
    ...serializeOrden(
      row.ordenes,
      row.clientes
        ? `${row.clientes.nombre}${row.clientes.apellido ? " " + row.clientes.apellido : ""}`
        : null,
      row.clientes?.telefono ?? null,
    ),
    items: items.map((item) => serializeItem(item.orden_items, item.servicios?.nombre ?? null)),
    factura: factura
      ? {
          id: factura.id,
          ordenId: factura.ordenId,
          numeroFactura: factura.numeroFactura,
          total: Number(factura.total),
          estadoPago: factura.estadoPago,
          metodoPago: factura.metodoPago ?? null,
          fechaPago: factura.fechaPago?.toISOString() ?? null,
          createdAt: factura.createdAt.toISOString(),
        }
      : undefined,
  });
});

router.patch("/ordenes/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsParsed = UpdateOrdenParams.safeParse({ id: Number(rawId) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const bodyParsed = UpdateOrdenBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const updates: Partial<typeof ordenesTable.$inferInsert> = {};
  const d = bodyParsed.data;
  if (d.estado !== undefined) updates.estado = d.estado;
  if (d.notas !== undefined) updates.notas = d.notas ?? null;
  if (d.fechaEntregaEstimada !== undefined)
    updates.fechaEntregaEstimada = d.fechaEntregaEstimada
      ? new Date(d.fechaEntregaEstimada)
      : null;
  if (d.fechaEntregaReal !== undefined)
    updates.fechaEntregaReal = d.fechaEntregaReal ? new Date(d.fechaEntregaReal) : null;

  const [orden] = await db
    .update(ordenesTable)
    .set(updates)
    .where(eq(ordenesTable.id, paramsParsed.data.id))
    .returning();

  if (!orden) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }
  res.json(serializeOrden(orden));
});

router.delete("/ordenes/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteOrdenParams.safeParse({ id: Number(rawId) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(ordenesTable).where(eq(ordenesTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/ordenes/:id/items", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsParsed = AddOrdenItemParams.safeParse({ id: Number(rawId) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const bodyParsed = AddOrdenItemBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [servicio] = await db
    .select()
    .from(serviciosTable)
    .where(eq(serviciosTable.id, bodyParsed.data.servicioId));
  if (!servicio) {
    res.status(404).json({ error: "Servicio no encontrado" });
    return;
  }

  const precioUnitario = bodyParsed.data.precioUnitario ?? Number(servicio.precio);
  const subtotal = precioUnitario * bodyParsed.data.cantidad;

  const [item] = await db
    .insert(ordenItemsTable)
    .values({
      ordenId: paramsParsed.data.id,
      servicioId: bodyParsed.data.servicioId,
      cantidad: String(bodyParsed.data.cantidad),
      precioUnitario: String(precioUnitario),
      subtotal: String(subtotal),
    })
    .returning();

  // recalculate total
  const allItems = await db
    .select()
    .from(ordenItemsTable)
    .where(eq(ordenItemsTable.ordenId, paramsParsed.data.id));
  const newTotal = allItems.reduce((acc, i) => acc + Number(i.subtotal), 0);
  await db
    .update(ordenesTable)
    .set({ total: String(newTotal) })
    .where(eq(ordenesTable.id, paramsParsed.data.id));

  res.status(201).json(serializeItem(item!, servicio.nombre));
});

router.delete("/ordenes/:id/items/:itemId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawItemId = Array.isArray(req.params.itemId)
    ? req.params.itemId[0]
    : req.params.itemId;
  const parsed = DeleteOrdenItemParams.safeParse({
    id: Number(rawId),
    itemId: Number(rawItemId),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  await db.delete(ordenItemsTable).where(eq(ordenItemsTable.id, parsed.data.itemId));

  const allItems = await db
    .select()
    .from(ordenItemsTable)
    .where(eq(ordenItemsTable.ordenId, parsed.data.id));
  const newTotal = allItems.reduce((acc, i) => acc + Number(i.subtotal), 0);
  await db
    .update(ordenesTable)
    .set({ total: String(newTotal) })
    .where(eq(ordenesTable.id, parsed.data.id));

  res.status(204).send();
});

export default router;
