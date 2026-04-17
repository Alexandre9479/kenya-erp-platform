import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { BudgetsClient } from "@/components/budgets/budgets-client";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const [{ data: budgets }, { data: accounts }] = await Promise.all([
    db.from("budgets").select("*")
      .eq("tenant_id", tenantId)
      .order("period_start", { ascending: false }),
    db.from("accounts")
      .select("id, code, name, account_type")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("account_type", ["revenue", "expense", "cogs"])
      .order("code"),
  ]);

  return <BudgetsClient initialBudgets={budgets ?? []} accounts={accounts ?? []} />;
}
