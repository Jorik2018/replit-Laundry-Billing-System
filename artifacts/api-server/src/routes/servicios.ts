import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, serviciosTable } from "@workspace/db";
import {
  CreateServicioBody,
  UpdateServicioBody,
  UpdateServicioParams,
  DeleteServicioParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeServicio(s: typeof serviciosTable.$inferSelect) {
  return {
    id: s.id,
    nombre: s.nombre,
    descripcion: s.descripcion ?? null,
    precio: Number(s.precio),
    unidad: s.unidad,
    activo: s.activo,
  };
}

router.get("/servicios", async (_req, res): Promise<void> => {
  const rows = await db.select().from(serviciosTable).orderBy(serviciosTable.id);
  res.json(rows.map(serializeServicio));
});

router.post("/servicios", async (req, res): Promise<void> => {
  const parsed = CreateServicioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [servicio] = await db
    .insert(serviciosTable)
    .values({
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion ?? null,
      precio: String(parsed.data.precio),
      unidad: parsed.data.unidad,
      activo: parsed.data.activo ?? true,
    })
    .returning();
  res.status(201).json(serializeServicio(servicio!));
});

router.patch("/servicios/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsParsed = UpdateServicioParams.safeParse({ id: Number(rawId) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const bodyParsed = UpdateServicioBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const updates: Partial<typeof serviciosTable.$inferInsert> = {};
  const d = bodyParsed.data;
  if (d.nombre !== undefined) updates.nombre = d.nombre;
  if (d.descripcion !== undefined) updates.descripcion = d.descripcion ?? null;
  if (d.precio !== undefined) updates.precio = String(d.precio);
  if (d.unidad !== undefined) updates.unidad = d.unidad;
  if (d.activo !== undefined) updates.activo = d.activo;

  const [servicio] = await db
    .update(serviciosTable)
    .set(updates)
    .where(eq(serviciosTable.id, paramsParsed.data.id))
    .returning();
  if (!servicio) {
    res.status(404).json({ error: "Servicio no encontrado" });
    return;
  }
  res.json(serializeServicio(servicio));
});

router.delete("/servicios/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteServicioParams.safeParse({ id: Number(rawId) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(serviciosTable).where(eq(serviciosTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
