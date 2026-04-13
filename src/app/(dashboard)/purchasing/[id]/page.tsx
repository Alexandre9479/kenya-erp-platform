import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { LPODetail } from "@/components/purchasing/lpo-detail";

export const metadata: Metadata = { title: "LPO Detail" };

export default async function LPODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const tenantId = session.user.tenantId;
  const { id } = await params;

  const supabase = await createServiceClient();

  const [poResult, itemsResult] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single(),
    supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", id)
      .eq("tenant_id", tenantId)
      .order("sort_order"),
  ]);

  if (!poResult.data) notFound();

  // Fetch supplier
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id, name, email, phone, address, city, kra_pin")
    .eq("id", poResult.data.supplier_id)
    .single();

  // Fetch full tenant details for print header
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, email, phone, address, city, kra_pin, logo_url")
    .eq("id", tenantId)
    .single();

  return (
    <LPODetail
      po={poResult.data}
      items={itemsResult.data ?? []}
      supplier={supplier ?? null}
      tenant={tenant ?? undefined}
    />
  );
}
