import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Compute budget vs actuals variance.
// Actuals come from:
//   expenses.amount            → expense lines (by category or account_id)
//   invoices.total_amount       → revenue lines (by period)
//   purchase_orders.total_amount → COGS lines
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: budget } = await db.from("budgets")
    .select("*").eq("id", id).eq("tenant_id", tenantId).single();
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: lines } = await db.from("budget_lines")
    .select("*, accounts(code, name, account_type)")
    .eq("tenant_id", tenantId).eq("budget_id", id);

  const [{ data: expenses }, { data: invoices }] = await Promise.all([
    db.from("expenses")
      .select("amount, expense_date, category, account_id")
      .eq("tenant_id", tenantId)
      .gte("expense_date", budget.period_start)
      .lte("expense_date", budget.period_end),
    db.from("invoices")
      .select("total_amount, issue_date, status")
      .eq("tenant_id", tenantId)
      .gte("issue_date", budget.period_start)
      .lte("issue_date", budget.period_end)
      .neq("status", "draft"),
  ]);

  // Aggregate actuals
  const monthKey = (date: string) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  };

  const actualsByLine = new Map<string, number>();
  // Expense actuals keyed by (category OR account_id) + period
  for (const e of expenses ?? []) {
    const key = `${e.account_id ?? ""}|${(e.category ?? "").toLowerCase()}|${monthKey(e.expense_date)}`;
    actualsByLine.set(key, (actualsByLine.get(key) ?? 0) + Number(e.amount));
  }

  // Revenue actuals keyed by period (all invoices roll into "revenue" line_type)
  const revenueByMonth = new Map<string, number>();
  for (const i of invoices ?? []) {
    const mk = monthKey(i.issue_date);
    revenueByMonth.set(mk, (revenueByMonth.get(mk) ?? 0) + Number(i.total_amount));
  }

  // Build response: one row per budget line + actual + variance
  const result = (lines ?? []).map((l: any) => {
    const mk = `${l.period_year}-${l.period_month}`;
    let actual = 0;
    if (l.line_type === "revenue") {
      actual = revenueByMonth.get(mk) ?? 0;
    } else {
      const key = `${l.account_id ?? ""}|${(l.category ?? "").toLowerCase()}|${mk}`;
      actual = actualsByLine.get(key) ?? 0;
    }
    const budgetAmt = Number(l.amount);
    const variance = actual - budgetAmt;
    const variancePct = budgetAmt !== 0 ? (variance / budgetAmt) * 100 : 0;
    return {
      ...l,
      actual,
      variance,
      variance_pct: variancePct,
    };
  });

  return NextResponse.json({ data: { budget, lines: result } });
}
