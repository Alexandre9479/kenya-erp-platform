import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  tax_rate: z.number().min(0).max(100).optional().default(16),
  discount_pct: z.number().min(0).max(100).optional().default(0),
});

const paymentSchema = z.object({
  payment_method: z.string(),
  amount: z.number().positive(),
  payment_channel_id: z.string().uuid().optional().nullable(),
  reference: z.string().optional().nullable(),
  payhero_transaction_id: z.string().uuid().optional().nullable(),
});

const createSchema = z.object({
  session_id: z.string().uuid(),
  customer_id: z.string().uuid().optional().nullable(),
  items: z.array(itemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  const supabase = await createServiceClient();
  const db = supabase as any;

  let q = db
    .from("pos_orders")
    .select("*, customers(name)")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (sessionId) q = q.eq("session_id", sessionId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const subtotal = parsed.data.items.reduce((s, i) => {
    const gross = i.quantity * i.unit_price;
    const disc = gross * (i.discount_pct / 100);
    return s + (gross - disc);
  }, 0);
  const taxTotal = parsed.data.items.reduce((s, i) => {
    const gross = i.quantity * i.unit_price;
    const disc = gross * (i.discount_pct / 100);
    const net = gross - disc;
    return s + net * (i.tax_rate / 100);
  }, 0);
  const discountTotal = parsed.data.items.reduce((s, i) => {
    const gross = i.quantity * i.unit_price;
    return s + gross * (i.discount_pct / 100);
  }, 0);
  const total = subtotal + taxTotal;
  const paid = parsed.data.payments.reduce((s, p) => s + p.amount, 0);

  const { data: numData } = await db.rpc("next_doc_number", { p_tenant_id: tenantId, p_doc_type: "pos_order" });
  const orderNumber = `POS-O-${String(numData ?? 1).padStart(6, "0")}`;

  const { data: order, error } = await db
    .from("pos_orders")
    .insert({
      tenant_id: tenantId,
      session_id: parsed.data.session_id,
      order_number: orderNumber,
      customer_id: parsed.data.customer_id ?? null,
      subtotal, tax_total: taxTotal, discount_total: discountTotal,
      total,
      paid_total: paid,
      change_due: Math.max(0, paid - total),
      status: "completed",
    })
    .select()
    .single();

  if (error || !order) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  const paymentRows = parsed.data.payments.map((p) => ({
    tenant_id: tenantId,
    order_id: order.id,
    payment_method: p.payment_method,
    amount: p.amount,
    payment_channel_id: p.payment_channel_id ?? null,
    reference: p.reference ?? null,
    payhero_transaction_id: p.payhero_transaction_id ?? null,
  }));
  await db.from("pos_order_payments").insert(paymentRows);

  return NextResponse.json({ data: order }, { status: 201 });
}
