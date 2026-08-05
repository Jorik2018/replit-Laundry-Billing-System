import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const clientesTable = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  apellido: text("apellido"),
  telefono: text("telefono").notNull(),
  email: text("email"),
  direccion: text("direccion"),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Cliente = typeof clientesTable.$inferSelect;
export type InsertCliente = typeof clientesTable.$inferInsert;
