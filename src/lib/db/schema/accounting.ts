import { pgTable, text, timestamp, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { users } from "./users";

export const accountTypeEnum = pgEnum("account_type", [
  "asset", "liability", "equity", "revenue", "expense"
]);

export const accounts = pgTable("accounts", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:     text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code:         text("code").notNull(),
  name:         text("name").notNull(),
  type:         accountTypeEnum("type").notNull(),
  parentId:     text("parent_id"),
  description:  text("description"),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  entryNumber: text("entry_number").notNull(),
  date:        timestamp("date").notNull().defaultNow(),
  description: text("description").notNull(),
  reference:   text("reference"),
  referenceId: text("reference_id"),
  createdBy:   text("created_by").notNull().references(() => users.id),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  journalEntryId: text("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId:      text("account_id").notNull().references(() => accounts.id),
  description:    text("description"),
  debit:          numeric("debit", { precision: 15, scale: 2 }).notNull().default("0"),
  credit:         numeric("credit", { precision: 15, scale: 2 }).notNull().default("0"),
});

export const expenses = pgTable("expenses", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  accountId:   text("account_id").references(() => accounts.id),
  date:        timestamp("date").notNull().defaultNow(),
  description: text("description").notNull(),
  amount:      numeric("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("cash"),
  reference:   text("reference"),
  receipt:     text("receipt"),
  createdBy:   text("created_by").notNull().references(() => users.id),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});