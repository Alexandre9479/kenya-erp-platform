-- ════════════════════════════════════════════════════════════════
-- Supplier Statement Reconciliation
--   Match supplier's statement of account against our POs/expenses
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_statements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  statement_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start    DATE,
  period_end      DATE,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  filename        TEXT,
  line_count      INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','reviewed','resolved')),
  notes           TEXT,
  imported_by     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ss_tenant ON supplier_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ss_supplier ON supplier_statements(supplier_id);

CREATE TABLE IF NOT EXISTS supplier_statement_lines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  statement_id         UUID NOT NULL REFERENCES supplier_statements(id) ON DELETE CASCADE,
  supplier_id          UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  line_date            DATE NOT NULL,
  document_type        TEXT NOT NULL DEFAULT 'invoice'
                       CHECK (document_type IN ('invoice','credit_note','payment','opening','adjustment')),
  document_number      TEXT,
  description          TEXT,
  debit                NUMERIC(15,2) NOT NULL DEFAULT 0,   -- amount we owe supplier
  credit               NUMERIC(15,2) NOT NULL DEFAULT 0,   -- amount we paid supplier
  running_balance      NUMERIC(15,2),
  status               TEXT NOT NULL DEFAULT 'unmatched'
                       CHECK (status IN ('unmatched','matched','missing_in_books','disputed','ignored')),
  matched_po_id        UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  matched_expense_id   UUID REFERENCES expenses(id) ON DELETE SET NULL,
  book_amount          NUMERIC(15,2),                       -- amount per our books
  variance             NUMERIC(15,2),                       -- supplier amount - our amount
  match_confidence     INT DEFAULT 0,
  matched_at           TIMESTAMPTZ,
  matched_by           UUID,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ssl_tenant ON supplier_statement_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ssl_statement ON supplier_statement_lines(statement_id);
CREATE INDEX IF NOT EXISTS idx_ssl_status ON supplier_statement_lines(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ssl_supplier ON supplier_statement_lines(supplier_id);
