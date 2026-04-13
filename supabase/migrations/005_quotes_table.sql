-- ════════════════════════════════════════════════════════════════
-- Quotes / Quotations table
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quotes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number  TEXT NOT NULL,
  customer_id   UUID NOT NULL REFERENCES customers(id),
  issue_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date   DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  terms         TEXT,
  converted_invoice_id UUID REFERENCES invoices(id),
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_number ON quotes(tenant_id, quote_number);

CREATE TABLE IF NOT EXISTS quote_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id      UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  description   TEXT NOT NULL,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_rate      NUMERIC(5,2) NOT NULL DEFAULT 16,
  vat_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total    NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- Add quote_prefix to tenants if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='quote_prefix') THEN
    ALTER TABLE tenants ADD COLUMN quote_prefix TEXT DEFAULT 'QT';
  END IF;
END $$;
