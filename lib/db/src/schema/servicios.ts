import { boolean, numeric, pgTable, serial, text } from "drizzle-orm/pg-core";

export const serviciosTable = pgTable("servicios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  precio: numeric("precio", { precision: 10, scale: 2 }).notNull(),
  unidad: text("unidad").notNull(),
  activo: boolean("activo").notNull().default(true),
});

export type Servicio = typeof serviciosTable.$inferSelect;
export type InsertServicio = typeof serviciosTable.$inferInsert;
