-- ════════════════════════════════════════════════════════════════
-- 014 — Kenyan payment channels
--   Central registry for every tenant payment method:
--   Cash, M-Pesa Till (Buy Goods), M-Pesa Paybill,
--   M-Pesa Send Money (personal), Bank transfer, Cheque, Card, Other.
--
--   • payment_channels        → tenant-owned channel records
--   • expenses.payment_method → widened enum for till/paybill split
--   • expenses.payment_channel_id → optional FK to the channel used
--   • bank_statements / lines → nullable bank_account_id + optional
--                               payment_channel_id so M-Pesa statements
--                               can be reconciled directly
-- ════════════════════════════════════════════════════════════════

-- 1. payment_channels table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  channel_type    TEXT NOT NULL CHECK (channel_type IN (
                    'cash', 'mpesa_till', 'mpesa_paybill', 'mpesa_send',
                    'bank', 'cheque', 'card', 'other'
                  )),
  -- M-Pesa specifics
  mpesa_shortcode TEXT,         -- till number (buy goods) OR paybill number
  mpesa_account_template TEXT,  -- for paybill e.g. "{invoice_number}" or "{customer_phone}"
  mpesa_phone     TEXT,         -- for personal M-Pesa send money
  -- Bank specifics
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  -- Card / cheque / other
  provider        TEXT,         -- e.g. "Pesapal", "DPO", "Equity Cheque"
  account_ref     TEXT,         -- free-form reference / instrument number
  -- General
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_channels_tenant ON payment_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_channels_type ON payment_channels(tenant_id, channel_type);

-- Only one default per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_channels_one_default
  ON payment_channels(tenant_id) WHERE is_default = TRUE;

-- 2. Seed default channels for existing tenants ────────────────────
INSERT INTO payment_channels (tenant_id, name, channel_type, is_default, is_active)
SELECT id, 'Cash', 'cash', TRUE, TRUE FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM payment_channels pc WHERE pc.tenant_id = tenants.id
);

-- 3. Bridge existing bank_accounts into payment_channels ──────────
INSERT INTO payment_channels (tenant_id, name, channel_type, bank_account_id, is_active)
SELECT ba.tenant_id,
       ba.bank_name || ' — ' || ba.account_number,
       'bank',
       ba.id,
       ba.is_active
FROM bank_accounts ba
WHERE NOT EXISTS (
  SELECT 1 FROM payment_channels pc
  WHERE pc.bank_account_id = ba.id
);

-- 4. Expand expenses.payment_method enum ──────────────────────────
-- payment_method is a Postgres ENUM (see schema.sql). Extend it with
-- the Kenyan-specific variants. ALTER TYPE ... ADD VALUE IF NOT EXISTS
-- is idempotent on PG 12+, so re-running the migration is safe.
-- Remove any stale CHECK constraint from a previous failed run first.
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mpesa_till';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mpesa_paybill';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mpesa_send';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'other';

-- Optional link to the payment channel used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'payment_channel_id'
  ) THEN
    ALTER TABLE expenses
      ADD COLUMN payment_channel_id UUID REFERENCES payment_channels(id) ON DELETE SET NULL;
    CREATE INDEX idx_expenses_payment_channel ON expenses(payment_channel_id);
  END IF;
END $$;

-- 5. Reconciliation can now target any payment channel ───────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'payment_channel_id'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN payment_channel_id UUID REFERENCES payment_channels(id) ON DELETE CASCADE;
    CREATE INDEX idx_bank_statements_channel ON bank_statements(payment_channel_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statement_lines' AND column_name = 'payment_channel_id'
  ) THEN
    ALTER TABLE bank_statement_lines
      ADD COLUMN payment_channel_id UUID REFERENCES payment_channels(id) ON DELETE CASCADE;
    CREATE INDEX idx_bsl_channel ON bank_statement_lines(payment_channel_id);
  END IF;
END $$;

-- Relax NOT NULL on bank_account_id so M-Pesa statements don't need a dummy bank
ALTER TABLE bank_statements ALTER COLUMN bank_account_id DROP NOT NULL;
ALTER TABLE bank_statement_lines ALTER COLUMN bank_account_id DROP NOT NULL;

-- Exactly one of bank_account_id or payment_channel_id must be set
ALTER TABLE bank_statements
  DROP CONSTRAINT IF EXISTS bank_statements_target_ck;
ALTER TABLE bank_statements
  ADD CONSTRAINT bank_statements_target_ck
  CHECK (
    (bank_account_id IS NOT NULL AND payment_channel_id IS NULL)
    OR (bank_account_id IS NULL AND payment_channel_id IS NOT NULL)
  );

ALTER TABLE bank_statement_lines
  DROP CONSTRAINT IF EXISTS bank_statement_lines_target_ck;
ALTER TABLE bank_statement_lines
  ADD CONSTRAINT bank_statement_lines_target_ck
  CHECK (
    (bank_account_id IS NOT NULL AND payment_channel_id IS NULL)
    OR (bank_account_id IS NULL AND payment_channel_id IS NOT NULL)
  );
