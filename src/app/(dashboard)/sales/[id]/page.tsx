import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { InvoiceDetail } from "@/components/sales/invoice-detail";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !invoice) notFound();

  const [{ data: items }, { data: customer }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
    supabase.from("customers").select("id, name, email, phone, address, city, kra_pin").eq("id", invoice.customer_id).single(),
  ]);

  return <InvoiceDetail invoice={invoice} items={items ?? []} customer={customer} />;
}
