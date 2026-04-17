-- ════════════════════════════════════════════════════════════════
-- Budgeting module
--   • budgets        → budget plan header (e.g. FY2026, Q1 2026)
--   • budget_lines   → monthly amounts per account or category
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  period_type  TEXT NOT NULL DEFAULT 'annual'
               CHECK (period_type IN ('annual','quarterly','monthly','custom')),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','approved','closed')),
  notes        TEXT,
  approved_by  UUID,
  approved_at  TIMESTAMPTZ,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(tenant_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS budget_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  budget_id     UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category      TEXT,                                -- free-text category (used if not mapped to an account)
  line_type     TEXT NOT NULL DEFAULT 'expense'
                CHECK (line_type IN ('revenue','expense','cogs','other')),
  period_year   INT NOT NULL,
  period_month  INT NOT NULL,                        -- 1-12
  amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, budget_id, account_id, category, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_bl_tenant ON budget_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bl_budget ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_bl_period ON budget_lines(tenant_id, period_year, period_month);
