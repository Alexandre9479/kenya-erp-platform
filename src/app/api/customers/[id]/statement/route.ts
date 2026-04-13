import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const supabase = await createServiceClient();

  // Fetch customer
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("id, name, email, phone, address, city, kra_pin, current_balance")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (custErr || !customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Fetch tenant info for statement header
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, email, phone, address, city, kra_pin, logo_url")
    .eq("id", tenantId)
    .single();

  // Fetch all invoices for this customer within date range
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, issue_date, due_date, status, total_amount, amount_paid, notes")
    .eq("tenant_id", tenantId)
    .eq("customer_id", id)
    .neq("status", "cancelled")
    .order("issue_date", { ascending: true });

  if (from) query = query.gte("issue_date", from);
  if (to) query = query.lte("issue_date", to);

  const { data: invoices, error: invErr } = await query;
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const rows = invoices ?? [];

  // Calculate totals
  const totalInvoiced = rows.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = rows.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalBalance = totalInvoiced - totalPaid;

  return NextResponse.json({
    customer,
    tenant: tenant ?? null,
    invoices: rows,
    summary: {
      totalInvoiced,
      totalPaid,
      totalBalance,
      invoiceCount: rows.length,
    },
  });
}
