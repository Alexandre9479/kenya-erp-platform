import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  const supabase = await createServiceClient();
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          single?: () => Promise<{ data: unknown; error: { message: string } | null }>;
          order: (
            c: string,
            o: { ascending: boolean }
          ) => {
            limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
  };

  const tenantRes = await (db
    .from("tenants")
    .select(
      "id, name, subscription_plan, subscription_status, trial_ends_at, plan_id, billing_cycle, billing_phone, current_period_start, current_period_end, cancel_at_period_end"
    )
    .eq("id", tenantId) as unknown as {
    single: () => Promise<{ data: unknown; error: { message: string } | null }>;
  }).single();

  if (tenantRes.error || !tenantRes.data) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const tenant = tenantRes.data as {
    plan_id: string | null;
  };

  let plan: unknown = null;
  if (tenant.plan_id) {
    const planRes = await (db
      .from("subscription_plans")
      .select(
        "id, code, name, description, price_monthly, price_annual, currency_code, trial_days, max_users, max_invoices_per_mo, features"
      )
      .eq("id", tenant.plan_id) as unknown as {
      single: () => Promise<{ data: unknown; error: { message: string } | null }>;
    }).single();
    if (!planRes.error) plan = planRes.data;
  }

  const invRes = await db
    .from("subscription_invoices")
    .select(
      "id, invoice_number, billing_cycle, period_start, period_end, amount, currency_code, status, payhero_receipt, paid_at, failure_reason, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(24);

  return NextResponse.json({
    data: {
      tenant: tenantRes.data,
      plan,
      invoices: invRes.data ?? [],
    },
  });
}
