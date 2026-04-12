import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const lineItemSchema = z.object({
  product_id: z.string().nullable().optional(),
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive("Quantity must be > 0"),
  unit_price: z.number().min(0),
  vat_rate: z.number().min(0).max(100),
  sort_order: z.number().int().optional(),
});

const createInvoiceSchema = z.object({
  customer_id: z.string().min(1, "Customer required"),
  issue_date: z.string().min(1, "Issue date required"),
  due_date: z.string().min(1, "Due date required"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  discount_amount: z.number().min(0).optional(),
  status: z.enum(["draft", "sent"]).optional(),
  items: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) {
    query = query.ilike("invoice_number", `%${search.trim()}%`);
  }
  if (status) query = query.eq("status", status as "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled");

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch customer names
  const customerIds = [...new Set((data ?? []).map((i) => i.customer_id))];
  let customerMap: Record<string, string> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds);
    (customers ?? []).forEach((c) => { customerMap[c.id] = c.name; });
  }

  const enriched = (data ?? []).map((inv) => ({
    ...inv,
    customer_name: customerMap[inv.customer_id] ?? "—",
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const body = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
  }

  const { customer_id, issue_date, due_date, notes, terms, discount_amount = 0, status = "draft", items } = parsed.data;

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
  const total_amount = subtotal + tax_amount - discount_amount;

  const supabase = await createServiceClient();

  // Generate invoice number via RPC
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "invoice",
  });

  // Get tenant prefix
  const { data: tenant } = await supabase
    .from("tenants")
    .select("invoice_prefix")
    .eq("id", tenantId)
    .single();

  const prefix = tenant?.invoice_prefix ?? "INV";
  const invoice_number = `${prefix}-${String(docNum ?? Date.now()).padStart(5, "0")}`;

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      tenant_id: tenantId,
      invoice_number,
      customer_id,
      issue_date,
      due_date,
      status,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      amount_paid: 0,
      notes: notes ?? null,
      terms: terms ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });

  // Insert line items
  const lineItems = enrichedItems.map((item) => ({
    tenant_id: tenantId,
    invoice_id: invoice.id,
    product_id: item.product_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    vat_amount: item.vat_amount,
    line_total: item.line_total,
    sort_order: item.sort_order,
  }));

  const { error: itemsError } = await supabase.from("invoice_items").insert(lineItems);
  if (itemsError) {
    // Rollback by deleting the invoice
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: invoice }, { status: 201 });
}
