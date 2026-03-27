import { pgTable, text, timestamp, numeric, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { suppliers } from "./crm";
import { users } from "./users";

export const lpos = pgTable("lpos", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  lpoNumber:   text("lpo_number").notNull(),
  supplierId:  text("supplier_id").notNull().references(() => suppliers.id),
  status:      text("status").notNull().default("draft"),
  issueDate:   timestamp("issue_date").notNull().defaultNow(),
  deliveryDate: timestamp("delivery_date"),
  items:       jsonb("items").notNull().default([]),
  subtotal:    numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:   numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discount:    numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  total:       numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  notes:       text("notes"),
  terms:       text("terms"),
  createdBy:   text("created_by").notNull().references(() => users.id),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const grns = pgTable("grns", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  grnNumber:   text("grn_number").notNull(),
  lpoId:       text("lpo_id").references(() => lpos.id),
  supplierId:  text("supplier_id").notNull().references(() => suppliers.id),
  status:      text("status").notNull().default("draft"),
  receiptDate: timestamp("receipt_date").notNull().defaultNow(),
  items:       jsonb("items").notNull().default([]),
  notes:       text("notes"),
  createdBy:   text("created_by").notNull().references(() => users.id),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});