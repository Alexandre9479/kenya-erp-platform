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
    .order("expense_date", { ascending: false })
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
    description: string;
    amount: number;
    category?: string;
    expense_date: string;
    payment_method?: "cash" | "mpesa" | "bank_transfer" | "cheque" | "card";
    notes?: string;
    reference?: string;
  };

  if (!body.description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });
  if (!body.amount || body.amount <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  if (!body.expense_date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const supabase = await createServiceClient();

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
      account_id: null,
      category: body.category ?? "Miscellaneous",
      amount: body.amount,
      description: body.description.trim(),
      expense_date: body.expense_date,
      payment_method: body.payment_method ?? "cash",
      receipt_url: null,
      reference: body.reference ?? null,
      created_by: userId!,
      status: "pending",
      submitted_by: userId ?? null,
      approved_by: null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
