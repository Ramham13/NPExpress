import { pgTable, serial, jsonb, timestamp } from "drizzle-orm/pg-core";

export const adminConfigTable = pgTable("admin_config", {
  id: serial("id").primaryKey(),
  sizes: jsonb("sizes").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
