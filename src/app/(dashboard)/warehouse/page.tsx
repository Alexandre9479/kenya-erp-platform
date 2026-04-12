import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { WarehouseClient } from "@/components/warehouse/warehouse-client";

export const metadata: Metadata = { title: "Warehouse & Stock" };

type RawStockLevel = {
  id: string;
  tenant_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  updated_at: string;
  products: { name: string; sku: string; unit: string; reorder_level: number } | null;
  warehouses: { name: string } | null;
};

export default async function WarehousePage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const [stockResult, warehouseResult] = await Promise.all([
    supabase
      .from("stock_levels")
      .select("*, products(name, sku, unit, reorder_level), warehouses(name)", { count: "exact" })
      .eq("tenant_id", tenantId)
      .range(0, 24),
    supabase
      .from("warehouses")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name"),
  ]);

  const initialStock = (stockResult.data as unknown as RawStockLevel[]).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    warehouse_id: row.warehouse_id,
    product_name: row.products?.name ?? "—",
    sku: row.products?.sku ?? "—",
    unit: row.products?.unit ?? "pcs",
    reorder_level: row.products?.reorder_level ?? 0,
    warehouse_name: row.warehouses?.name ?? "—",
    quantity: row.quantity,
    updated_at: row.updated_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse & Stock</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor stock levels and record adjustments</p>
      </div>
      <WarehouseClient
        initialStock={initialStock}
        totalCount={stockResult.count ?? 0}
        initialWarehouses={warehouseResult.data ?? []}
      />
    </div>
  );
}
