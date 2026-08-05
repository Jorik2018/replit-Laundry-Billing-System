import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { ordenesTable } from "./ordenes";

export const facturasTable = pgTable("facturas", {
  id: serial("id").primaryKey(),
  ordenId: serial("orden_id")
    .notNull()
    .references(() => ordenesTable.id),
  numeroFactura: text("numero_factura").notNull().unique(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  estadoPago: text("estado_pago").notNull().default("pendiente"),
  metodoPago: text("metodo_pago"),
  fechaPago: timestamp("fecha_pago", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Factura = typeof facturasTable.$inferSelect;
export type InsertFactura = typeof facturasTable.$inferInsert;
