import { pgTable, text, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const subscriptionEnum = pgEnum("subscription_status", [
  "trial", "active", "suspended", "cancelled"
]);

export const tenants = pgTable("tenants", {
  id:                   text("id").primaryKey().$defaultFn(() => createId()),
  companyName:          text("company_name").notNull(),
  companyEmail:         text("company_email").notNull().unique(),
  companyPhone:         text("company_phone").notNull(),
  companyAddress:       text("company_address").notNull(),
  companyCity:          text("company_city"),
  companyCountry:       text("company_country").notNull().default("Kenya"),
  companyLogo:          text("company_logo"),
  kraPin:               text("kra_pin"),
  vatNumber:            text("vat_number"),
  currency:             text("currency").notNull().default("KES"),
  currencySymbol:       text("currency_symbol").notNull().default("KSh"),
  timezone:             text("timezone").notNull().default("Africa/Nairobi"),
  fiscalYearStart:      text("fiscal_year_start").notNull().default("01-01"),
  paymentTerms:         text("payment_terms"),
  termsAndConditions:   text("terms_and_conditions"),
  bankDetails:          jsonb("bank_details").default([]),
  invoicePrefix:        text("invoice_prefix").default("INV"),
  quotePrefix:          text("quote_prefix").default("QTE"),
  lpoPrefix:            text("lpo_prefix").default("LPO"),
  grnPrefix:            text("grn_prefix").default("GRN"),
  dnPrefix:             text("dn_prefix").default("DN"),
  receiptPrefix:        text("receipt_prefix").default("RCP"),
  subscription:         subscriptionEnum("subscription").notNull().default("trial"),
  subscriptionExpiry:   timestamp("subscription_expiry"),
  trialEndsAt:          timestamp("trial_ends_at"),
  isActive:             boolean("is_active").notNull().default(true),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
  updatedAt:            timestamp("updated_at").notNull().defaultNow(),
});