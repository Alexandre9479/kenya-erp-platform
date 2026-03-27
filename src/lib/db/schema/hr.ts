import { pgTable, text, timestamp, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time", "part_time", "contract", "intern"
]);

export const employees = pgTable("employees", {
  id:               text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:         text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeNumber:   text("employee_number").notNull(),
  firstName:        text("first_name").notNull(),
  lastName:         text("last_name").notNull(),
  email:            text("email"),
  phone:            text("phone"),
  nationalId:       text("national_id"),
  kraPin:           text("kra_pin"),
  nhifNumber:       text("nhif_number"),
  nssfNumber:       text("nssf_number"),
  department:       text("department"),
  jobTitle:         text("job_title"),
  employmentType:   employmentTypeEnum("employment_type").notNull().default("full_time"),
  startDate:        timestamp("start_date").notNull(),
  endDate:          timestamp("end_date"),
  basicSalary:      numeric("basic_salary", { precision: 15, scale: 2 }).notNull().default("0"),
  bankName:         text("bank_name"),
  bankAccount:      text("bank_account"),
  isActive:         boolean("is_active").notNull().default(true),
  avatar:           text("avatar"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export const payrolls = pgTable("payrolls", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:      text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId:    text("employee_id").notNull().references(() => employees.id),
  month:         text("month").notNull(),
  year:          text("year").notNull(),
  basicSalary:   numeric("basic_salary", { precision: 15, scale: 2 }).notNull(),
  allowances:    numeric("allowances", { precision: 15, scale: 2 }).notNull().default("0"),
  deductions:    numeric("deductions", { precision: 15, scale: 2 }).notNull().default("0"),
  paye:          numeric("paye", { precision: 15, scale: 2 }).notNull().default("0"),
  nhif:          numeric("nhif", { precision: 15, scale: 2 }).notNull().default("0"),
  nssf:          numeric("nssf", { precision: 15, scale: 2 }).notNull().default("0"),
  netSalary:     numeric("net_salary", { precision: 15, scale: 2 }).notNull(),
  status:        text("status").notNull().default("draft"),
  paymentDate:   timestamp("payment_date"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const leaveRequests = pgTable("leave_requests", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId:  text("employee_id").notNull().references(() => employees.id),
  leaveType:   text("leave_type").notNull(),
  startDate:   timestamp("start_date").notNull(),
  endDate:     timestamp("end_date").notNull(),
  days:        numeric("days", { precision: 5, scale: 1 }).notNull(),
  reason:      text("reason"),
  status:      text("status").notNull().default("pending"),
  approvedBy:  text("approved_by"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});