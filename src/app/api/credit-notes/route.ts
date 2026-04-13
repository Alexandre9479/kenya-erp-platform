import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  vat_rate: z.number().min(0).max(100),
  sort_order: z.number().int().optional(),
});

const createSchema = z.object({
  invoice_id: z.string().min(1, "Invoice required"),
  issue_date: z.string().min(1, "Date required"),
  reason: z.string().min(1, "Reason required"),
  notes: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();
  const db = supabase as any;

  let query = db
    .from("credit_notes")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) query = query.ilike("credit_note_number", `%${search.trim()}%`);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with customer names + invoice numbers
  const rows = (data ?? []) as any[];
  const customerIds = [...new Set(rows.map((r) => r.customer_id))] as string[];
  const invoiceIds = [...new Set(rows.map((r) => r.invoice_id))] as string[];

  let customerMap: Record<string, string> = {};
  let invoiceMap: Record<string, string> = {};

  if (customerIds.length > 0) {
    const { data: customers } = await supabase.from("customers").select("id, name").in("id", customerIds);
    (customers ?? []).forEach((c) => { customerMap[c.id] = c.name; });
  }
  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase.from("invoices").select("id, invoice_number").in("id", invoiceIds);
    (invoices ?? []).forEach((i) => { invoiceMap[i.id] = i.invoice_number; });
  }

  const enriched = rows.map((r) => ({
    ...r,
    customer_name: customerMap[r.customer_id] ?? "—",
    invoice_number: invoiceMap[r.invoice_id] ?? "—",
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });

  const { invoice_id, issue_date, reason, notes, items } = parsed.data;

  const supabase = await createServiceClient();
  const db = supabase as any;

  // Validate invoice exists and belongs to tenant
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("id, customer_id, total_amount")
    .eq("id", invoice_id)
    .eq("tenant_id", tenantId)
    .single();

  if (invErr || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Calculate totals
  let subtotal = 0;
  let tax_amount = 0;
  const enrichedItems = items.map((item, idx) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const vatAmount = Math.round(lineSubtotal * (item.vat_rate / 100) * 100) / 100;
    const lineTotal = lineSubtotal + vatAmount;
    subtotal += lineSubtotal;
    tax_amount += vatAmount;
    return { ...item, vat_amount: vatAmount, line_total: lineTotal, sort_order: item.sort_order ?? idx };
  });
  const total_amount = subtotal + tax_amount;

  // Generate credit note number
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "credit_note",
  });

  const { data: tenant } = await db.from("tenants").select("credit_note_prefix").eq("id", tenantId).single();
  const prefix = tenant?.credit_note_prefix ?? "CN";
  const credit_note_number = `${prefix}-${String(docNum ?? Date.now()).padStart(5, "0")}`;

  const { data: cn, error: cnErr } = await db
    .from("credit_notes")
    .insert({
      tenant_id: tenantId,
      credit_note_number,
      invoice_id,
      customer_id: invoice.customer_id,
      issue_date,
      reason,
      status: "draft",
      subtotal,
      tax_amount,
      total_amount,
      notes: notes ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (cnErr) return NextResponse.json({ error: cnErr.message }, { status: 500 });

  const lineItems = enrichedItems.map((item) => ({
    tenant_id: tenantId,
    credit_note_id: cn.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    vat_amount: item.vat_amount,
    line_total: item.line_total,
    sort_order: item.sort_order,
  }));

  const { error: liErr } = await db.from("credit_note_items").insert(lineItems);
  if (liErr) {
    await db.from("credit_notes").delete().eq("id", cn.id);
    return NextResponse.json({ error: liErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: cn }, { status: 201 });
}
