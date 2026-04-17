import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { parseSupplierCSV } from "@/lib/supplier-recon/parser";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { supplier_id, csv_text, filename, opening_balance, closing_balance } = body as {
    supplier_id: string;
    csv_text: string;
    filename?: string;
    opening_balance?: number;
    closing_balance?: number;
  };

  if (!supplier_id || !csv_text) {
    return NextResponse.json({ error: "supplier_id and csv_text required" }, { status: 400 });
  }

  const lines = parseSupplierCSV(csv_text);
  if (lines.length === 0) {
    return NextResponse.json({ error: "No valid lines found. Check CSV format." }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: supplier } = await db
    .from("suppliers").select("id").eq("id", supplier_id).eq("tenant_id", tenantId).single();
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const dates = lines.map((l) => l.line_date).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];

  const { data: statement, error: stmtErr } = await db
    .from("supplier_statements").insert({
      tenant_id: tenantId,
      supplier_id,
      statement_date: periodEnd,
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: opening_balance ?? 0,
      closing_balance: closing_balance ?? lines[lines.length - 1]?.running_balance ?? 0,
      filename: filename ?? null,
      line_count: lines.length,
      imported_by: session.user.id,
    }).select().single();

  if (stmtErr || !statement) {
    return NextResponse.json({ error: stmtErr?.message ?? "Insert failed" }, { status: 500 });
  }

  const rows = lines.map((l) => ({
    tenant_id: tenantId,
    statement_id: statement.id,
    supplier_id,
    line_date: l.line_date,
    document_type: l.document_type,
    document_number: l.document_number,
    description: l.description,
    debit: l.debit,
    credit: l.credit,
    running_balance: l.running_balance,
    status: "unmatched",
  }));

  const { error: linesErr } = await db.from("supplier_statement_lines").insert(rows);
  if (linesErr) {
    await db.from("supplier_statements").delete().eq("id", statement.id);
    return NextResponse.json({ error: linesErr.message }, { status: 500 });
  }

  return NextResponse.json({
    data: { statement, line_count: lines.length, period_start: periodStart, period_end: periodEnd },
  }, { status: 201 });
}
