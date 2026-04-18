import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PosClient } from "@/components/pos/pos-client";

export const metadata: Metadata = { title: "POS" };

export default async function PosPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;

  const [sessionRes, prodRes, whRes, custRes, channelRes] = await Promise.all([
    db.from("pos_sessions").select("*, warehouses(name)")
      .eq("tenant_id", session.user.tenantId).eq("cashier_id", session.user.id)
      .eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("products").select("id, name, sku, unit_price, tax_rate")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("name").limit(200),
    db.from("warehouses").select("id, name")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("name"),
    db.from("customers").select("id, name")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("name").limit(100),
    db.from("payment_channels").select("id, name, channel_type")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("name"),
  ]);

  return (
    <PosClient
      activeSession={sessionRes.data ?? null}
      products={prodRes.data ?? []}
      warehouses={whRes.data ?? []}
      customers={custRes.data ?? []}
      channels={channelRes.data ?? []}
    />
  );
}
