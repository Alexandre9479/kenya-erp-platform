import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Bulk upsert budget lines
// Body: { lines: [{ account_id, category, line_type, period_year, period_month, amount }, ...] }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: budgetId } = await params;
  const { lines } = await req.json();
  if (!Array.isArray(lines)) return NextResponse.json({ error: "lines array required" }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: budget } = await db.from("budgets")
    .select("id").eq("id", budgetId).eq("tenant_id", tenantId).single();
  if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });

  // Strategy: delete all existing lines then insert new set (simpler for now)
  await db.from("budget_lines").delete()
    .eq("tenant_id", tenantId).eq("budget_id", budgetId);

  if (lines.length === 0) return NextResponse.json({ data: { inserted: 0 } });

  const rows = lines.map((l: any) => ({
    tenant_id: tenantId,
    budget_id: budgetId,
    account_id: l.account_id || null,
    category: l.category || null,
    line_type: l.line_type ?? "expense",
    period_year: Number(l.period_year),
    period_month: Number(l.period_month),
    amount: Number(l.amount || 0),
    notes: l.notes ?? null,
  }));

  const { error } = await db.from("budget_lines").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { inserted: rows.length } });
}
