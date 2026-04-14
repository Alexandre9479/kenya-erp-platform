import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { autoMatch } from "@/lib/reconciliation/matcher";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { statement_id } = await req.json();
  if (!statement_id) {
    return NextResponse.json({ error: "statement_id required" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  // Load unmatched lines for this statement
  const { data: lines } = await db
    .from("bank_statement_lines")
    .select("id, line_date, amount, description, reference, payer_phone")
    .eq("tenant_id", tenantId)
    .eq("statement_id", statement_id)
    .eq("status", "unmatched");

  if (!lines || lines.length === 0) {
    return NextResponse.json({ data: { matched: 0 } });
  }

  const dates = lines.map((l: any) => l.line_date).sort();
  const lo = dates[0];
  const hi = dates[dates.length - 1];
  // widen by 14 days for fuzzy date matching
  const loDate = new Date(lo);
  loDate.setDate(loDate.getDate() - 14);
  const hiDate = new Date(hi);
  hiDate.setDate(hiDate.getDate() + 14);
  const loStr = loDate.toISOString().slice(0, 10);
  const hiStr = hiDate.toISOString().slice(0, 10);

  // Load candidate receipts (not yet matched to any line)
  const [{ data: receipts }, { data: expenses }] = await Promise.all([
    db.from("receipts")
      .select("id, receipt_number, amount, payment_date, reference, customer_id")
      .eq("tenant_id", tenantId)
      .gte("payment_date", loStr)
      .lte("payment_date", hiStr),
    db.from("expenses")
      .select("id, expense_number, amount, expense_date, reference")
      .eq("tenant_id", tenantId)
      .gte("expense_date", loStr)
      .lte("expense_date", hiStr),
  ]);

  // Exclude receipts/expenses already matched
  const { data: already } = await db
    .from("bank_statement_lines")
    .select("matched_receipt_id, matched_expense_id")
    .eq("tenant_id", tenantId)
    .eq("status", "matched");

  const usedR = new Set((already ?? []).map((r: any) => r.matched_receipt_id).filter(Boolean));
  const usedE = new Set((already ?? []).map((r: any) => r.matched_expense_id).filter(Boolean));

  const availReceipts = (receipts ?? []).filter((r: any) => !usedR.has(r.id));
  const availExpenses = (expenses ?? []).filter((e: any) => !usedE.has(e.id));

  const matches = autoMatch(lines as any, availReceipts as any, availExpenses as any);

  // Apply matches
  const now = new Date().toISOString();
  for (const m of matches) {
    await db.from("bank_statement_lines").update({
      status: "matched",
      match_type: m.type,
      matched_receipt_id: m.type === "receipt" ? m.targetId : null,
      matched_expense_id: m.type === "expense" ? m.targetId : null,
      match_confidence: m.confidence,
      matched_at: now,
      matched_by: session.user.id,
    }).eq("id", m.lineId);
  }

  return NextResponse.json({
    data: { matched: matches.length, total: lines.length },
  });
}
