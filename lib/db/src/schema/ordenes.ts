import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { clientesTable } from "./clientes";

export const estadoOrdenEnum = ["pendiente", "en_proceso", "listo", "entregado"] as const;
export type EstadoOrden = (typeof estadoOrdenEnum)[number];

export const ordenesTable = pgTable("ordenes", {
  id: serial("id").primaryKey(),
  clienteId: serial("cliente_id")
    .notNull()
    .references(() => clientesTable.id),
  estado: text("estado").notNull().default("pendiente"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notas: text("notas"),
  fechaEntregaEstimada: timestamp("fecha_entrega_estimada", { withTimezone: true }),
  fechaEntregaReal: timestamp("fecha_entrega_real", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Orden = typeof ordenesTable.$inferSelect;
export type InsertOrden = typeof ordenesTable.$inferInsert;
