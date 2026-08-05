import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, clientesTable, ordenesTable } from "@workspace/db";
import {
  CreateClienteBody,
  UpdateClienteBody,
  GetClienteParams,
  UpdateClienteParams,
  DeleteClienteParams,
  GetClienteHistorialParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clientes", async (req, res): Promise<void> => {
  const search = req.query["search"] as string | undefined;

  let rows;
  if (search) {
    rows = await db
      .select()
      .from(clientesTable)
      .where(
        or(
          ilike(clientesTable.nombre, `%${search}%`),
          ilike(clientesTable.apellido, `%${search}%`),
          ilike(clientesTable.telefono, `%${search}%`),
          ilike(clientesTable.email, `%${search}%`),
        ),
      )
      .orderBy(clientesTable.createdAt);
  } else {
    rows = await db.select().from(clientesTable).orderBy(clientesTable.createdAt);
  }

  const result = rows.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido ?? null,
    telefono: c.telefono,
    email: c.email ?? null,
    direccion: c.direccion ?? null,
    notas: c.notas ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
  res.json(result);
});

router.post("/clientes", async (req, res): Promise<void> => {
  const parsed = CreateClienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cliente] = await db
    .insert(clientesTable)
    .values({
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido ?? null,
      telefono: parsed.data.telefono,
      email: parsed.data.email ?? null,
      direccion: parsed.data.direccion ?? null,
      notas: parsed.data.notas ?? null,
    })
    .returning();
  res.status(201).json({
    id: cliente!.id,
    nombre: cliente!.nombre,
    apellido: cliente!.apellido ?? null,
    telefono: cliente!.telefono,
    email: cliente!.email ?? null,
    direccion: cliente!.direccion ?? null,
    notas: cliente!.notas ?? null,
    createdAt: cliente!.createdAt.toISOString(),
  });
});

router.get("/clientes/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetClienteParams.safeParse({ id: Number(rawId) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [cliente] = await db
    .select()
    .from(clientesTable)
    .where(eq(clientesTable.id, parsed.data.id));
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.json({
    id: cliente.id,
    nombre: cliente.nombre,
    apellido: cliente.apellido ?? null,
    telefono: cliente.telefono,
    email: cliente.email ?? null,
    direccion: cliente.direccion ?? null,
    notas: cliente.notas ?? null,
    createdAt: cliente.createdAt.toISOString(),
  });
});

router.patch("/clientes/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsParsed = UpdateClienteParams.safeParse({ id: Number(rawId) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const bodyParsed = UpdateClienteBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const updates: Partial<typeof clientesTable.$inferInsert> = {};
  const d = bodyParsed.data;
  if (d.nombre !== undefined) updates.nombre = d.nombre;
  if (d.apellido !== undefined) updates.apellido = d.apellido ?? null;
  if (d.telefono !== undefined) updates.telefono = d.telefono;
  if (d.email !== undefined) updates.email = d.email ?? null;
  if (d.direccion !== undefined) updates.direccion = d.direccion ?? null;
  if (d.notas !== undefined) updates.notas = d.notas ?? null;

  const [cliente] = await db
    .update(clientesTable)
    .set(updates)
    .where(eq(clientesTable.id, paramsParsed.data.id))
    .returning();
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.json({
    id: cliente.id,
    nombre: cliente.nombre,
    apellido: cliente.apellido ?? null,
    telefono: cliente.telefono,
    email: cliente.email ?? null,
    direccion: cliente.direccion ?? null,
    notas: cliente.notas ?? null,
    createdAt: cliente.createdAt.toISOString(),
  });
});

router.delete("/clientes/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteClienteParams.safeParse({ id: Number(rawId) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(clientesTable).where(eq(clientesTable.id, parsed.data.id));
  res.status(204).send();
});

router.get("/clientes/:id/historial", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetClienteHistorialParams.safeParse({ id: Number(rawId) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const rows = await db
    .select()
    .from(ordenesTable)
    .where(eq(ordenesTable.clienteId, parsed.data.id))
    .orderBy(ordenesTable.createdAt);

  res.json(
    rows.map((o) => ({
      id: o.id,
      clienteId: o.clienteId,
      clienteNombre: null,
      estado: o.estado,
      total: Number(o.total),
      notas: o.notas ?? null,
      fechaEntregaEstimada: o.fechaEntregaEstimada?.toISOString() ?? null,
      fechaEntregaReal: o.fechaEntregaReal?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  );
});

export default router;
