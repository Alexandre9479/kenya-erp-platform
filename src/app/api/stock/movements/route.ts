import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MovementRow = Record<string, any>;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = (supabase as any)
    .from("stock_movements")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);
  if (search.trim()) query = query.ilike("notes", `%${search.trim()}%`);

  const { data, error, count } = await query as { data: MovementRow[] | null; error: any; count: number | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with product and warehouse names
  const rows = data ?? [];
  const productIds = [...new Set(rows.map((m) => m.product_id))];
  const warehouseIds = [...new Set(rows.map((m) => m.warehouse_id))];

  let productMap: Record<string, string> = {};
  let warehouseMap: Record<string, string> = {};

  if (productIds.length > 0) {
    const { data: products } = await supabase.from("products").select("id, name").in("id", productIds);
    (products ?? []).forEach((p) => { productMap[p.id] = p.name; });
  }
  if (warehouseIds.length > 0) {
    const { data: warehouses } = await supabase.from("warehouses").select("id, name").in("id", warehouseIds);
    (warehouses ?? []).forEach((w) => { warehouseMap[w.id] = w.name; });
  }

  const enriched = rows.map((m) => ({
    ...m,
    product_name: productMap[m.product_id] ?? "—",
    warehouse_name: warehouseMap[m.warehouse_id] ?? "—",
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}
