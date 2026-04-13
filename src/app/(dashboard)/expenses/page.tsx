import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ExpensesClient from "@/components/expenses/expenses-client";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const tenantId = session.user.tenantId;

  const supabase = await createServiceClient();
  const [{ data, count }, { data: tenant }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("tenants")
      .select("name, email, phone, address, city, kra_pin, logo_url")
      .eq("id", tenantId)
      .single(),
  ]);

  return (
    <ExpensesClient
      initialExpenses={(data ?? []) as Parameters<typeof ExpensesClient>[0]["initialExpenses"]}
      total={count ?? 0}
      tenant={tenant ?? undefined}
    />
  );
}
