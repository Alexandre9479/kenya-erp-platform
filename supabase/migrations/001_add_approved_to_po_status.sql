-- Add 'approved' to the po_status enum (between 'sent' and 'partial')
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'approved' AFTER 'sent';
