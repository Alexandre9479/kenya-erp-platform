import { pgTable, text, timestamp, boolean, numeric, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { customers } from "./crm";
import { users } from "./users";

export const docStatusEnum = pgEnum("document_status", [
  "draft", "sent", "approved", "rejected", "paid", "partial", "overdue", "cancelled", "delivered"
]);

export const quotes = pgTable("quotes", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:     text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  quoteNumber:  text("quote_number").notNull(),
  customerId:   text("customer_id").notNull().references(() => customers.id),
  status:       docStatusEnum("status").notNull().default("draft"),
  issueDate:    timestamp("issue_date").notNull().defaultNow(),
  expiryDate:   timestamp("expiry_date"),
  items:        jsonb("items").notNull().default([]),
  subtotal:     numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:    numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discount:     numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  total:        numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  notes:        text("notes"),
  terms:        text("terms"),
  createdBy:    text("created_by").notNull().references(() => users.id),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:       text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber:  text("invoice_number").notNull(),
  quoteId:        text("quote_id").references(() => quotes.id),
  customerId:     text("customer_id").notNull().references(() => customers.id),
  status:         docStatusEnum("status").notNull().default("draft"),
  issueDate:      timestamp("issue_date").notNull().defaultNow(),
  dueDate:        timestamp("due_date"),
  items:          jsonb("items").notNull().default([]),
  subtotal:       numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:      numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discount:       numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  total:          numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  amountPaid:     numeric("amount_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  amountDue:      numeric("amount_due", { precision: 15, scale: 2 }).notNull().default("0"),
  notes:          text("notes"),
  terms:          text("terms"),
  createdBy:      text("created_by").notNull().references(() => users.id),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const deliveryNotes = pgTable("delivery_notes", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:     text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  dnNumber:     text("dn_number").notNull(),
  invoiceId:    text("invoice_id").references(() => invoices.id),
  customerId:   text("customer_id").notNull().references(() => customers.id),
  status:       docStatusEnum("status").notNull().default("draft"),
  deliveryDate: timestamp("delivery_date"),
  items:        jsonb("items").notNull().default([]),
  notes:        text("notes"),
  deliveredBy:  text("delivered_by"),
  receivedBy:   text("received_by"),
  createdBy:    text("created_by").notNull().references(() => users.id),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export const receipts = pgTable("receipts", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:      text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  receiptNumber: text("receipt_number").notNull(),
  invoiceId:     text("invoice_id").references(() => invoices.id),
  customerId:    text("customer_id").notNull().references(() => customers.id),
  amount:        numeric("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentDate:   timestamp("payment_date").notNull().defaultNow(),
  reference:     text("reference"),
  notes:         text("notes"),
  createdBy:     text("created_by").notNull().references(() => users.id),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});