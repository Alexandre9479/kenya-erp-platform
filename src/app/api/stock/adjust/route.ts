import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const adjustSchema = z.object({
  product_id: z.string().min(1, "Product required"),
  warehouse_id: z.string().min(1, "Warehouse required"),
  type: z.enum(["opening", "adjustment", "purchase", "sale", "transfer_in", "transfer_out", "write_off", "return"]),
  quantity: z.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  unit_cost: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const body = await req.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { product_id, warehouse_id, type, quantity, unit_cost, notes } = parsed.data;

  const supabase = await createServiceClient();

  // Upsert stock level
  const { data: current } = await supabase
    .from("stock_levels")
    .select("quantity")
    .eq("product_id", product_id)
    .eq("warehouse_id", warehouse_id)
    .single();

  const newQty = (current?.quantity ?? 0) + quantity;
  if (newQty < 0) {
    return NextResponse.json({ error: "Insufficient stock — adjustment would result in negative quantity" }, { status: 400 });
  }

  const { error: upsertError } = await supabase
    .from("stock_levels")
    .upsert(
      {
        tenant_id: tenantId,
        product_id,
        warehouse_id,
        quantity: newQty,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,warehouse_id" }
    );

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  // Record movement
  const { data: movement, error: movError } = await supabase
    .from("stock_movements")
    .insert({
      tenant_id: tenantId,
      product_id,
      warehouse_id,
      type,
      quantity,
      unit_cost: unit_cost ?? null,
      reference_type: null,
      reference_id: null,
      notes: notes ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (movError) return NextResponse.json({ error: movError.message }, { status: 500 });

  return NextResponse.json({ data: { movement, new_quantity: newQty } }, { status: 201 });
}
