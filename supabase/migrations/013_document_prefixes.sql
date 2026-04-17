-- 013 — Expand per-tenant document numbering prefixes
-- Adds prefix columns for every document type the ERP generates.
-- Each statement is idempotent so re-running is safe.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='receipt_prefix') THEN
    ALTER TABLE tenants ADD COLUMN receipt_prefix TEXT DEFAULT 'RCT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='payment_prefix') THEN
    ALTER TABLE tenants ADD COLUMN payment_prefix TEXT DEFAULT 'PV';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='expense_prefix') THEN
    ALTER TABLE tenants ADD COLUMN expense_prefix TEXT DEFAULT 'EXP';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='journal_prefix') THEN
    ALTER TABLE tenants ADD COLUMN journal_prefix TEXT DEFAULT 'JE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='bill_prefix') THEN
    ALTER TABLE tenants ADD COLUMN bill_prefix TEXT DEFAULT 'BILL';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='grn_prefix') THEN
    ALTER TABLE tenants ADD COLUMN grn_prefix TEXT DEFAULT 'GRN';
  END IF;
END $$;

-- Ensure existing prefix columns all have a default value,
-- in case any tenant was created before the column existed.
UPDATE tenants SET invoice_prefix = COALESCE(invoice_prefix, 'INV') WHERE invoice_prefix IS NULL;
UPDATE tenants SET quote_prefix = COALESCE(quote_prefix, 'QT') WHERE quote_prefix IS NULL;
UPDATE tenants SET lpo_prefix = COALESCE(lpo_prefix, 'LPO') WHERE lpo_prefix IS NULL;
UPDATE tenants SET credit_note_prefix = COALESCE(credit_note_prefix, 'CN') WHERE credit_note_prefix IS NULL;
UPDATE tenants SET delivery_note_prefix = COALESCE(delivery_note_prefix, 'DN') WHERE delivery_note_prefix IS NULL;
UPDATE tenants SET asset_prefix = COALESCE(asset_prefix, 'FA') WHERE asset_prefix IS NULL;
UPDATE tenants SET receipt_prefix = COALESCE(receipt_prefix, 'RCT') WHERE receipt_prefix IS NULL;
UPDATE tenants SET payment_prefix = COALESCE(payment_prefix, 'PV') WHERE payment_prefix IS NULL;
UPDATE tenants SET expense_prefix = COALESCE(expense_prefix, 'EXP') WHERE expense_prefix IS NULL;
UPDATE tenants SET journal_prefix = COALESCE(journal_prefix, 'JE') WHERE journal_prefix IS NULL;
UPDATE tenants SET bill_prefix = COALESCE(bill_prefix, 'BILL') WHERE bill_prefix IS NULL;
UPDATE tenants SET grn_prefix = COALESCE(grn_prefix, 'GRN') WHERE grn_prefix IS NULL;
