-- ════════════════════════════════════════════════════════════════
-- 022 — Projects + Timesheets
--   projects         → billable projects (client-facing or internal)
--   project_tasks    → work-breakdown items under a project
--   timesheets       → per-day time capture per employee
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  manager_id      UUID,
  description     TEXT,
  start_date      DATE,
  end_date        DATE,
  budget_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency_code   CHAR(3) NOT NULL DEFAULT 'KES' REFERENCES currencies(code),
  billing_type    TEXT NOT NULL DEFAULT 'time_and_materials'
                  CHECK (billing_type IN ('fixed','time_and_materials','non_billable')),
  hourly_rate     NUMERIC(18,2),
  status          TEXT NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_code ON projects(tenant_id, code);

CREATE TABLE IF NOT EXISTS project_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  assignee_id     UUID,
  planned_hours   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo','in_progress','blocked','done','cancelled')),
  due_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON project_tasks(assignee_id);

CREATE TABLE IF NOT EXISTS timesheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  user_id         UUID,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  work_date       DATE NOT NULL,
  hours           NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  billable        BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate     NUMERIC(18,2),
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved','rejected','invoiced')),
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_tenant ON timesheets(tenant_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_timesheets_project ON timesheets(project_id);
