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

const createSchema = z.object({
  name: z.string().min(1),
  customer_id: z.string().uuid(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  interval_count: z.number().int().positive().optional().default(1),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  next_run_date: z.string().optional().nullable(),
  max_runs: z.number().int().positive().optional().nullable(),
  currency_code: z.string().length(3).optional().default("KES"),
  payment_terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  auto_send_email: z.boolean().optional().default(false),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db
    .from("recurring_invoice_templates")
    .select("*, customers(name)")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { items, next_run_date, start_date, ...head } = parsed.data;

  const { data: tpl, error } = await db
    .from("recurring_invoice_templates")
    .insert({
      ...head,
      tenant_id: session.user.tenantId,
      start_date,
      next_run_date: next_run_date ?? start_date,
      created_by: session.user.id,
      status: "active",
    })
    .select()
    .single();

  if (error || !tpl) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  const rows = items.map((i) => ({ ...i, tenant_id: session.user.tenantId, template_id: tpl.id }));
  const { error: itemsErr } = await db.from("recurring_invoice_items").insert(rows);
  if (itemsErr) {
    await db.from("recurring_invoice_templates").delete().eq("id", tpl.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: tpl }, { status: 201 });
}
