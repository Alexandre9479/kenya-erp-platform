import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { InvoicesClient } from "@/components/sales/invoices-client";

export const metadata: Metadata = { title: "Sales & Invoices" };

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const { data, count } = await supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(0, 24);

  const customerIds = [...new Set((data ?? []).map((i) => i.customer_id))];
  let customerMap: Record<string, string> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds);
    (customers ?? []).forEach((c) => { customerMap[c.id] = c.name; });
  }

  const initialInvoices = (data ?? []).map((inv) => ({
    ...inv,
    customer_name: customerMap[inv.customer_id] ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales & Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">Manage customer invoices and track payments</p>
      </div>
      <InvoicesClient initialInvoices={initialInvoices} totalCount={count ?? 0} />
    </div>
  );
}
