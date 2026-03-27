import { pgTable, text, timestamp, boolean, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";

export const unitEnum = pgEnum("unit_of_measure", [
  "pcs", "kgs", "ltrs", "mtrs", "boxes", "cartons", "dozens", "pairs", "sets", "bags"
]);

export const categories = pgTable("categories", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  description: text("description"),
  parentId:    text("parent_id"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id:               text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:         text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId:       text("category_id").references(() => categories.id),
  name:             text("name").notNull(),
  description:      text("description"),
  sku:              text("sku").notNull(),
  barcode:          text("barcode"),
  unit:             unitEnum("unit").notNull().default("pcs"),
  buyingPrice:      numeric("buying_price", { precision: 15, scale: 2 }).notNull().default("0"),
  sellingPrice:     numeric("selling_price", { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate:          numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("16"),
  currentStock:     numeric("current_stock", { precision: 15, scale: 2 }).notNull().default("0"),
  reorderLevel:     numeric("reorder_level", { precision: 15, scale: 2 }).notNull().default("0"),
  maxStockLevel:    numeric("max_stock_level", { precision: 15, scale: 2 }),
  warehouseLocation: text("warehouse_location"),
  image:            text("image"),
  isActive:         boolean("is_active").notNull().default(true),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:      text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId:     text("product_id").notNull().references(() => products.id),
  type:          text("type").notNull(), // in, out, adjustment, transfer
  quantity:      numeric("quantity", { precision: 15, scale: 2 }).notNull(),
  balanceBefore: numeric("balance_before", { precision: 15, scale: 2 }).notNull(),
  balanceAfter:  numeric("balance_after", { precision: 15, scale: 2 }).notNull(),
  reference:     text("reference"),
  referenceId:   text("reference_id"),
  notes:         text("notes"),
  createdBy:     text("created_by").notNull(),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});