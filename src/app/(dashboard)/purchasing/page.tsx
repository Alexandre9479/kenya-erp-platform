import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PurchasingClient } from "@/components/purchasing/purchasing-client";

export const metadata: Metadata = { title: "Purchasing & Procurement" };

export default async function PurchasingPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const [posResult, suppliersResult] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(0, 24),
    supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name")
      .range(0, 24),
  ]);

  // Enrich POs with supplier names
  const supplierIds = [...new Set((posResult.data ?? []).map((p) => p.supplier_id))];
  let supplierMap: Record<string, string> = {};
  if (supplierIds.length > 0) {
    const { data: supps } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
    (supps ?? []).forEach((s) => { supplierMap[s.id] = s.name; });
  }

  const initialPOs = (posResult.data ?? []).map((po) => ({
    ...po,
    supplier_name: supplierMap[po.supplier_id] ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Purchasing & Procurement</h1>
        <p className="text-sm text-slate-500 mt-1">Manage local purchase orders and suppliers</p>
      </div>
      <PurchasingClient
        initialPOs={initialPOs}
        poCount={posResult.count ?? 0}
        initialSuppliers={suppliersResult.data ?? []}
        supplierCount={suppliersResult.count ?? 0}
      />
    </div>
  );
}
