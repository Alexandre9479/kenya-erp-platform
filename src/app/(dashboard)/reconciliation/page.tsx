import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ReconciliationClient } from "@/components/reconciliation/reconciliation-client";

export const metadata: Metadata = { title: "Bank Reconciliation" };

export default async function ReconciliationPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const [{ data: bankAccounts }, { data: statements }] = await Promise.all([
    db.from("bank_accounts")
      .select("id, bank_name, account_number, branch, is_default")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("is_default", { ascending: false }),
    db.from("bank_statements")
      .select("*, bank_accounts(bank_name, account_number)")
      .eq("tenant_id", tenantId)
      .order("statement_date", { ascending: false })
      .range(0, 49),
  ]);

  return (
    <ReconciliationClient
      initialBankAccounts={bankAccounts ?? []}
      initialStatements={statements ?? []}
    />
  );
}
