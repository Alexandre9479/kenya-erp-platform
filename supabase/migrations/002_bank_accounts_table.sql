-- Multiple bank accounts per tenant (replaces single bank_name/bank_account/bank_branch on tenants)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_name   TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT NOT NULL,
  branch      TEXT,
  swift_code  TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate existing bank data from tenants table (if any)
INSERT INTO bank_accounts (tenant_id, bank_name, account_number, branch, is_default)
SELECT id, bank_name, bank_account, bank_branch, TRUE
FROM tenants
WHERE bank_name IS NOT NULL AND bank_account IS NOT NULL AND bank_name != '' AND bank_account != '';
