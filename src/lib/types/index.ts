export type { UserRole, InvoiceStatus, AccountType, Tables, TablesInsert, TablesUpdate } from "./supabase";

// ─── Session & Auth ──────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: import("./supabase").UserRole;
  tenantId: string | null;
  tenantName: string | null;
  tenantLogo: string | null;
}

// ─── Generic API Response ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  pendingInvoicesAmount: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingLPOs: number;
  totalEmployees: number;
  revenueChange: number;   // percentage vs last period
  expensesChange: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ActivityItem {
  id: string;
  type: "invoice" | "payment" | "stock" | "lpo" | "employee" | "expense";
  title: string;
  description: string;
  amount?: number;
  createdAt: string;
  userFullName: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface ProductWithStock {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  vat_rate: number;
  reorder_level: number;
  total_stock: number;
  is_active: boolean;
  image_url: string | null;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  type: "in" | "out" | "transfer" | "adjustment";
  quantity: number;
  reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  id?: string;
  product_id: string;
  product_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
}

export interface InvoiceWithCustomer {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  issue_date: string;
  due_date: string;
  status: import("./supabase").InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface PayrollResult {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  grossSalary: number;
  paye: number;
  nhif: number;
  nssf: number;
  totalDeductions: number;
  netPay: number;
  breakdown: {
    payeTaxBands: Array<{ band: string; taxable: number; rate: number; tax: number }>;
    nssfTierI: number;
    nssfTierII: number;
  };
}

// ─── Accounting ───────────────────────────────────────────────────────────────

export interface JournalEntryLine {
  account_id: string;
  account_name: string;
  account_code: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface ProfitLossReport {
  period: { from: string; to: string };
  revenue: Array<{ account: string; amount: number }>;
  totalRevenue: number;
  expenses: Array<{ account: string; amount: number }>;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

// ─── Tenant ────────────────────────────────────────────────────────────────────

export interface TenantSettings {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  kra_pin: string | null;
  logo_url: string | null;
  primary_color: string;
  currency: string;
  timezone: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_branch: string | null;
  invoice_prefix: string;
  quote_prefix: string;
  lpo_prefix: string;
  terms_and_conditions: string | null;
}
