-- ════════════════════════════════════════════════════════════════
-- KRA eTIMS (Electronic Tax Invoice) integration
--   • etims_config        → per-tenant device credentials
--   • etims_submissions   → queue of invoices to submit + status
--   • etims_logs          → raw request/response audit trail
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS etims_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  environment     TEXT NOT NULL DEFAULT 'sandbox'
                  CHECK (environment IN ('sandbox','production')),
  device_type     TEXT NOT NULL DEFAULT 'OSCU'
                  CHECK (device_type IN ('OSCU','VSCU')),
  device_serial   TEXT,                               -- KRA-issued serial
  kra_pin         TEXT,                               -- e.g. P051234567X
  branch_id       TEXT DEFAULT '00',                  -- e.g. '00' for HQ
  endpoint_url    TEXT,                               -- eTIMS API base URL
  api_key         TEXT,                               -- if using API-key-based auth
  certificate     TEXT,                               -- optional x509 cert (PEM)
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at    TIMESTAMPTZ,
  last_sync_status TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS etims_submissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type      TEXT NOT NULL
                     CHECK (document_type IN ('invoice','credit_note','debit_note','receipt')),
  invoice_id         UUID REFERENCES invoices(id) ON DELETE SET NULL,
  credit_note_id     UUID,                            -- FK intentionally soft
  document_number    TEXT NOT NULL,                   -- INV-001 etc.
  submitted_at       TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','submitted','accepted','rejected','failed','cancelled')),
  attempt_count      INT NOT NULL DEFAULT 0,
  last_attempt_at    TIMESTAMPTZ,
  -- KRA returns
  kra_invoice_no     TEXT,                            -- CU invoice number
  kra_signature      TEXT,                            -- Middle/Receipt Signature
  kra_internal_data  TEXT,                            -- Internal Data
  kra_qr_code        TEXT,                            -- QR code URL
  kra_timestamp      TIMESTAMPTZ,
  error_code         TEXT,
  error_message      TEXT,
  payload            JSONB,                           -- what we sent
  response           JSONB,                           -- what KRA returned
  created_by         UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, document_type, document_number)
);

CREATE INDEX IF NOT EXISTS idx_etims_tenant ON etims_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etims_status ON etims_submissions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_etims_invoice ON etims_submissions(invoice_id);

CREATE TABLE IF NOT EXISTS etims_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id   UUID REFERENCES etims_submissions(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('outgoing','incoming')),
  http_status     INT,
  url             TEXT,
  body            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etimslogs_tenant ON etims_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etimslogs_submission ON etims_logs(submission_id);
