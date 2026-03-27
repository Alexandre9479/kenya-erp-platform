import { pgTable, text, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";

export const customerTypeEnum = pgEnum("customer_type", [
  "individual", "company", "government"
]);

export const customers = pgTable("customers", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:       text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  type:           customerTypeEnum("type").notNull().default("company"),
  name:           text("name").notNull(),
  email:          text("email"),
  phone:          text("phone"),
  phone2:         text("phone2"),
  address:        text("address"),
  city:           text("city"),
  country:        text("country").default("Kenya"),
  kraPin:         text("kra_pin"),
  creditLimit:    numeric("credit_limit", { precision: 15, scale: 2 }).default("0"),
  paymentTerms:   text("payment_terms").default("30"),
  notes:          text("notes"),
  isActive:       boolean("is_active").notNull().default(true),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:     text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  email:        text("email"),
  phone:        text("phone"),
  address:      text("address"),
  city:         text("city"),
  country:      text("country").default("Kenya"),
  kraPin:       text("kra_pin"),
  bankDetails:  text("bank_details"),
  paymentTerms: text("payment_terms").default("30"),
  notes:        text("notes"),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});