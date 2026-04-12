-- ============================================================
-- Kenya ERP Platform — Complete Database Schema
-- Phase 3: Paste this ENTIRE script into
--   Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ─── PART 1: Extensions ──────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PART 2: Enums ───────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin', 'tenant_admin', 'accountant',
    'sales', 'purchasing', 'warehouse', 'hr', 'viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM (
    'draft', 'sent', 'accepted', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE po_status AS ENUM (
    'draft', 'sent', 'partial', 'received', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM (
    'annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payroll_status AS ENUM (
    'draft', 'approved', 'paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM (
    'in', 'out', 'transfer_in', 'transfer_out', 'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash', 'mpesa', 'bank_transfer', 'cheque', 'card'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM (
    'permanent', 'contract', 'casual', 'intern'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── PART 3: updated_at Trigger Function ──────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── PART 4: Core Tables ─────────────────────────────────────────────────────

-- Tenants (Companies)
CREATE TABLE IF NOT EXISTS tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  email               TEXT NOT NULL,
  phone               TEXT,
  address             TEXT,
  city                TEXT,
  country             TEXT NOT NULL DEFAULT 'Kenya',
  kra_pin             TEXT,
  logo_url            TEXT,
  primary_color       TEXT NOT NULL DEFAULT '#3b82f6',
  currency            TEXT NOT NULL DEFAULT 'KES',
  timezone            TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  subscription_plan   TEXT NOT NULL DEFAULT 'trial',
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at       TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  -- Bank details
  bank_name           TEXT,
  bank_account        TEXT,
  bank_branch         TEXT,
  -- Document prefixes
  invoice_prefix      TEXT NOT NULL DEFAULT 'INV',
  quote_prefix        TEXT NOT NULL DEFAULT 'QUO',
  lpo_prefix          TEXT NOT NULL DEFAULT 'LPO',
  grn_prefix          TEXT NOT NULL DEFAULT 'GRN',
  receipt_prefix      TEXT NOT NULL DEFAULT 'REC',
  dn_prefix           TEXT NOT NULL DEFAULT 'DN',
  -- Legal
  terms_and_conditions TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'viewer',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  phone           TEXT,
  avatar_url      TEXT,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT super_admin_no_tenant CHECK (
    role != 'super_admin' OR tenant_id IS NULL
  )
);

-- Document sequences (auto-incrementing per tenant per doc type)
CREATE TABLE IF NOT EXISTS document_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, doc_type)
);

-- ─── PART 5: Inventory Tables ────────────────────────────────────────────────

-- Product Categories
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  location    TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku           TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  unit          TEXT NOT NULL DEFAULT 'pcs',
  cost_price    NUMERIC(15,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_rate      NUMERIC(5,2) NOT NULL DEFAULT 16,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  image_url     TEXT,
  barcode       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

-- Stock Levels (per product per warehouse)
CREATE TABLE IF NOT EXISTS stock_levels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity      NUMERIC(15,4) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

-- Stock Movements (audit trail)
CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  type            stock_movement_type NOT NULL,
  quantity        NUMERIC(15,4) NOT NULL,
  unit_cost       NUMERIC(15,2),
  reference_type  TEXT,
  reference_id    UUID,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity          NUMERIC(15,4) NOT NULL,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'completed',
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Counts (physical count/adjustment)
CREATE TABLE IF NOT EXISTS stock_counts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id      UUID NOT NULL REFERENCES warehouses(id),
  product_id        UUID NOT NULL REFERENCES products(id),
  expected_quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
  actual_quantity   NUMERIC(15,4) NOT NULL,
  variance          NUMERIC(15,4) GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PART 6: CRM Tables ──────────────────────────────────────────────────────

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  kra_pin         TEXT,
  credit_limit    NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  kra_pin         TEXT,
  payment_terms   INTEGER NOT NULL DEFAULT 30,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PART 7: Sales Tables ────────────────────────────────────────────────────

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number    TEXT NOT NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     DATE NOT NULL,
  status          quote_status NOT NULL DEFAULT 'draft',
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  terms           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, quote_number)
);

-- Quote Line Items
CREATE TABLE IF NOT EXISTS quote_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity    NUMERIC(15,4) NOT NULL,
  unit_price  NUMERIC(15,2) NOT NULL,
  vat_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(15,2) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  quote_id        UUID REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  status          invoice_status NOT NULL DEFAULT 'draft',
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  terms           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity    NUMERIC(15,4) NOT NULL,
  unit_price  NUMERIC(15,2) NOT NULL,
  vat_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(15,2) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Delivery Notes
CREATE TABLE IF NOT EXISTS delivery_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dn_number      TEXT NOT NULL,
  invoice_id     UUID NOT NULL REFERENCES invoices(id),
  issue_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  delivered_date DATE,
  status         TEXT NOT NULL DEFAULT 'pending',
  driver_name    TEXT,
  vehicle_reg    TEXT,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, dn_number)
);

-- Receipts (Payment receipts)
CREATE TABLE IF NOT EXISTS receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_number  TEXT NOT NULL,
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  amount          NUMERIC(15,2) NOT NULL,
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  reference       TEXT,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, receipt_number)
);

-- ─── PART 8: Purchasing Tables ───────────────────────────────────────────────

-- Purchase Orders (LPOs)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lpo_number      TEXT NOT NULL,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  status          po_status NOT NULL DEFAULT 'draft',
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  terms           TEXT,
  approved_by     UUID REFERENCES users(id),
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, lpo_number)
);

-- LPO Line Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_id       UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity    NUMERIC(15,4) NOT NULL,
  unit_price  NUMERIC(15,2) NOT NULL,
  vat_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(15,2) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Goods Received Notes (GRNs)
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grn_number    TEXT NOT NULL,
  po_id         UUID NOT NULL REFERENCES purchase_orders(id),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'complete',
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, grn_number)
);

-- GRN Line Items
CREATE TABLE IF NOT EXISTS grn_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grn_id             UUID NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id),
  quantity_ordered   NUMERIC(15,4) NOT NULL DEFAULT 0,
  quantity_received  NUMERIC(15,4) NOT NULL,
  unit_price         NUMERIC(15,2) NOT NULL,
  notes              TEXT
);

-- ─── PART 9: Accounting Tables ───────────────────────────────────────────────

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        account_type NOT NULL,
  sub_type    TEXT,
  parent_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Journal Entries (double-entry bookkeeping)
CREATE TABLE IF NOT EXISTS journal_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_number   TEXT NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  description    TEXT NOT NULL,
  entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  is_posted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, entry_number)
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id    UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES accounts(id),
  debit       NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit      NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  CONSTRAINT debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expense_number  TEXT NOT NULL,
  account_id      UUID REFERENCES accounts(id),
  category        TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  description     TEXT NOT NULL,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  receipt_url     TEXT,
  reference       TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, expense_number)
);

-- ─── PART 10: HR & Payroll Tables ────────────────────────────────────────────

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_number  TEXT NOT NULL,
  full_name        TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  id_number        TEXT,
  kra_pin          TEXT,
  nssf_number      TEXT,
  nhif_number      TEXT,
  department       TEXT,
  designation      TEXT,
  employment_type  employment_type NOT NULL DEFAULT 'permanent',
  basic_salary     NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances       JSONB NOT NULL DEFAULT '{}',
  hire_date        DATE NOT NULL,
  termination_date DATE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  bank_name        TEXT,
  bank_account     TEXT,
  bank_branch      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, employee_number)
);

-- Payroll Runs (monthly)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_month      INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year       INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  status            payroll_status NOT NULL DEFAULT 'draft',
  total_gross       NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_deductions  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_net         NUMERIC(15,2) NOT NULL DEFAULT 0,
  processed_by      UUID NOT NULL REFERENCES users(id),
  approved_by       UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, period_month, period_year)
);

-- Payroll Entries (per employee per run)
CREATE TABLE IF NOT EXISTS payroll_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id            UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES employees(id),
  basic_salary      NUMERIC(15,2) NOT NULL,
  allowances        NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_salary      NUMERIC(15,2) NOT NULL,
  paye              NUMERIC(15,2) NOT NULL DEFAULT 0,
  nhif              NUMERIC(15,2) NOT NULL DEFAULT 0,
  nssf              NUMERIC(15,2) NOT NULL DEFAULT 0,
  other_deductions  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_deductions  NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_pay           NUMERIC(15,2) NOT NULL,
  breakdown         JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id),
  leave_type      leave_type NOT NULL DEFAULT 'annual',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  days_requested  INTEGER NOT NULL,
  reason          TEXT,
  status          leave_status NOT NULL DEFAULT 'pending',
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PART 11: Activity Log ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  description  TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PART 12: Triggers (updated_at) ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_updated_at_trigger(tbl TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    DROP TRIGGER IF EXISTS trg_updated_at ON %I;
    CREATE TRIGGER trg_updated_at
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  ', tbl, tbl);
END;
$$ LANGUAGE plpgsql;

SELECT create_updated_at_trigger('tenants');
SELECT create_updated_at_trigger('users');
SELECT create_updated_at_trigger('products');
SELECT create_updated_at_trigger('customers');
SELECT create_updated_at_trigger('suppliers');
SELECT create_updated_at_trigger('quotes');
SELECT create_updated_at_trigger('invoices');
SELECT create_updated_at_trigger('purchase_orders');
SELECT create_updated_at_trigger('employees');
SELECT create_updated_at_trigger('payroll_runs');
SELECT create_updated_at_trigger('leave_requests');

-- ─── PART 13: Document Sequence Function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION next_doc_number(p_tenant_id UUID, p_doc_type TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_number INTEGER;
BEGIN
  INSERT INTO document_sequences (tenant_id, doc_type, last_number)
  VALUES (p_tenant_id, p_doc_type, 1)
  ON CONFLICT (tenant_id, doc_type) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_number;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ─── PART 14: Row Level Security ─────────────────────────────────────────────
-- Strategy: All DB access goes through Next.js API routes using the
-- SERVICE_ROLE key which bypasses RLS automatically.
-- RLS is enabled as a safety net — anon/authenticated direct access is denied.

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log         ENABLE ROW LEVEL SECURITY;

-- ─── PART 15: Indexes ────────────────────────────────────────────────────────

-- Users
CREATE INDEX IF NOT EXISTS idx_users_tenant    ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users(role);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_tenant   ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Stock
CREATE INDEX IF NOT EXISTS idx_stock_levels_product   ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(tenant_id, product_id);

-- Customers & Suppliers
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant   ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date     ON invoices(issue_date);

-- Quotes
CREATE INDEX IF NOT EXISTS idx_quotes_tenant   ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);

-- Purchase Orders
CREATE INDEX IF NOT EXISTS idx_po_tenant   ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);

-- Accounting
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_je_tenant_date  ON journal_entries(tenant_id, entry_date);

-- HR
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON payroll_runs(tenant_id, period_year, period_month);

-- Activity Log
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id, created_at DESC);

-- ─── PART 16: Seed Function — Chart of Accounts ──────────────────────────────

CREATE OR REPLACE FUNCTION seed_chart_of_accounts(p_tenant_id UUID)
RETURNS void AS $$
DECLARE
  -- Parent account IDs
  v_assets       UUID;
  v_curr_assets  UUID;
  v_fixed_assets UUID;
  v_liabilities  UUID;
  v_curr_liab    UUID;
  v_lt_liab      UUID;
  v_equity       UUID;
  v_revenue      UUID;
  v_expenses     UUID;
  v_opex         UUID;
BEGIN
  -- Assets (1000)
  INSERT INTO accounts (tenant_id, code, name, type, sub_type, is_system)
  VALUES (p_tenant_id, '1000', 'Assets', 'asset', 'group', TRUE)
  RETURNING id INTO v_assets;

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system)
    VALUES (p_tenant_id, '1100', 'Current Assets', 'asset', 'group', v_assets, TRUE)
    RETURNING id INTO v_curr_assets;

      INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system) VALUES
        (p_tenant_id, '1110', 'Cash on Hand',         'asset', 'cash',             v_curr_assets, TRUE),
        (p_tenant_id, '1120', 'Bank Account',          'asset', 'bank',             v_curr_assets, TRUE),
        (p_tenant_id, '1130', 'M-Pesa Float',          'asset', 'cash',             v_curr_assets, FALSE),
        (p_tenant_id, '1140', 'Accounts Receivable',   'asset', 'receivable',       v_curr_assets, TRUE),
        (p_tenant_id, '1150', 'Inventory',             'asset', 'inventory',        v_curr_assets, TRUE),
        (p_tenant_id, '1160', 'Prepaid Expenses',      'asset', 'prepaid',          v_curr_assets, FALSE),
        (p_tenant_id, '1170', 'VAT Receivable',        'asset', 'tax',              v_curr_assets, FALSE);

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system)
    VALUES (p_tenant_id, '1200', 'Fixed Assets', 'asset', 'group', v_assets, TRUE)
    RETURNING id INTO v_fixed_assets;

      INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system) VALUES
        (p_tenant_id, '1210', 'Property & Equipment',   'asset', 'fixed_asset',   v_fixed_assets, FALSE),
        (p_tenant_id, '1220', 'Motor Vehicles',         'asset', 'fixed_asset',   v_fixed_assets, FALSE),
        (p_tenant_id, '1230', 'Furniture & Fittings',   'asset', 'fixed_asset',   v_fixed_assets, FALSE),
        (p_tenant_id, '1240', 'Computer Equipment',     'asset', 'fixed_asset',   v_fixed_assets, FALSE),
        (p_tenant_id, '1290', 'Accum. Depreciation',   'asset', 'depreciation',  v_fixed_assets, FALSE);

  -- Liabilities (2000)
  INSERT INTO accounts (tenant_id, code, name, type, sub_type, is_system)
  VALUES (p_tenant_id, '2000', 'Liabilities', 'liability', 'group', TRUE)
  RETURNING id INTO v_liabilities;

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system)
    VALUES (p_tenant_id, '2100', 'Current Liabilities', 'liability', 'group', v_liabilities, TRUE)
    RETURNING id INTO v_curr_liab;

      INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system) VALUES
        (p_tenant_id, '2110', 'Accounts Payable',    'liability', 'payable',    v_curr_liab, TRUE),
        (p_tenant_id, '2120', 'VAT Payable',          'liability', 'tax',        v_curr_liab, TRUE),
        (p_tenant_id, '2130', 'PAYE Payable',         'liability', 'tax',        v_curr_liab, TRUE),
        (p_tenant_id, '2140', 'NHIF/SHIF Payable',   'liability', 'tax',        v_curr_liab, TRUE),
        (p_tenant_id, '2150', 'NSSF Payable',        'liability', 'tax',        v_curr_liab, TRUE),
        (p_tenant_id, '2160', 'Accrued Salaries',    'liability', 'accrued',    v_curr_liab, FALSE),
        (p_tenant_id, '2170', 'Accrued Expenses',    'liability', 'accrued',    v_curr_liab, FALSE),
        (p_tenant_id, '2180', 'Customer Deposits',   'liability', 'deposit',    v_curr_liab, FALSE);

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system)
    VALUES (p_tenant_id, '2200', 'Long-Term Liabilities', 'liability', 'group', v_liabilities, FALSE)
    RETURNING id INTO v_lt_liab;

      INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system) VALUES
        (p_tenant_id, '2210', 'Bank Loan',           'liability', 'loan',       v_lt_liab, FALSE),
        (p_tenant_id, '2220', 'Hire Purchase',        'liability', 'loan',       v_lt_liab, FALSE);

  -- Equity (3000)
  INSERT INTO accounts (tenant_id, code, name, type, sub_type, is_system)
  VALUES (p_tenant_id, '3000', 'Equity', 'equity', 'group', TRUE)
  RETURNING id INTO v_equity;

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system) VALUES
      (p_tenant_id, '3100', 'Owner''s Capital',    'equity', 'capital',   v_equity, FALSE),
      (p_tenant_id, '3200', 'Retained Earnings',  'equity', 'retained',  v_equity, TRUE),
      (p_tenant_id, '3300', 'Drawings',            'equity', 'drawings',  v_equity, FALSE);

  -- Revenue (4000)
  INSERT INTO accounts (tenant_id, code, name, type, sub_type, is_system)
  VALUES (p_tenant_id, '4000', 'Revenue', 'revenue', 'group', TRUE)
  RETURNING id INTO v_revenue;

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system) VALUES
      (p_tenant_id, '4100', 'Sales Revenue',       'revenue', 'sales',     v_revenue, TRUE),
      (p_tenant_id, '4200', 'Service Revenue',     'revenue', 'service',   v_revenue, FALSE),
      (p_tenant_id, '4300', 'Other Income',        'revenue', 'other',     v_revenue, FALSE),
      (p_tenant_id, '4400', 'Interest Income',     'revenue', 'interest',  v_revenue, FALSE),
      (p_tenant_id, '4900', 'Sales Returns',       'revenue', 'contra',    v_revenue, FALSE);

  -- Expenses (5000)
  INSERT INTO accounts (tenant_id, code, name, type, sub_type, is_system)
  VALUES (p_tenant_id, '5000', 'Expenses', 'expense', 'group', TRUE)
  RETURNING id INTO v_expenses;

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system)
    VALUES (p_tenant_id, '5100', 'Cost of Goods Sold', 'expense', 'cogs', v_expenses, TRUE);

    INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system)
    VALUES (p_tenant_id, '5200', 'Operating Expenses', 'expense', 'group', v_expenses, TRUE)
    RETURNING id INTO v_opex;

      INSERT INTO accounts (tenant_id, code, name, type, sub_type, parent_id, is_system) VALUES
        (p_tenant_id, '5210', 'Salaries & Wages',     'expense', 'payroll',     v_opex, TRUE),
        (p_tenant_id, '5211', 'NSSF Contribution',   'expense', 'payroll',     v_opex, TRUE),
        (p_tenant_id, '5212', 'NHIF/SHIF Contribution','expense','payroll',     v_opex, TRUE),
        (p_tenant_id, '5220', 'Rent & Rates',         'expense', 'rent',        v_opex, FALSE),
        (p_tenant_id, '5230', 'Electricity & Water',  'expense', 'utilities',   v_opex, FALSE),
        (p_tenant_id, '5240', 'Internet & Telephone', 'expense', 'utilities',   v_opex, FALSE),
        (p_tenant_id, '5250', 'Depreciation',         'expense', 'depreciation',v_opex, FALSE),
        (p_tenant_id, '5260', 'Marketing & Advertising','expense','marketing',  v_opex, FALSE),
        (p_tenant_id, '5270', 'Office Supplies',      'expense', 'admin',       v_opex, FALSE),
        (p_tenant_id, '5280', 'Transport & Fuel',     'expense', 'transport',   v_opex, FALSE),
        (p_tenant_id, '5290', 'Bank Charges',         'expense', 'finance',     v_opex, FALSE),
        (p_tenant_id, '5300', 'Insurance',            'expense', 'admin',       v_opex, FALSE),
        (p_tenant_id, '5310', 'Repairs & Maintenance','expense', 'admin',       v_opex, FALSE),
        (p_tenant_id, '5320', 'Professional Fees',   'expense', 'admin',       v_opex, FALSE),
        (p_tenant_id, '5330', 'Miscellaneous',        'expense', 'other',       v_opex, FALSE),
        (p_tenant_id, '5400', 'Interest Expense',     'expense', 'finance',     v_expenses, FALSE),
        (p_tenant_id, '5500', 'Tax Expense',          'expense', 'tax',         v_expenses, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ─── PART 17: Company Registration Function ───────────────────────────────────
-- Called from Phase 4 registration API route.

CREATE OR REPLACE FUNCTION register_company(
  p_company_name   TEXT,
  p_company_email  TEXT,
  p_company_phone  TEXT,
  p_admin_name     TEXT,
  p_admin_email    TEXT,
  p_password_hash  TEXT,
  p_country        TEXT DEFAULT 'Kenya',
  p_kra_pin        TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id    UUID;
  v_user_id      UUID;
  v_slug         TEXT;
  v_trial_end    TIMESTAMPTZ;
BEGIN
  -- Generate slug from company name
  v_slug := lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  -- Handle slug collisions by appending random suffix
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;

  v_trial_end := NOW() + INTERVAL '30 days';

  -- Create tenant
  INSERT INTO tenants (
    name, slug, email, phone, country, kra_pin,
    subscription_plan, subscription_status, trial_ends_at
  ) VALUES (
    p_company_name, v_slug, p_company_email, p_company_phone,
    p_country, p_kra_pin, 'trial', 'trial', v_trial_end
  ) RETURNING id INTO v_tenant_id;

  -- Create tenant admin user
  INSERT INTO users (
    tenant_id, email, password_hash, full_name, role
  ) VALUES (
    v_tenant_id, lower(p_admin_email), p_password_hash, p_admin_name, 'tenant_admin'
  ) RETURNING id INTO v_user_id;

  -- Seed chart of accounts
  PERFORM seed_chart_of_accounts(v_tenant_id);

  -- Create default warehouse
  INSERT INTO warehouses (tenant_id, name, is_default, is_active)
  VALUES (v_tenant_id, 'Main Warehouse', TRUE, TRUE);

  -- Initialize document sequences
  INSERT INTO document_sequences (tenant_id, doc_type, last_number) VALUES
    (v_tenant_id, 'invoice',   0),
    (v_tenant_id, 'quote',     0),
    (v_tenant_id, 'lpo',       0),
    (v_tenant_id, 'grn',       0),
    (v_tenant_id, 'receipt',   0),
    (v_tenant_id, 'dn',        0),
    (v_tenant_id, 'expense',   0),
    (v_tenant_id, 'journal',   0);

  -- Log registration
  INSERT INTO activity_log (tenant_id, user_id, action, entity_type, entity_id, description)
  VALUES (v_tenant_id, v_user_id, 'register', 'tenant', v_tenant_id, 'Company registered');

  RETURN jsonb_build_object(
    'tenant_id',  v_tenant_id,
    'user_id',    v_user_id,
    'slug',       v_slug,
    'trial_ends', v_trial_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── PART 18: Super Admin User ───────────────────────────────────────────────
-- Run AFTER creating the schema.
-- Replace the password hash below — see instructions at the bottom of this file.

INSERT INTO users (email, password_hash, full_name, role, tenant_id, is_active)
VALUES (
  'admin@erp.local',
  '$2b$12$placeholder_replace_this_hash_after_running_node_script',
  'Super Admin',
  'super_admin',
  NULL,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ─── PART 19: Expenses Table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expense_number  TEXT NOT NULL,
  title           TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category        TEXT,
  date            DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  receipt_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS expenses_number_tenant_idx ON expenses (tenant_id, expense_number);
CREATE INDEX IF NOT EXISTS expenses_tenant_date_idx ON expenses (tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_tenant_status_idx ON expenses (tenant_id, status);

-- Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_tenant_isolation" ON expenses
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
      UNION ALL
      SELECT NULL WHERE EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

-- ─── END OF SCHEMA ───────────────────────────────────────────────────────────
-- NEXT STEPS:
-- 1. Run the script above in Supabase SQL Editor
-- 2. Create Storage bucket: go to Storage → New Bucket → name: "erp-uploads" → Public: OFF
-- 3. Generate a real super admin password hash — see instructions in README
-- 4. Continue to Phase 4 (Authentication pages)
