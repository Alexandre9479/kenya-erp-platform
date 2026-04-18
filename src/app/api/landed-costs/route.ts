import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  bill_number: z.string().min(1),
  purchase_order_id: z.string().uuid().optional().nullable(),
  grn_id: z.string().uuid().optional().nullable(),
  cost_type: z.enum(["freight","duty","clearing","insurance","handling","inspection","demurrage","other"]),
  supplier_id: z.string().uuid().optional().nullable(),
  bill_date: z.string(),
  reference: z.string().optional().nullable(),
  amount: z.number().positive(),
  currency_code: z.string().length(3).optional().default("KES"),
  fx_rate: z.number().positive().optional().default(1),
  allocation_method: z.enum(["value","quantity","weight","equal"]).optional().default("value"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("landed_cost_bills")
    .select("*, suppliers(name), purchase_orders(po_number), goods_received_notes(grn_number)")
    .eq("tenant_id", session.user.tenantId)
    .order("bill_date", { ascending: false })
    .limit(200);

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

  const { data, error } = await db
    .from("landed_cost_bills")
    .insert({ ...parsed.data, tenant_id: session.user.tenantId, created_by: session.user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
