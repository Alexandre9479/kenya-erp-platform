import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { DeliveryNoteDetail } from "@/components/sales/delivery-note-detail";

export const metadata: Metadata = { title: "Delivery Note" };

export default async function DeliveryNoteDetailPage({
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

  const { data: dn, error } = await db
    .from("delivery_notes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !dn) notFound();

  const [{ data: items }, { data: customer }, { data: invoice }, { data: tenant }] = await Promise.all([
    db.from("delivery_note_items").select("*").eq("delivery_note_id", id).order("sort_order"),
    supabase.from("customers").select("id, name, email, phone, address, city, kra_pin").eq("id", dn.customer_id).single(),
    supabase.from("invoices").select("invoice_number").eq("id", dn.invoice_id).single(),
    supabase.from("tenants").select("name, email, phone, address, city, kra_pin, logo_url").eq("id", tenantId).single(),
  ]);

  return (
    <DeliveryNoteDetail
      deliveryNote={dn}
      items={items ?? []}
      customer={customer}
      invoiceNumber={invoice?.invoice_number ?? "—"}
      tenant={tenant ?? undefined}
    />
  );
}
