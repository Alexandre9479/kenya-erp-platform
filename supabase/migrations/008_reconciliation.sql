-- ════════════════════════════════════════════════════════════════
-- Bank Reconciliation module
--   • bank_statements       → imported statement header
--   • bank_statement_lines  → raw transactions from bank/M-Pesa
--   • reconciliations       → reconciliation session (period close)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bank_statements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start     DATE,
  period_end       DATE,
  opening_balance  NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance  NUMERIC(15,2) NOT NULL DEFAULT 0,
  source           TEXT NOT NULL DEFAULT 'csv'
                   CHECK (source IN ('csv','mpesa','manual','mt940')),
  filename         TEXT,
  line_count       INT NOT NULL DEFAULT 0,
  imported_by      UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_tenant ON bank_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements(bank_account_id);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  statement_id      UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  bank_account_id   UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  line_date         DATE NOT NULL,
  description       TEXT NOT NULL,
  reference         TEXT,
  amount            NUMERIC(15,2) NOT NULL,          -- positive = credit in, negative = debit out
  running_balance   NUMERIC(15,2),
  payer_name        TEXT,
  payer_phone       TEXT,
  status            TEXT NOT NULL DEFAULT 'unmatched'
                    CHECK (status IN ('unmatched','matched','ignored','pending')),
  match_type        TEXT CHECK (match_type IN ('receipt','payment','expense','journal','manual')),
  matched_receipt_id  UUID REFERENCES receipts(id) ON DELETE SET NULL,
  matched_expense_id  UUID REFERENCES expenses(id) ON DELETE SET NULL,
  match_confidence  INT DEFAULT 0,                   -- 0-100
  matched_at        TIMESTAMPTZ,
  matched_by        UUID,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsl_tenant ON bank_statement_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bsl_statement ON bank_statement_lines(statement_id);
CREATE INDEX IF NOT EXISTS idx_bsl_status ON bank_statement_lines(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bsl_date ON bank_statement_lines(tenant_id, line_date);

CREATE TABLE IF NOT EXISTS reconciliations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_account_id   UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  recon_number      TEXT NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  statement_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  book_balance      NUMERIC(15,2) NOT NULL DEFAULT 0,
  difference        NUMERIC(15,2) NOT NULL DEFAULT 0,
  matched_count     INT NOT NULL DEFAULT 0,
  unmatched_count   INT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','completed','locked')),
  completed_at      TIMESTAMPTZ,
  completed_by      UUID,
  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_tenant ON reconciliations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_account ON reconciliations(bank_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reconciliations_number
  ON reconciliations(tenant_id, recon_number);
