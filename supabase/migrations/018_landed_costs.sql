-- ════════════════════════════════════════════════════════════════
-- 018 — Landed costs
--   landed_cost_bills          → freight/duty/clearing/insurance
--                                bills attached to a PO or GRN
--   landed_cost_allocations    → distribution across PO items
--                                (by value, quantity, weight, equal)
--   goods_received_notes.landed_cost_total → aggregated cost
--   grn_items.unit_landed_cost → final per-unit inventory cost
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS landed_cost_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bill_number     TEXT NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  grn_id          UUID REFERENCES goods_received_notes(id) ON DELETE SET NULL,
  cost_type       TEXT NOT NULL CHECK (cost_type IN (
                    'freight','duty','clearing','insurance',
                    'handling','inspection','demurrage','other'
                  )),
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  bill_date       DATE NOT NULL,
  reference       TEXT,
  amount          NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  currency_code   CHAR(3) NOT NULL DEFAULT 'KES' REFERENCES currencies(code),
  fx_rate         NUMERIC(18,8) NOT NULL DEFAULT 1,
  allocation_method TEXT NOT NULL DEFAULT 'value'
                    CHECK (allocation_method IN ('value','quantity','weight','equal')),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','allocated','posted')),
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lcb_tenant ON landed_cost_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lcb_po     ON landed_cost_bills(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_lcb_grn    ON landed_cost_bills(grn_id);

CREATE TABLE IF NOT EXISTS landed_cost_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  landed_cost_id    UUID NOT NULL REFERENCES landed_cost_bills(id) ON DELETE CASCADE,
  po_item_id        UUID REFERENCES purchase_order_items(id) ON DELETE CASCADE,
  grn_item_id       UUID REFERENCES grn_items(id) ON DELETE CASCADE,
  amount            NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lca_cost ON landed_cost_allocations(landed_cost_id);
CREATE INDEX IF NOT EXISTS idx_lca_po_item ON landed_cost_allocations(po_item_id);
CREATE INDEX IF NOT EXISTS idx_lca_grn_item ON landed_cost_allocations(grn_item_id);

-- Aggregate columns on GRN / GRN items for quick reporting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goods_received_notes' AND column_name = 'landed_cost_total'
  ) THEN
    ALTER TABLE goods_received_notes
      ADD COLUMN landed_cost_total NUMERIC(18,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grn_items' AND column_name = 'landed_cost'
  ) THEN
    ALTER TABLE grn_items
      ADD COLUMN landed_cost NUMERIC(18,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grn_items' AND column_name = 'unit_landed_cost'
  ) THEN
    ALTER TABLE grn_items
      ADD COLUMN unit_landed_cost NUMERIC(18,4) NOT NULL DEFAULT 0;
  END IF;
END $$;
