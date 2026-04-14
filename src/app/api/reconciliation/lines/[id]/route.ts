import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// PATCH — manual match, ignore, or unmatch a bank_statement_line
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, target_id, target_type, notes } = body as {
    action: "match" | "unmatch" | "ignore";
    target_id?: string;
    target_type?: "receipt" | "expense";
    notes?: string;
  };

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  // Verify line belongs to tenant
  const { data: line } = await db
    .from("bank_statement_lines")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();
  if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404 });

  const now = new Date().toISOString();

  if (action === "match") {
    if (!target_id || !target_type) {
      return NextResponse.json({ error: "target_id and target_type required" }, { status: 400 });
    }
    const { error } = await db.from("bank_statement_lines").update({
      status: "matched",
      match_type: target_type,
      matched_receipt_id: target_type === "receipt" ? target_id : null,
      matched_expense_id: target_type === "expense" ? target_id : null,
      match_confidence: 100,
      matched_at: now,
      matched_by: session.user.id,
      notes: notes ?? null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  }

  if (action === "unmatch") {
    const { error } = await db.from("bank_statement_lines").update({
      status: "unmatched",
      match_type: null,
      matched_receipt_id: null,
      matched_expense_id: null,
      match_confidence: 0,
      matched_at: null,
      matched_by: null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  }

  if (action === "ignore") {
    const { error } = await db.from("bank_statement_lines").update({
      status: "ignored",
      notes: notes ?? null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
