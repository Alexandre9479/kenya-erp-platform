import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  sort_order: z.number().int().optional(),
});

const createSchema = z.object({
  invoice_id: z.string().min(1, "Invoice required"),
  delivery_date: z.string().min(1, "Date required"),
  delivery_address: z.string().optional().nullable(),
  delivery_city: z.string().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  vehicle_reg: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one item required"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const invoice_id = searchParams.get("invoice_id") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();
  const db = supabase as any;

  let query = db
    .from("delivery_notes")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) query = query.ilike("delivery_note_number", `%${search.trim()}%`);
  if (status) query = query.eq("status", status);
  if (invoice_id) query = query.eq("invoice_id", invoice_id);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  const { invoice_id, delivery_date, delivery_address, delivery_city, driver_name, vehicle_reg, notes, items } = parsed.data;

  const supabase = await createServiceClient();
  const db = supabase as any;

  // Validate invoice
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("id, customer_id")
    .eq("id", invoice_id)
    .eq("tenant_id", tenantId)
    .single();

  if (invErr || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Generate DN number
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "delivery_note",
  });

  const { data: tenant } = await db.from("tenants").select("delivery_note_prefix").eq("id", tenantId).single();
  const prefix = tenant?.delivery_note_prefix ?? "DN";
  const delivery_note_number = `${prefix}-${String(docNum ?? Date.now()).padStart(5, "0")}`;

  const { data: dn, error: dnErr } = await db
    .from("delivery_notes")
    .insert({
      tenant_id: tenantId,
      delivery_note_number,
      invoice_id,
      customer_id: invoice.customer_id,
      delivery_date,
      status: "pending",
      delivery_address: delivery_address ?? null,
      delivery_city: delivery_city ?? null,
      driver_name: driver_name ?? null,
      vehicle_reg: vehicle_reg ?? null,
      notes: notes ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (dnErr) return NextResponse.json({ error: dnErr.message }, { status: 500 });

  const lineItems = items.map((item, idx) => ({
    tenant_id: tenantId,
    delivery_note_id: dn.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit ?? "pcs",
    sort_order: item.sort_order ?? idx,
  }));

  const { error: liErr } = await db.from("delivery_note_items").insert(lineItems);
  if (liErr) {
    await db.from("delivery_notes").delete().eq("id", dn.id);
    return NextResponse.json({ error: liErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: dn }, { status: 201 });
}
