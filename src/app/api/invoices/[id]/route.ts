import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types/supabase";

const patchSchema = z.object({
  status: z.enum(["draft", "sent", "partial", "paid", "overdue", "cancelled"]).optional(),
  amount_paid: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  due_date: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order");

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email, phone, address, city, kra_pin")
    .eq("id", invoice.customer_id)
    .single();

  return NextResponse.json({ data: { ...invoice, items: items ?? [], customer } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tenantId = session.user.tenantId;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: TablesUpdate<"invoices"> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // Auto-update status based on payment
  if (parsed.data.amount_paid !== undefined) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("total_amount")
      .eq("id", id)
      .single();
    if (inv) {
      const paid = parsed.data.amount_paid;
      if (paid >= inv.total_amount) updateData.status = "paid";
      else if (paid > 0) updateData.status = "partial";
    }
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft invoices can be deleted" }, { status: 400 });
  }

  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
