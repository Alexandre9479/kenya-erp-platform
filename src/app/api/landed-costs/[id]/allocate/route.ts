import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/landed-costs/:id/allocate
// Distributes the landed cost bill over PO items according to the
// allocation_method and writes landed_cost_allocations rows.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: bill } = await db
    .from("landed_cost_bills")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const poId = bill.purchase_order_id;
  if (!poId) return NextResponse.json({ error: "Bill must be linked to a purchase order" }, { status: 400 });

  const { data: items } = await db
    .from("purchase_order_items")
    .select("id, quantity, unit_price, line_total, product_id")
    .eq("purchase_order_id", poId);

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "PO has no items" }, { status: 400 });
  }

  const baseAmount = Number(bill.amount) * Number(bill.fx_rate ?? 1);
  let weights: number[] = [];
  if (bill.allocation_method === "equal") {
    weights = items.map(() => 1);
  } else if (bill.allocation_method === "quantity") {
    weights = items.map((i: any) => Number(i.quantity ?? 0));
  } else {
    // value (default)
    weights = items.map((i: any) => {
      const lineTotal = Number(i.line_total ?? 0);
      if (lineTotal > 0) return lineTotal;
      return Number(i.quantity ?? 0) * Number(i.unit_price ?? 0);
    });
  }
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return NextResponse.json({ error: "Cannot allocate — zero total weight" }, { status: 400 });

  const rows = items.map((item: any, idx: number) => ({
    tenant_id: tenantId,
    landed_cost_id: id,
    po_item_id: item.id,
    amount: Number(((baseAmount * weights[idx]) / total).toFixed(2)),
  }));

  // Replace existing allocations for this bill
  await db.from("landed_cost_allocations").delete().eq("landed_cost_id", id);
  const { error } = await db.from("landed_cost_allocations").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("landed_cost_bills")
    .update({ status: "allocated", updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ data: { allocated: rows.length, total: baseAmount } });
}
