import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";

export const roleEnum = pgEnum("user_role", [
  "super_admin",
  "tenant_admin",
  "accountant",
  "sales",
  "purchasing",
  "warehouse",
  "hr",
  "viewer",
]);

export const users = pgTable("users", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:     text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  firstName:    text("first_name").notNull(),
  lastName:     text("last_name").notNull(),
  email:        text("email").notNull().unique(),
  password:     text("password").notNull(),
  role:         roleEnum("role").notNull().default("viewer"),
  department:   text("department"),
  phone:        text("phone"),
  avatar:       text("avatar"),
  isActive:     boolean("is_active").notNull().default(true),
  lastLogin:    timestamp("last_login"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});