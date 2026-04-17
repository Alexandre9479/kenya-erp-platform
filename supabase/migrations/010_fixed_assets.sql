-- ════════════════════════════════════════════════════════════════
-- Fixed Assets Register + Depreciation
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fixed_asset_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  -- Default depreciation rate per year (reducing balance) or useful life (straight line)
  default_method TEXT NOT NULL DEFAULT 'straight_line'
                 CHECK (default_method IN ('straight_line','reducing_balance','none')),
  default_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,          -- % per year (e.g. 25.00 = 25%)
  default_useful_life_years INT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fac_tenant ON fixed_asset_categories(tenant_id);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_number           TEXT NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT,
  category_id            UUID REFERENCES fixed_asset_categories(id) ON DELETE SET NULL,
  serial_number          TEXT,
  location               TEXT,
  assigned_to_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  acquisition_date       DATE NOT NULL,
  acquisition_cost       NUMERIC(15,2) NOT NULL,
  supplier_id            UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  po_id                  UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  depreciation_method    TEXT NOT NULL DEFAULT 'straight_line'
                         CHECK (depreciation_method IN ('straight_line','reducing_balance','none')),
  depreciation_rate      NUMERIC(5,2) NOT NULL DEFAULT 0,
  useful_life_years      INT,
  salvage_value          NUMERIC(15,2) NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
  book_value             NUMERIC(15,2) GENERATED ALWAYS AS (acquisition_cost - accumulated_depreciation) STORED,
  status                 TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','disposed','written_off','in_maintenance','lost')),
  disposal_date          DATE,
  disposal_amount        NUMERIC(15,2),
  disposal_notes         TEXT,
  notes                  TEXT,
  created_by             UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, asset_number)
);

CREATE INDEX IF NOT EXISTS idx_fa_tenant ON fixed_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fa_category ON fixed_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_fa_status ON fixed_assets(tenant_id, status);

CREATE TABLE IF NOT EXISTS fixed_asset_depreciation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id         UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  period_month     INT NOT NULL,        -- 1-12
  period_year      INT NOT NULL,
  opening_nbv      NUMERIC(15,2) NOT NULL,
  depreciation     NUMERIC(15,2) NOT NULL,
  closing_nbv      NUMERIC(15,2) NOT NULL,
  posted_at        TIMESTAMPTZ,
  posted_by        UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, asset_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_fad_tenant ON fixed_asset_depreciation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fad_period ON fixed_asset_depreciation(tenant_id, period_year, period_month);

-- Seed default Kenya-friendly categories (KRA 2nd schedule rates)
-- Users can edit these later.
-- Note: seeded only if the tenant has zero categories yet (handled in app).

-- Tenant prefix for asset numbering (optional — defaults to 'FA')
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='tenants' AND column_name='asset_prefix') THEN
    ALTER TABLE tenants ADD COLUMN asset_prefix TEXT DEFAULT 'FA';
  END IF;
END $$;
