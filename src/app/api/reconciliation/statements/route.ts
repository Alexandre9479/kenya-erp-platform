import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statementId = url.searchParams.get("statement_id");
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  if (statementId) {
    // Return statement + lines + candidate receipts/expenses for workbench
    const { data: statement } = await db
      .from("bank_statements")
      .select("*, bank_accounts(bank_name, account_number), payment_channels(name, channel_type, mpesa_shortcode)")
      .eq("id", statementId)
      .eq("tenant_id", tenantId)
      .single();

    if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: lines } = await db
      .from("bank_statement_lines")
      .select("*, receipts:matched_receipt_id(receipt_number, amount, customer_id), expenses:matched_expense_id(expense_number, amount, category)")
      .eq("tenant_id", tenantId)
      .eq("statement_id", statementId)
      .order("line_date", { ascending: true });

    // Candidate receipts/expenses within the statement period (±14 days)
    const start = new Date(statement.period_start);
    start.setDate(start.getDate() - 14);
    const end = new Date(statement.period_end);
    end.setDate(end.getDate() + 14);
    const loStr = start.toISOString().slice(0, 10);
    const hiStr = end.toISOString().slice(0, 10);

    const [{ data: allReceipts }, { data: allExpenses }, { data: matched }] = await Promise.all([
      db.from("receipts")
        .select("id, receipt_number, amount, payment_date, reference, customer_id, customers(name)")
        .eq("tenant_id", tenantId)
        .gte("payment_date", loStr)
        .lte("payment_date", hiStr)
        .order("payment_date", { ascending: false }),
      db.from("expenses")
        .select("id, expense_number, amount, expense_date, reference, category, description")
        .eq("tenant_id", tenantId)
        .gte("expense_date", loStr)
        .lte("expense_date", hiStr)
        .order("expense_date", { ascending: false }),
      db.from("bank_statement_lines")
        .select("matched_receipt_id, matched_expense_id")
        .eq("tenant_id", tenantId)
        .eq("status", "matched"),
    ]);

    const usedR = new Set((matched ?? []).map((m: any) => m.matched_receipt_id).filter(Boolean));
    const usedE = new Set((matched ?? []).map((m: any) => m.matched_expense_id).filter(Boolean));

    return NextResponse.json({
      data: {
        statement,
        lines: lines ?? [],
        available_receipts: (allReceipts ?? []).filter((r: any) => !usedR.has(r.id)),
        available_expenses: (allExpenses ?? []).filter((e: any) => !usedE.has(e.id)),
      },
    });
  }

  // List all statements for this tenant
  const { data, error } = await db
    .from("bank_statements")
    .select("*, bank_accounts(bank_name, account_number)")
    .eq("tenant_id", tenantId)
    .order("statement_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { error } = await db
    .from("bank_statements")
    .delete()
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}
