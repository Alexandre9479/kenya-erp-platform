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

const createSchema = z.object({
  supplier_id: z.string().min(1, "Supplier required"),
  issue_date: z.string().min(1, "Issue date required"),
  expected_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
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

  let query = supabase
    .from("purchase_orders")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) query = query.ilike("lpo_number", `%${search.trim()}%`);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with supplier names
  const supplierIds = [...new Set((data ?? []).map((p) => p.supplier_id))];
  let supplierMap: Record<string, string> = {};
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", supplierIds);
    (suppliers ?? []).forEach((s) => { supplierMap[s.id] = s.name; });
  }

  const enriched = (data ?? []).map((po) => ({
    ...po,
    supplier_name: supplierMap[po.supplier_id] ?? "—",
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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { supplier_id, issue_date, expected_date, notes, terms, status = "draft", items } = parsed.data;

  let subtotal = 0;
  let tax_amount = 0;
  const enrichedItems = items.map((item, idx) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const vatAmount = Math.round(lineSubtotal * (item.vat_rate / 100) * 100) / 100;
    subtotal += lineSubtotal;
    tax_amount += vatAmount;
    return { ...item, vat_amount: vatAmount, line_total: lineSubtotal + vatAmount, sort_order: item.sort_order ?? idx };
  });
  const total_amount = subtotal + tax_amount;

  const supabase = await createServiceClient();

  // Generate LPO number
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "lpo",
  });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("lpo_prefix")
    .eq("id", tenantId)
    .single();

  const prefix = tenant?.lpo_prefix ?? "LPO";
  const lpo_number = `${prefix}-${String(docNum ?? Date.now()).padStart(5, "0")}`;

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      tenant_id: tenantId,
      lpo_number,
      supplier_id,
      issue_date,
      expected_date: expected_date ?? null,
      status,
      subtotal,
      tax_amount,
      total_amount,
      notes: notes ?? null,
      terms: terms ?? null,
      approved_by: null,
      created_by: userId,
    })
    .select()
    .single();

  if (poError) return NextResponse.json({ error: poError.message }, { status: 500 });

  const lineItems = enrichedItems.map((item) => ({
    tenant_id: tenantId,
    po_id: po.id,
    product_id: item.product_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    vat_amount: item.vat_amount,
    line_total: item.line_total,
    sort_order: item.sort_order,
  }));

  const { error: itemsError } = await supabase.from("purchase_order_items").insert(lineItems);
  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: po }, { status: 201 });
}
