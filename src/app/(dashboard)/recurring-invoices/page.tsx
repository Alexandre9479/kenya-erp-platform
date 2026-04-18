import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { RecurringInvoicesClient } from "@/components/recurring/recurring-invoices-client";

export const metadata: Metadata = { title: "Recurring Invoices" };

export default async function RecurringInvoicesPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;

  const [tplRes, custRes] = await Promise.all([
    db
      .from("recurring_invoice_templates")
      .select("*, customers(name)")
      .eq("tenant_id", session.user.tenantId)
      .order("created_at", { ascending: false }),
    db
      .from("customers")
      .select("id, name")
      .eq("tenant_id", session.user.tenantId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <RecurringInvoicesClient
      initial={tplRes.data ?? []}
      customers={custRes.data ?? []}
    />
  );
}
