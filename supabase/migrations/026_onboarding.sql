-- ════════════════════════════════════════════════════════════════
-- 026 — Tenant onboarding state
--   Adds a boolean + step counter on tenants so we can show the
--   guided setup wizard to newly-registered companies and dismiss
--   the dashboard banner once they're done.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_skipped   BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing tenants (created before this migration) shouldn't see the wizard
UPDATE tenants
  SET onboarding_completed = TRUE
  WHERE created_at < NOW() - INTERVAL '1 day';
