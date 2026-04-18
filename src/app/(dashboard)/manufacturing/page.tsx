import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ManufacturingClient } from "@/components/manufacturing/manufacturing-client";

export const metadata: Metadata = { title: "Manufacturing" };

export default async function ManufacturingPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;

  const [bomRes, woRes, prodRes, whRes] = await Promise.all([
    db.from("bill_of_materials").select("*, products:product_id(name, sku)")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("created_at", { ascending: false }),
    db.from("work_orders").select("*, products:product_id(name, sku), warehouses(name)")
      .eq("tenant_id", session.user.tenantId).order("created_at", { ascending: false }).limit(100),
    db.from("products").select("id, name, sku")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("name"),
    db.from("warehouses").select("id, name")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("name"),
  ]);

  return (
    <ManufacturingClient
      boms={bomRes.data ?? []}
      workOrders={woRes.data ?? []}
      products={prodRes.data ?? []}
      warehouses={whRes.data ?? []}
    />
  );
}
