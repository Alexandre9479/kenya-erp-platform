import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: cn, error } = await db
    .from("credit_notes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !cn) return NextResponse.json({ error: "Credit note not found" }, { status: 404 });

  const { data: items } = await db.from("credit_note_items").select("*").eq("credit_note_id", id).order("sort_order");

  return NextResponse.json({ data: { ...cn, items: items ?? [] } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const body = await req.json();

  const supabase = await createServiceClient();
  const db = supabase as any;

  // Load current credit note
  const { data: cn } = await db.from("credit_notes").select("status, invoice_id, total_amount").eq("id", id).eq("tenant_id", tenantId).single();
  if (!cn) return NextResponse.json({ error: "Credit note not found" }, { status: 404 });

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.status) {
    updates.status = body.status;

    // When approved → apply credit to invoice (reduce amount_paid effectively by adjusting total)
    if (body.status === "applied" && cn.status !== "applied") {
      // Increase amount_paid on the invoice by the credit note amount
      const { data: invoice } = await supabase
        .from("invoices")
        .select("amount_paid, total_amount")
        .eq("id", cn.invoice_id)
        .single();

      if (invoice) {
        const newPaid = Math.min(invoice.amount_paid + cn.total_amount, invoice.total_amount);
        await supabase
          .from("invoices")
          .update({
            amount_paid: newPaid,
            status: newPaid >= invoice.total_amount ? "paid" : "partial",
          })
          .eq("id", cn.invoice_id);
      }
    }
  }

  if (body.notes !== undefined) updates.notes = body.notes;

  const { data, error } = await db
    .from("credit_notes")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: cn } = await db.from("credit_notes").select("status").eq("id", id).eq("tenant_id", tenantId).single();
  if (!cn) return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
  if (cn.status !== "draft") return NextResponse.json({ error: "Only draft credit notes can be deleted" }, { status: 400 });

  await db.from("credit_note_items").delete().eq("credit_note_id", id);
  const { error } = await db.from("credit_notes").delete().eq("id", id).eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
