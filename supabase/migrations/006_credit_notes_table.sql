-- ════════════════════════════════════════════════════════════════
-- Credit Notes table
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS credit_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credit_note_number TEXT NOT NULL,
  invoice_id    UUID NOT NULL REFERENCES invoices(id),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  issue_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','approved','applied','cancelled')),
  subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant ON credit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(tenant_id, credit_note_number);

CREATE TABLE IF NOT EXISTS credit_note_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_rate      NUMERIC(5,2) NOT NULL DEFAULT 16,
  vat_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total    NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_cn ON credit_note_items(credit_note_id);

-- Add credit_note_prefix to tenants if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='credit_note_prefix') THEN
    ALTER TABLE tenants ADD COLUMN credit_note_prefix TEXT DEFAULT 'CN';
  END IF;
END $$;
