-- ════════════════════════════════════════════════════════════════
-- 025 — Approval workflows
--   approval_rules    → tenant-configurable routing:
--                        "PO > KES 50,000 must be approved by tenant_admin"
--   approval_requests → per-document approval state
--                        (expense/PO/journal/leave/time-off)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
                    'expense','purchase_order','journal_entry',
                    'leave_request','timesheet','credit_note',
                    'payout','other'
                  )),
  name            TEXT NOT NULL,
  min_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  max_amount      NUMERIC(18,2),
  approver_role   TEXT,            -- tenant_admin | accountant | …
  approver_user_id UUID,
  priority        INT NOT NULL DEFAULT 10,   -- lower = evaluated first
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_rules_tenant
  ON approval_rules(tenant_id, doc_type, is_active);

CREATE TABLE IF NOT EXISTS approval_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL,
  doc_id          UUID NOT NULL,
  doc_reference   TEXT,
  amount          NUMERIC(18,2),
  currency_code   CHAR(3) DEFAULT 'KES',
  requested_by    UUID,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_id         UUID REFERENCES approval_rules(id) ON DELETE SET NULL,
  approver_role   TEXT,
  approver_user_id UUID,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  decided_by      UUID,
  decided_at      TIMESTAMPTZ,
  decision_note   TEXT
);

CREATE INDEX IF NOT EXISTS idx_approval_req_tenant
  ON approval_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_req_doc
  ON approval_requests(doc_type, doc_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_pending
  ON approval_requests(tenant_id, status)
  WHERE status = 'pending';
