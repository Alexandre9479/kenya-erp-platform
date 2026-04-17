import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { FixedAssetsClient } from "@/components/fixed-assets/fixed-assets-client";

export const metadata: Metadata = { title: "Fixed Assets" };

export default async function FixedAssetsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const [{ data: assets }, { data: categories }, { data: suppliers }, { data: employees }] = await Promise.all([
    db.from("fixed_assets")
      .select("*, fixed_asset_categories(name)")
      .eq("tenant_id", tenantId)
      .order("asset_number"),
    db.from("fixed_asset_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name"),
    db.from("suppliers").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
    db.from("employees").select("id, full_name").eq("tenant_id", tenantId).order("full_name"),
  ]);

  return (
    <FixedAssetsClient
      initialAssets={assets ?? []}
      initialCategories={categories ?? []}
      suppliers={suppliers ?? []}
      employees={employees ?? []}
    />
  );
}
