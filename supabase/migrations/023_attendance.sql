-- ════════════════════════════════════════════════════════════════
-- 023 — Attendance & clock-in
--   attendance_records → one row per employee per day
--   Sources: manual | mobile | biometric | geofence
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attendance_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date     DATE NOT NULL,
  clock_in      TIMESTAMPTZ,
  clock_out     TIMESTAMPTZ,
  hours_worked  NUMERIC(5,2),
  break_minutes INT NOT NULL DEFAULT 0,
  source        TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual','mobile','biometric','geofence','web')),
  ip_address    INET,
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  status        TEXT NOT NULL DEFAULT 'present'
                CHECK (status IN ('present','late','absent','leave','holiday','half_day')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique
  ON attendance_records(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant
  ON attendance_records(tenant_id, work_date DESC);
