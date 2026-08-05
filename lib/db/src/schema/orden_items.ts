import { numeric, pgTable, serial } from "drizzle-orm/pg-core";
import { ordenesTable } from "./ordenes";
import { serviciosTable } from "./servicios";

export const ordenItemsTable = pgTable("orden_items", {
  id: serial("id").primaryKey(),
  ordenId: serial("orden_id")
    .notNull()
    .references(() => ordenesTable.id, { onDelete: "cascade" }),
  servicioId: serial("servicio_id")
    .notNull()
    .references(() => serviciosTable.id),
  cantidad: numeric("cantidad", { precision: 10, scale: 2 }).notNull(),
  precioUnitario: numeric("precio_unitario", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export type OrdenItem = typeof ordenItemsTable.$inferSelect;
export type InsertOrdenItem = typeof ordenItemsTable.$inferInsert;
