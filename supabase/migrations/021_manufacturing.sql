-- ════════════════════════════════════════════════════════════════
-- 021 — Manufacturing (BOM + Work Orders)
--   bill_of_materials       → a recipe: parent product + components
--   bom_items               → each component line (qty, uom, scrap%)
--   work_orders             → planned/in-progress/done production
--   work_order_consumption  → raw materials consumed from stock
--   work_order_production   → finished goods produced into stock
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bill_of_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  version       TEXT NOT NULL DEFAULT 'v1',
  output_qty    NUMERIC(18,4) NOT NULL DEFAULT 1,
  labour_cost   NUMERIC(18,2) NOT NULL DEFAULT 0,
  overhead_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bom_unique
  ON bill_of_materials(tenant_id, product_id, version);
CREATE INDEX IF NOT EXISTS idx_bom_product ON bill_of_materials(product_id);

CREATE TABLE IF NOT EXISTS bom_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bom_id        UUID NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  component_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity      NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  uom           TEXT,
  scrap_pct     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (scrap_pct BETWEEN 0 AND 100),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON bom_items(bom_id);

CREATE TABLE IF NOT EXISTS work_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wo_number       TEXT NOT NULL,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  bom_id          UUID REFERENCES bill_of_materials(id) ON DELETE SET NULL,
  warehouse_id    UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  planned_qty     NUMERIC(18,4) NOT NULL CHECK (planned_qty > 0),
  produced_qty    NUMERIC(18,4) NOT NULL DEFAULT 0,
  scrap_qty       NUMERIC(18,4) NOT NULL DEFAULT 0,
  planned_start   DATE,
  planned_end     DATE,
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','confirmed','in_progress','done','cancelled')),
  labour_cost     NUMERIC(18,2) NOT NULL DEFAULT 0,
  overhead_cost   NUMERIC(18,2) NOT NULL DEFAULT 0,
  material_cost   NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_tenant ON work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wo_product ON work_orders(product_id);

CREATE TABLE IF NOT EXISTS work_order_moves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  direction       TEXT NOT NULL CHECK (direction IN ('consume','produce','scrap')),
  quantity        NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  unit_cost       NUMERIC(18,4) NOT NULL DEFAULT 0,
  moved_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_moves_wo ON work_order_moves(work_order_id);
