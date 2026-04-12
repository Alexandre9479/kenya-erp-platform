import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 20;

  const supabase = await createServiceClient();
  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status as "pending" | "approved" | "rejected");

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const body = await req.json() as {
    title: string;
    amount: number;
    category?: string;
    date: string;
    notes?: string;
  };

  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!body.amount || body.amount <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  if (!body.date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const supabase = await createServiceClient();

  // Generate expense number: EXP-XXXXXX
  const { data: numData } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "expense",
  });
  const expenseNumber = `EXP-${String(numData ?? 1).padStart(6, "0")}`;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      tenant_id: tenantId,
      expense_number: expenseNumber,
      title: body.title.trim(),
      amount: body.amount,
      category: body.category ?? null,
      date: body.date,
      status: "pending",
      submitted_by: userId ?? null,
      approved_by: null,
      receipt_url: null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
