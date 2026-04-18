-- ════════════════════════════════════════════════════════════════
-- 019 — PayHero payment gateway
--   payhero_config         → tenant credentials
--   payhero_transactions   → STK push / C2B / B2C trail
--   payhero_events         → raw webhook payloads for audit
--
--   Docs: https://docs.payhero.co.ke
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payhero_config (
  tenant_id           UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  api_username        TEXT,
  api_password        TEXT,            -- encrypt at app layer if required
  default_channel_id  TEXT,            -- PayHero channel ID
  webhook_secret      TEXT,
  enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  test_mode           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payhero_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  direction           TEXT NOT NULL CHECK (direction IN ('collect','payout')),
  request_id          TEXT,            -- PayHero's CheckoutRequestID
  external_reference  TEXT,            -- our own reference (invoice #, expense #)
  invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
  receipt_id          UUID REFERENCES receipts(id) ON DELETE SET NULL,
  expense_id          UUID REFERENCES expenses(id) ON DELETE SET NULL,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone      TEXT NOT NULL,
  amount              NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency_code       CHAR(3) NOT NULL DEFAULT 'KES',
  channel_id          TEXT,
  provider_reference  TEXT,            -- M-Pesa receipt number (e.g. SJK12ABCDEF)
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','success','failed','cancelled','expired')),
  failure_reason      TEXT,
  requested_by        UUID,
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  raw_request         JSONB,
  raw_response        JSONB
);

CREATE INDEX IF NOT EXISTS idx_payhero_tx_tenant ON payhero_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payhero_tx_status ON payhero_transactions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payhero_tx_invoice ON payhero_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payhero_tx_reqid ON payhero_transactions(request_id);

CREATE TABLE IF NOT EXISTS payhero_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id      UUID REFERENCES payhero_transactions(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payhero_events_tx ON payhero_events(transaction_id);
