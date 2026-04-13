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

const createQuoteSchema = z.object({
  customer_id: z.string().min(1, "Customer required"),
  issue_date: z.string().min(1, "Issue date required"),
  expiry_date: z.string().min(1, "Expiry date required"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  discount_amount: z.number().min(0).optional(),
  status: z.enum(["draft", "sent"]).optional(),
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
    .from("quotes")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) query = query.ilike("quote_number", `%${search.trim()}%`);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with customer names
  const customerIds = [...new Set((data ?? []).map((q: any) => q.customer_id))] as string[];
  let customerMap: Record<string, string> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await supabase.from("customers").select("id, name").in("id", customerIds);
    (customers ?? []).forEach((c) => { customerMap[c.id] = c.name; });
  }

  const enriched = (data ?? []).map((q: any) => ({
    ...q,
    customer_name: customerMap[q.customer_id] ?? "—",
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const body = await req.json();
  const parsed = createQuoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });

  const { customer_id, issue_date, expiry_date, notes, terms, discount_amount = 0, status = "draft", items } = parsed.data;

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
  const db = supabase as any;

  // Generate quote number
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "quote",
  });

  const { data: tenant } = await db.from("tenants").select("quote_prefix").eq("id", tenantId).single();
  const prefix = tenant?.quote_prefix ?? "QT";
  const quote_number = `${prefix}-${String(docNum ?? Date.now()).padStart(5, "0")}`;

  const { data: quote, error: quoteError } = await db
    .from("quotes")
    .insert({
      tenant_id: tenantId,
      quote_number,
      customer_id,
      issue_date,
      expiry_date,
      status,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      notes: notes ?? null,
      terms: terms ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 500 });

  const lineItems = enrichedItems.map((item) => ({
    tenant_id: tenantId,
    quote_id: quote.id,
    product_id: item.product_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    vat_amount: item.vat_amount,
    line_total: item.line_total,
    sort_order: item.sort_order,
  }));

  const { error: itemsError } = await db.from("quote_items").insert(lineItems);
  if (itemsError) {
    await db.from("quotes").delete().eq("id", quote.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: quote }, { status: 201 });
}
