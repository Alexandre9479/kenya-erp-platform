-- ════════════════════════════════════════════════════════════════
-- Delivery Notes table
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS delivery_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_note_number TEXT NOT NULL,
  invoice_id    UUID NOT NULL REFERENCES invoices(id),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','dispatched','delivered','cancelled')),
  delivery_address TEXT,
  delivery_city  TEXT,
  driver_name    TEXT,
  vehicle_reg    TEXT,
  notes          TEXT,
  received_by    TEXT,
  received_at    TIMESTAMPTZ,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_tenant ON delivery_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice ON delivery_notes(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_notes_number ON delivery_notes(tenant_id, delivery_note_number);

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  quantity         NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit             TEXT DEFAULT 'pcs',
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_items_dn ON delivery_note_items(delivery_note_id);

-- Add delivery_note_prefix to tenants if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='delivery_note_prefix') THEN
    ALTER TABLE tenants ADD COLUMN delivery_note_prefix TEXT DEFAULT 'DN';
  END IF;
END $$;
