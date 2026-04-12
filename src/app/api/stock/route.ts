import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const warehouseId = searchParams.get("warehouse_id") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = supabase
    .from("stock_levels")
    .select("*, products(name, sku, unit, reorder_level), warehouses(name)", { count: "exact" })
    .eq("tenant_id", tenantId)
    .range(offset, offset + limit - 1);

  if (warehouseId) query = query.eq("warehouse_id", warehouseId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  const enriched = (data as unknown as RawStockLevel[])
    .map((row) => ({
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
    }))
    .filter((row) => !search.trim() || row.product_name.toLowerCase().includes(search.toLowerCase()) || row.sku.toLowerCase().includes(search.toLowerCase()));

  // Also fetch warehouses for the filter
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  return NextResponse.json({ data: enriched, count: count ?? 0, warehouses: warehouses ?? [] });
}
