import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const daysBetween = (a: string, b: string) =>
  Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000));

const refContains = (text: string | null | undefined, needle: string | null | undefined) => {
  if (!text || !needle) return false;
  return text.toLowerCase().includes(needle.toLowerCase());
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { statement_id } = await req.json();
  if (!statement_id) return NextResponse.json({ error: "statement_id required" }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: statement } = await db
    .from("supplier_statements")
    .select("id, supplier_id, period_start, period_end")
    .eq("id", statement_id).eq("tenant_id", tenantId).single();
  if (!statement) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

  const { data: lines } = await db
    .from("supplier_statement_lines")
    .select("id, line_date, document_type, document_number, debit, credit, description")
    .eq("tenant_id", tenantId).eq("statement_id", statement_id).eq("status", "unmatched");

  if (!lines || lines.length === 0) {
    return NextResponse.json({ data: { matched: 0, missing: 0 } });
  }

  // Pull POs and expenses for that supplier in a widened period
  const lo = new Date(statement.period_start); lo.setDate(lo.getDate() - 30);
  const hi = new Date(statement.period_end); hi.setDate(hi.getDate() + 30);
  const loStr = lo.toISOString().slice(0, 10);
  const hiStr = hi.toISOString().slice(0, 10);

  const [{ data: pos }, { data: expenses }] = await Promise.all([
    db.from("purchase_orders")
      .select("id, lpo_number, total_amount, issue_date")
      .eq("tenant_id", tenantId).eq("supplier_id", statement.supplier_id)
      .gte("issue_date", loStr).lte("issue_date", hiStr),
    db.from("expenses")
      .select("id, expense_number, amount, expense_date, reference, description")
      .eq("tenant_id", tenantId)
      .gte("expense_date", loStr).lte("expense_date", hiStr),
  ]);

  const usedPO = new Set<string>();
  const usedExp = new Set<string>();
  const now = new Date().toISOString();
  let matchedCount = 0;
  let missingCount = 0;

  for (const line of lines as any[]) {
    const isInvoice = line.debit > 0 && line.document_type !== "payment";
    const isPayment = line.credit > 0 || line.document_type === "payment";
    const amt = line.debit || line.credit;

    let bestPO: any = null, bestPOConf = 0;
    let bestExp: any = null, bestExpConf = 0;

    if (isInvoice) {
      for (const po of pos ?? []) {
        if (usedPO.has(po.id)) continue;
        if (Math.abs(Number(po.total_amount) - amt) > 0.01) continue;
        const days = daysBetween(line.line_date, po.issue_date);
        let conf = 0;
        if (refContains(line.document_number, po.lpo_number)) conf = days <= 7 ? 98 : 90;
        else if (days <= 7) conf = 82;
        else if (days <= 21) conf = 65;
        if (conf > bestPOConf) { bestPO = po; bestPOConf = conf; }
      }
    }

    if (isPayment) {
      for (const e of expenses ?? []) {
        if (usedExp.has(e.id)) continue;
        if (Math.abs(Number(e.amount) - amt) > 0.01) continue;
        const days = daysBetween(line.line_date, e.expense_date);
        let conf = 0;
        const text = `${e.description ?? ""} ${e.reference ?? ""}`;
        if (refContains(text, line.document_number)) conf = days <= 7 ? 97 : 88;
        else if (days <= 7) conf = 78;
        else if (days <= 21) conf = 60;
        if (conf > bestExpConf) { bestExp = e; bestExpConf = conf; }
      }
    }

    let update: any = null;
    if (bestPO && bestPOConf >= 80) {
      update = {
        status: "matched",
        matched_po_id: bestPO.id,
        book_amount: Number(bestPO.total_amount),
        variance: amt - Number(bestPO.total_amount),
        match_confidence: bestPOConf,
        matched_at: now,
        matched_by: session.user.id,
      };
      usedPO.add(bestPO.id);
      matchedCount++;
    } else if (bestExp && bestExpConf >= 78) {
      update = {
        status: "matched",
        matched_expense_id: bestExp.id,
        book_amount: Number(bestExp.amount),
        variance: amt - Number(bestExp.amount),
        match_confidence: bestExpConf,
        matched_at: now,
        matched_by: session.user.id,
      };
      usedExp.add(bestExp.id);
      matchedCount++;
    } else if (isInvoice) {
      update = { status: "missing_in_books" };
      missingCount++;
    }

    if (update) await db.from("supplier_statement_lines").update(update).eq("id", line.id);
  }

  return NextResponse.json({ data: { matched: matchedCount, missing: missingCount, total: lines.length } });
}
