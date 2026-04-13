import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GRNRow = Record<string, any>;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = (supabase as any)
    .from("goods_received_notes")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) query = query.ilike("grn_number", `%${search.trim()}%`);

  const { data, error, count } = await query as { data: GRNRow[] | null; error: any; count: number | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with supplier, warehouse, and PO info
  const rows = data ?? [];
  const supplierIds = [...new Set(rows.map((g) => g.supplier_id))];
  const warehouseIds = [...new Set(rows.map((g) => g.warehouse_id))];
  const poIds = [...new Set(rows.map((g) => g.po_id))];

  let supplierMap: Record<string, string> = {};
  let warehouseMap: Record<string, string> = {};
  let poMap: Record<string, string> = {};

  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
    (suppliers ?? []).forEach((s) => { supplierMap[s.id] = s.name; });
  }
  if (warehouseIds.length > 0) {
    const { data: warehouses } = await supabase.from("warehouses").select("id, name").in("id", warehouseIds);
    (warehouses ?? []).forEach((w) => { warehouseMap[w.id] = w.name; });
  }
  if (poIds.length > 0) {
    const { data: pos } = await supabase.from("purchase_orders").select("id, lpo_number").in("id", poIds);
    (pos ?? []).forEach((p) => { poMap[p.id] = p.lpo_number; });
  }

  const enriched = rows.map((g) => ({
    ...g,
    supplier_name: supplierMap[g.supplier_id] ?? "—",
    warehouse_name: warehouseMap[g.warehouse_id] ?? "—",
    lpo_number: poMap[g.po_id] ?? "—",
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}
