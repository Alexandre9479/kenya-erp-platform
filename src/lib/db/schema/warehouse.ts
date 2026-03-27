import { pgTable, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { products } from "./inventory";
import { users } from "./users";

export const warehouses = pgTable("warehouses", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  location:    text("location"),
  description: text("description"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const stockTransfers = pgTable("stock_transfers", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:      text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  transferNumber: text("transfer_number").notNull(),
  fromWarehouse: text("from_warehouse").references(() => warehouses.id),
  toWarehouse:   text("to_warehouse").references(() => warehouses.id),
  productId:     text("product_id").notNull().references(() => products.id),
  quantity:      numeric("quantity", { precision: 15, scale: 2 }).notNull(),
  status:        text("status").notNull().default("pending"),
  notes:         text("notes"),
  createdBy:     text("created_by").notNull().references(() => users.id),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});