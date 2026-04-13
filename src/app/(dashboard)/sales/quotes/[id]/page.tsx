import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { QuoteDetail } from "@/components/sales/quote-detail";

export const metadata: Metadata = { title: "Quotation" };

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: quote, error } = await db
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !quote) notFound();

  const [{ data: items }, { data: customer }, { data: tenant }] = await Promise.all([
    db.from("quote_items").select("*").eq("quote_id", id).order("sort_order"),
    supabase.from("customers").select("id, name, email, phone, address, city, kra_pin").eq("id", quote.customer_id).single(),
    supabase.from("tenants").select("name, email, phone, address, city, kra_pin, logo_url").eq("id", tenantId).single(),
  ]);

  return <QuoteDetail quote={quote} items={items ?? []} customer={customer} tenant={tenant ?? undefined} />;
}
