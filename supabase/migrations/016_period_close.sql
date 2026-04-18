-- ════════════════════════════════════════════════════════════════
-- 016 — Fiscal period close
--   fiscal_periods         → 12 monthly (or custom) periods per year
--   status                 → open | closed | locked (locked = admin)
--   period_guard trigger   → blocks inserts/updates on closed periods
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year          INT NOT NULL,
  name          TEXT NOT NULL,                -- "2026-04" or "FY26-Q1"
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','closed','locked')),
  closed_by     UUID,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_tenant_year
  ON fiscal_periods(tenant_id, year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_periods_unique_range
  ON fiscal_periods(tenant_id, start_date, end_date);

-- Period-guard: raise an error if someone tries to write to a
-- closed period. Attached only to the journal for now (the
-- financial source of truth); extend to invoices/expenses later
-- by re-attaching the trigger.
CREATE OR REPLACE FUNCTION enforce_period_open()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
  v_date   DATE;
BEGIN
  v_date := COALESCE(
    NEW.entry_date::date,
    NEW.invoice_date::date,
    NEW.expense_date::date,
    NEW.order_date::date,
    current_date
  );

  SELECT status INTO v_status
  FROM fiscal_periods
  WHERE tenant_id = NEW.tenant_id
    AND v_date BETWEEN start_date AND end_date;

  IF v_status IN ('closed','locked') THEN
    RAISE EXCEPTION 'Cannot post to a % fiscal period (%)', v_status, v_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to journal_entries (source of truth)
DROP TRIGGER IF EXISTS trg_je_period_guard ON journal_entries;
CREATE TRIGGER trg_je_period_guard
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION enforce_period_open();
