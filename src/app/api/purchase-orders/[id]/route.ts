import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types/supabase";

const patchSchema = z.object({
  status: z.enum(["draft", "sent", "approved", "received", "cancelled"]).optional(),
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
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("id")
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
    updatePayload.approved_by = session.user.id;
  }

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
  return NextResponse.json({ data });
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
