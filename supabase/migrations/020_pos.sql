-- ════════════════════════════════════════════════════════════════
-- 020 — Point of Sale (POS)
--   pos_sessions       → cashier shifts; open with a float, close
--                        with a cash count. Links to a warehouse.
--   pos_orders         → each sale = an invoice + payments. Supports
--                        split payments (cash + M-Pesa, etc).
--   pos_order_payments → per-payment record inside an order
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pos_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_number  TEXT NOT NULL,
  cashier_id      UUID,
  warehouse_id    UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  register_name   TEXT DEFAULT 'Main Till',
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_float   NUMERIC(18,2) NOT NULL DEFAULT 0,
  closed_at       TIMESTAMPTZ,
  closing_cash    NUMERIC(18,2),
  expected_cash   NUMERIC(18,2),
  variance        NUMERIC(18,2),
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','closed','reconciled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_tenant
  ON pos_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_cashier
  ON pos_sessions(cashier_id, status);

CREATE TABLE IF NOT EXISTS pos_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES pos_sessions(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  subtotal        NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_total  NUMERIC(18,2) NOT NULL DEFAULT 0,
  total           NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_total      NUMERIC(18,2) NOT NULL DEFAULT 0,
  change_due      NUMERIC(18,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('draft','completed','refunded','voided')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_orders_session ON pos_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_tenant  ON pos_orders(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pos_order_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  payment_method  TEXT NOT NULL,   -- cash | mpesa | card | voucher | ...
  payment_channel_id UUID REFERENCES payment_channels(id) ON DELETE SET NULL,
  amount          NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  reference       TEXT,
  payhero_transaction_id UUID REFERENCES payhero_transactions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_payments_order ON pos_order_payments(order_id);
