-- ════════════════════════════════════════════════════════════════
-- 015 — Multi-currency
--   currencies              → ISO currency codes (KES, USD, EUR, …)
--   fx_rates                → rate-per-day to base currency
--   tenants.base_currency   → which currency the books are kept in
--   currency_code + fx_rate → added to every transactional document
-- ════════════════════════════════════════════════════════════════

-- 1. currencies ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currencies (
  code            CHAR(3) PRIMARY KEY,
  name            TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  decimal_places  INT NOT NULL DEFAULT 2,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('KES', 'Kenyan Shilling',   'KSh', 2),
  ('USD', 'US Dollar',          '$',   2),
  ('EUR', 'Euro',               '€',   2),
  ('GBP', 'British Pound',      '£',   2),
  ('UGX', 'Ugandan Shilling',   'USh', 0),
  ('TZS', 'Tanzanian Shilling', 'TSh', 2),
  ('RWF', 'Rwandan Franc',      'RF',  0),
  ('ZAR', 'South African Rand', 'R',   2),
  ('AED', 'UAE Dirham',         'AED', 2),
  ('CNY', 'Chinese Yuan',       '¥',   2),
  ('INR', 'Indian Rupee',       '₹',   2),
  ('JPY', 'Japanese Yen',       '¥',   0)
ON CONFLICT (code) DO NOTHING;

-- 2. fx_rates ──────────────────────────────────────────────────────
-- Stored as "how many units of quote_currency per 1 unit of base_currency"
-- i.e. rate_date=2026-04-18, base='KES', quote='USD', rate=0.0077 means 1 KES = 0.0077 USD
-- Most users will instead store the inverse: base='USD', quote='KES', rate=130
CREATE TABLE IF NOT EXISTS fx_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  base_currency   CHAR(3) NOT NULL REFERENCES currencies(code),
  quote_currency  CHAR(3) NOT NULL REFERENCES currencies(code),
  rate_date       DATE NOT NULL,
  rate            NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  source          TEXT DEFAULT 'manual', -- manual | cbk | oanda | openexchangerates
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fx_rates_pair_not_same CHECK (base_currency <> quote_currency)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fx_rates_unique
  ON fx_rates(tenant_id, base_currency, quote_currency, rate_date);
CREATE INDEX IF NOT EXISTS idx_fx_rates_lookup
  ON fx_rates(tenant_id, quote_currency, rate_date DESC);

-- 3. tenants.base_currency ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'base_currency'
  ) THEN
    ALTER TABLE tenants
      ADD COLUMN base_currency CHAR(3) NOT NULL DEFAULT 'KES'
        REFERENCES currencies(code);
  END IF;
END $$;

-- 4. currency_code + fx_rate on every transactional table ─────────
-- fx_rate is "units of base currency per 1 unit of doc currency"
-- so base_amount = amount * fx_rate, stored once at posting time so
-- revaluation later doesn't retro-change booked numbers.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'invoices','quotes','credit_notes','delivery_notes',
      'purchase_orders','goods_received_notes',
      'receipts','expenses','journal_entries'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = t AND column_name = 'currency_code'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT ''KES'' REFERENCES currencies(code)',
        t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = t AND column_name = 'fx_rate'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN fx_rate NUMERIC(18,8) NOT NULL DEFAULT 1',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Helper view: latest rate per currency pair per tenant
CREATE OR REPLACE VIEW latest_fx_rates AS
SELECT DISTINCT ON (tenant_id, base_currency, quote_currency)
  tenant_id, base_currency, quote_currency, rate_date, rate, source
FROM fx_rates
ORDER BY tenant_id, base_currency, quote_currency, rate_date DESC;
