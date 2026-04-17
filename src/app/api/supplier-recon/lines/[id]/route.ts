import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, target_id, target_type, notes } = await req.json() as {
    action: "match" | "unmatch" | "dispute" | "ignore" | "mark_missing";
    target_id?: string;
    target_type?: "po" | "expense";
    notes?: string;
  };

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: line } = await db.from("supplier_statement_lines")
    .select("id, debit, credit").eq("id", id).eq("tenant_id", tenantId).single();
  if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404 });

  const amt = Number(line.debit) || Number(line.credit);
  const now = new Date().toISOString();

  if (action === "match") {
    if (!target_id || !target_type) return NextResponse.json({ error: "target_id and target_type required" }, { status: 400 });
    let bookAmount = 0;
    if (target_type === "po") {
      const { data: po } = await db.from("purchase_orders").select("total_amount").eq("id", target_id).single();
      bookAmount = Number(po?.total_amount ?? 0);
    } else {
      const { data: e } = await db.from("expenses").select("amount").eq("id", target_id).single();
      bookAmount = Number(e?.amount ?? 0);
    }
    const { error } = await db.from("supplier_statement_lines").update({
      status: "matched",
      matched_po_id: target_type === "po" ? target_id : null,
      matched_expense_id: target_type === "expense" ? target_id : null,
      book_amount: bookAmount,
      variance: amt - bookAmount,
      match_confidence: 100,
      matched_at: now,
      matched_by: session.user.id,
      notes: notes ?? null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  }

  if (action === "unmatch") {
    const { error } = await db.from("supplier_statement_lines").update({
      status: "unmatched",
      matched_po_id: null, matched_expense_id: null,
      book_amount: null, variance: null, match_confidence: 0,
      matched_at: null, matched_by: null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  }

  if (action === "dispute" || action === "ignore" || action === "mark_missing") {
    const statusMap = { dispute: "disputed", ignore: "ignored", mark_missing: "missing_in_books" };
    const { error } = await db.from("supplier_statement_lines").update({
      status: statusMap[action],
      notes: notes ?? null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
