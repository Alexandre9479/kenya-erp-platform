import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { SalesClient } from "@/components/sales/sales-client";

export const metadata: Metadata = { title: "Sales & Invoices" };

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  // Fetch invoices and quotes in parallel
  const [invoiceResult, quoteResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(0, 24),
    db
      .from("quotes")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(0, 24),
  ]);

  // Enrich invoices with customer names
  const invoiceData = invoiceResult.data ?? [];
  const quoteData = (quoteResult.data ?? []) as any[];

  const allCustomerIds = [
    ...new Set([
      ...invoiceData.map((i) => i.customer_id),
      ...quoteData.map((q: any) => q.customer_id),
    ]),
  ];
  let customerMap: Record<string, string> = {};
  if (allCustomerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", allCustomerIds);
    (customers ?? []).forEach((c) => { customerMap[c.id] = c.name; });
  }

  const initialInvoices = invoiceData.map((inv) => ({
    ...inv,
    customer_name: customerMap[inv.customer_id] ?? "—",
  }));

  const initialQuotes = quoteData.map((q: any) => ({
    ...q,
    customer_name: customerMap[q.customer_id] ?? "—",
  }));

  return (
    <SalesClient
      initialInvoices={initialInvoices}
      invoiceCount={invoiceResult.count ?? 0}
      initialQuotes={initialQuotes}
      quoteCount={quoteResult.count ?? 0}
    />
  );
}
