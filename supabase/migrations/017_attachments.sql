-- ════════════════════════════════════════════════════════════════
-- 017 — Document attachments
--   attachments            → any document (invoice, bill, expense,
--                            PO, GRN, receipt, asset, …) can carry
--                            one or more files (scanned receipts,
--                            signed POs, supplier bills, etc.)
--
--   Files themselves live in Supabase Storage. Create the bucket
--   in the dashboard (name: "attachments", Private).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL CHECK (doc_type IN (
                  'invoice','quote','credit_note','delivery_note',
                  'receipt','expense','purchase_order','grn',
                  'journal_entry','fixed_asset','employee',
                  'payroll','bank_statement','supplier_statement',
                  'etims_submission','project','work_order','other'
                )),
  doc_id        UUID NOT NULL,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,   -- e.g. "<tenant_id>/invoice/<doc_id>/<uuid>-file.pdf"
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  label         TEXT,
  uploaded_by   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_doc
  ON attachments(tenant_id, doc_type, doc_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded
  ON attachments(tenant_id, created_at DESC);
