-- ════════════════════════════════════════════════════════════════
-- 024 — Recurring invoices (subscriptions / rent / retainers)
--   recurring_invoice_templates → parent template + schedule
--   recurring_invoice_items     → line items to copy onto each run
--   recurring_invoice_runs      → audit of generated invoices
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  frequency         TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly','yearly')),
  interval_count    INT NOT NULL DEFAULT 1 CHECK (interval_count > 0),
  start_date        DATE NOT NULL,
  end_date          DATE,
  next_run_date     DATE NOT NULL,
  last_run_date     DATE,
  runs_completed    INT NOT NULL DEFAULT 0,
  max_runs          INT,
  currency_code     CHAR(3) NOT NULL DEFAULT 'KES' REFERENCES currencies(code),
  payment_terms     TEXT,
  notes             TEXT,
  auto_send_email   BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','paused','completed','cancelled')),
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_inv_tenant
  ON recurring_invoice_templates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rec_inv_next_run
  ON recurring_invoice_templates(tenant_id, next_run_date)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS recurring_invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES recurring_invoice_templates(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  quantity        NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 16,   -- Kenya VAT default
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_inv_items_tpl
  ON recurring_invoice_items(template_id);

CREATE TABLE IF NOT EXISTS recurring_invoice_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES recurring_invoice_templates(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  run_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'success'
                  CHECK (status IN ('success','failed','skipped')),
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_inv_runs_tpl
  ON recurring_invoice_runs(template_id, run_date DESC);
