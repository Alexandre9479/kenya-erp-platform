export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { BillingClient } from "@/components/billing/billing-client";

export default async function BillingPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.tenantId) redirect("/signin");
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect("/apps");
  }

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string | boolean
        ) => {
          single?: () => Promise<{ data: unknown; error: unknown | null }>;
          order?: (
            c: string,
            o: { ascending: boolean }
          ) => {
            limit?: (n: number) => Promise<{ data: unknown; error: unknown | null }>;
          } & Promise<{ data: unknown; error: unknown | null }>;
        };
      };
    };
  };

  const [plansRes, tenantRes] = await Promise.all([
    db
      .from("subscription_plans")
      .select(
        "id, code, name, description, price_monthly, price_annual, currency_code, trial_days, max_users, max_invoices_per_mo, features, is_public, is_active, sort_order"
      )
      .eq("is_active", true)
      .order!("sort_order", { ascending: true }),
    (db
      .from("tenants")
      .select(
        "id, name, subscription_plan, subscription_status, trial_ends_at, plan_id, billing_cycle, billing_phone, current_period_start, current_period_end, cancel_at_period_end"
      )
      .eq("id", tenantId) as unknown as {
      single: () => Promise<{ data: unknown; error: unknown | null }>;
    }).single(),
  ]);

  const tenant = (tenantRes.data ?? null) as {
    plan_id: string | null;
  } | null;

  let plan: unknown = null;
  if (tenant?.plan_id) {
    const planRes = await (db
      .from("subscription_plans")
      .select(
        "id, code, name, description, price_monthly, price_annual, currency_code, trial_days, max_users, max_invoices_per_mo, features"
      )
      .eq("id", tenant.plan_id) as unknown as {
      single: () => Promise<{ data: unknown; error: unknown | null }>;
    }).single();
    if (!planRes.error) plan = planRes.data;
  }

  const invChain = db
    .from("subscription_invoices")
    .select(
      "id, invoice_number, billing_cycle, period_start, period_end, amount, currency_code, status, payhero_receipt, paid_at, failure_reason, created_at"
    )
    .eq("tenant_id", tenantId);
  const invRes = await (invChain as unknown as {
    order: (c: string, o: { ascending: boolean }) => {
      limit: (n: number) => Promise<{ data: unknown; error: unknown | null }>;
    };
  })
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <BillingClient
      initialPlans={((plansRes.data ?? []) as unknown[]) as never}
      initialSubscription={{
        tenant: tenantRes.data ?? null,
        plan: plan ?? null,
        invoices: (invRes.data ?? []) as unknown[],
      } as never}
    />
  );
}
