import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AccountingClient } from "@/components/accounting/accounting-client";

export const metadata: Metadata = { title: "Accounting & Finance" };

export default async function AccountingPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const [accountsResult, jeResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("code")
      .range(0, 199),
    supabase
      .from("journal_entries")
      .select("id, entry_number, description, entry_date, is_posted, created_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("entry_date", { ascending: false })
      .range(0, 24),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Accounting & Finance</h1>
        <p className="text-sm text-slate-500 mt-1">Chart of accounts and double-entry journals</p>
      </div>
      <AccountingClient
        initialAccounts={accountsResult.data ?? []}
        accountCount={accountsResult.count ?? 0}
        initialJournalEntries={jeResult.data ?? []}
        jeCount={jeResult.count ?? 0}
      />
    </div>
  );
}
