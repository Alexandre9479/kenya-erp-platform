-- ════════════════════════════════════════════════════════════════
-- 027 — Platform billing & subscription plans
--
-- What this adds:
--   subscription_plans      → catalogue of SaaS plans (Starter, Growth, …)
--   subscription_invoices   → tenant billing ledger
--   subscription_events     → audit trail (checkout, charge, failure)
--   tenants.*               → billing_phone, billing_cycle, current_period_end,
--                             plan_id, cancel_at_period_end
--
-- Payments ride on the platform PayHero channel (env-configured),
-- NOT the per-tenant payhero_config used for customer collections.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT UNIQUE NOT NULL,
  name                 TEXT NOT NULL,
  description          TEXT,
  price_monthly        NUMERIC(18,2) NOT NULL DEFAULT 0,
  price_annual         NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency_code        CHAR(3) NOT NULL DEFAULT 'KES',
  trial_days           INTEGER NOT NULL DEFAULT 0,
  max_users            INTEGER,
  max_invoices_per_mo  INTEGER,
  features             JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public            BOOLEAN NOT NULL DEFAULT TRUE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_id                UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS billing_phone          TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle          TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','annual')),
  ADD COLUMN IF NOT EXISTS current_period_start   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id              UUID REFERENCES subscription_plans(id),
  invoice_number       TEXT NOT NULL,
  billing_cycle        TEXT NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  period_start         TIMESTAMPTZ NOT NULL,
  period_end           TIMESTAMPTZ NOT NULL,
  amount               NUMERIC(18,2) NOT NULL,
  currency_code        CHAR(3) NOT NULL DEFAULT 'KES',
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','paid','failed','cancelled','refunded')),
  payhero_request_id   TEXT,
  payhero_receipt      TEXT,
  paid_at              TIMESTAMPTZ,
  failure_reason       TEXT,
  created_by           UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_sub_inv_tenant ON subscription_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_inv_status ON subscription_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sub_inv_request ON subscription_invoices(payhero_request_id);

CREATE TABLE IF NOT EXISTS subscription_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id       UUID REFERENCES subscription_invoices(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  payload          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_tenant ON subscription_events(tenant_id, created_at DESC);

-- ─── Seed canonical plans ────────────────────────────────────────
INSERT INTO subscription_plans (code, name, description, price_monthly, price_annual, trial_days, max_users, max_invoices_per_mo, features, sort_order)
VALUES
  ('trial',    'Trial',    '14-day free trial. No credit card required.',                 0,      0,      14, 3,   50,
   '["Core accounting","Invoicing & quotes","1 warehouse","Email support"]',    1),
  ('starter',  'Starter',  'Solo founders and micro businesses getting off the ground.',  2500,   25000,   0, 3,   200,
   '["Everything in Trial","Unlimited customers","M-Pesa & card collections","KRA eTIMS ready","Priority email support"]', 2),
  ('growth',   'Growth',   'Growing SMEs running sales, inventory and a small team.',     6500,   65000,   0, 10,  1000,
   '["Everything in Starter","Purchasing & suppliers","Multi-warehouse stock","Budgets & variance","Fixed asset register","SMS reminders"]', 3),
  ('pro',      'Pro',      'Established businesses with multi-branch operations.',        14500,  145000,  0, 30,  NULL,
   '["Everything in Growth","Manufacturing & BOM","Projects & timesheets","Approvals workflow","Period-close controls","API access","Dedicated account manager"]', 4),
  ('enterprise','Enterprise','Custom deployments. Contact sales.',                        0,      0,       0, NULL, NULL,
   '["Everything in Pro","SSO / SAML","Custom integrations","Custom SLAs","On-premise option"]', 5)
ON CONFLICT (code) DO NOTHING;

-- Set a default plan pointer for existing tenants (points to trial)
UPDATE tenants
  SET plan_id = (SELECT id FROM subscription_plans WHERE code = 'trial')
  WHERE plan_id IS NULL;
