import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types/supabase";

const patchSchema = z.object({
  status: z.enum(["draft", "sent", "approved", "partial", "received", "cancelled"]).optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  expected_date: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: items }, { data: supplier }] = await Promise.all([
    supabase.from("purchase_order_items").select("*").eq("po_id", id).order("sort_order"),
    supabase.from("suppliers").select("id, name, email, phone, address, city, kra_pin").eq("id", po.supplier_id).single(),
  ]);

  return NextResponse.json({ data: { ...po, items: items ?? [], supplier } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const userId = session.user.id;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("id, status, supplier_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updatePayload: TablesUpdate<"purchase_orders"> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // Set approved_by when approving
  if (parsed.data.status === "approved") {
    updatePayload.approved_by = userId;
  }

  // Update the PO status
  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("[purchase-orders PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // When marking as received, create stock movements from LPO items
  if (parsed.data.status === "received") {
    try {
      await receiveGoodsIntoStock(supabase, id, tenantId, userId, existing.supplier_id);
    } catch (err) {
      console.error("[purchase-orders PATCH] stock receive error:", err);
    }
  }

  // Create notification for key status changes
  if (parsed.data.status) {
    const lpoNum = data.lpo_number ?? id.slice(0, 8);
    const notifMap: Record<string, { title: string; message: string; type: string }> = {
      approved: { title: "LPO Approved", message: `LPO ${lpoNum} has been approved and is ready to send to supplier.`, type: "success" },
      sent: { title: "LPO Sent to Supplier", message: `LPO ${lpoNum} has been marked as sent to supplier.`, type: "info" },
      received: { title: "Goods Received", message: `Goods for LPO ${lpoNum} have been received and stock has been updated.`, type: "success" },
      cancelled: { title: "LPO Cancelled", message: `LPO ${lpoNum} has been cancelled.`, type: "warning" },
    };
    const notif = notifMap[parsed.data.status];
    if (notif) {
      await (supabase as any).from("notifications").insert({
        tenant_id: tenantId,
        user_id: null, // broadcast to all tenant users
        title: notif.title,
        message: notif.message,
        type: notif.type,
        link: "/purchasing",
      }); // non-blocking, errors silently ignored
    }
  }

  return NextResponse.json({ data });
}

/**
 * When an LPO is marked as received, create stock movements and update stock levels.
 * Also creates a GRN (Goods Received Note) for audit trail.
 */
async function receiveGoodsIntoStock(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  poId: string,
  tenantId: string,
  userId: string,
  supplierId: string,
) {
  // Get LPO line items (only items with a product_id can go into stock)
  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("po_id", poId);

  if (!items || items.length === 0) return;

  const productItems = items.filter((item) => item.product_id);
  if (productItems.length === 0) return;

  // Get the default warehouse for this tenant
  let warehouseId: string | null = null;
  const { data: warehouse } = await supabase
    .from("warehouses")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .single();

  if (warehouse) {
    warehouseId = warehouse.id;
  } else {
    // Fallback: get any active warehouse
    const { data: anyWarehouse } = await supabase
      .from("warehouses")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!anyWarehouse) {
      console.error("[receiveGoods] No warehouse found for tenant", tenantId);
      return;
    }
    warehouseId = anyWarehouse.id;
  }

  // Generate GRN number
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "grn",
  });
  const grnNumber = `GRN-${String(docNum ?? Date.now()).padStart(5, "0")}`;

  // Create GRN
  const { data: grn, error: grnError } = await ((supabase as any)
    .from("goods_received_notes")
    .insert({
      tenant_id: tenantId,
      grn_number: grnNumber,
      po_id: poId,
      supplier_id: supplierId,
      warehouse_id: warehouseId,
      received_date: new Date().toISOString().split("T")[0],
      status: "complete",
      notes: null,
      created_by: userId,
    })
    .select("id")
    .single()) as { data: { id: string } | null; error: any };

  if (grnError || !grn) {
    console.error("[receiveGoods] GRN create error:", grnError);
    return;
  }

  // Create GRN items
  const grnItems = productItems.map((item) => ({
    tenant_id: tenantId,
    grn_id: grn.id,
    product_id: item.product_id!,
    quantity_ordered: item.quantity,
    quantity_received: item.quantity,
    unit_price: item.unit_price,
    notes: null,
  }));

  await (supabase as any).from("grn_items").insert(grnItems as any);

  // Create stock movements and update stock levels for each product
  for (const item of productItems) {
    // Create stock_in movement
    await (supabase as any).from("stock_movements").insert({
      tenant_id: tenantId,
      product_id: item.product_id!,
      warehouse_id: warehouseId,
      type: "stock_in",
      quantity: item.quantity,
      unit_cost: item.unit_price,
      reference_type: "grn",
      reference_id: grn.id,
      notes: `Received from LPO via ${grnNumber}`,
      created_by: userId,
    });

    // Upsert stock level
    const { data: existingStock } = await supabase
      .from("stock_levels")
      .select("id, quantity")
      .eq("tenant_id", tenantId)
      .eq("product_id", item.product_id!)
      .eq("warehouse_id", warehouseId)
      .single();

    if (existingStock) {
      await supabase
        .from("stock_levels")
        .update({
          quantity: existingStock.quantity + item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingStock.id);
    } else {
      await supabase.from("stock_levels").insert({
        tenant_id: tenantId,
        product_id: item.product_id!,
        warehouse_id: warehouseId,
        quantity: item.quantity,
      });
    }
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft LPOs can be deleted" }, { status: 400 });
  }

  await supabase.from("purchase_order_items").delete().eq("po_id", id);
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
