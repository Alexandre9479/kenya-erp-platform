import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const statementId = url.searchParams.get("statement_id");
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  if (statementId) {
    const { data: statement } = await db
      .from("supplier_statements")
      .select("*, suppliers(name, phone, email)")
      .eq("id", statementId).eq("tenant_id", tenantId).single();
    if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: lines } = await db
      .from("supplier_statement_lines")
      .select("*, purchase_orders:matched_po_id(lpo_number, total_amount), expenses:matched_expense_id(expense_number, amount)")
      .eq("tenant_id", tenantId).eq("statement_id", statementId)
      .order("line_date", { ascending: true });

    // Unmatched POs from this supplier (may indicate supplier hasn't billed us yet or missed on their statement)
    const lo = new Date(statement.period_start); lo.setDate(lo.getDate() - 30);
    const hi = new Date(statement.period_end); hi.setDate(hi.getDate() + 30);
    const [{ data: pos }, { data: matched }] = await Promise.all([
      db.from("purchase_orders")
        .select("id, lpo_number, total_amount, issue_date, status")
        .eq("tenant_id", tenantId).eq("supplier_id", statement.supplier_id)
        .gte("issue_date", lo.toISOString().slice(0, 10))
        .lte("issue_date", hi.toISOString().slice(0, 10)),
      db.from("supplier_statement_lines")
        .select("matched_po_id, matched_expense_id")
        .eq("tenant_id", tenantId).eq("status", "matched"),
    ]);
    const usedPO = new Set((matched ?? []).map((m: any) => m.matched_po_id).filter(Boolean));
    const availPOs = (pos ?? []).filter((p: any) => !usedPO.has(p.id));

    return NextResponse.json({ data: { statement, lines: lines ?? [], available_pos: availPOs } });
  }

  const { data, error } = await db
    .from("supplier_statements")
    .select("*, suppliers(name)")
    .eq("tenant_id", tenantId)
    .order("statement_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = await createServiceClient();
  const db = supabase as any;
  const { error } = await db.from("supplier_statements").delete()
    .eq("id", id).eq("tenant_id", session.user.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}
