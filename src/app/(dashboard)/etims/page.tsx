import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { EtimsClient } from "@/components/etims/etims-client";

export const metadata: Metadata = { title: "KRA eTIMS" };

export default async function EtimsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const [{ data: config }, { data: submissions }, { data: invoices }] = await Promise.all([
    db.from("etims_config").select("*").eq("tenant_id", tenantId).maybeSingle(),
    db.from("etims_submissions").select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(0, 99),
    db.from("invoices")
      .select("id, invoice_number, issue_date, total_amount, status, customers(name, kra_pin)")
      .eq("tenant_id", tenantId)
      .neq("status", "draft")
      .order("issue_date", { ascending: false })
      .range(0, 49),
  ]);

  return (
    <EtimsClient
      initialConfig={config}
      initialSubmissions={submissions ?? []}
      recentInvoices={invoices ?? []}
    />
  );
}
