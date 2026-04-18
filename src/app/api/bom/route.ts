import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  component_id: z.string().uuid(),
  quantity: z.number().positive(),
  uom: z.string().optional().nullable(),
  scrap_pct: z.number().min(0).max(100).optional().default(0),
});

const createSchema = z.object({
  product_id: z.string().uuid(),
  code: z.string().min(1),
  version: z.string().optional().default("v1"),
  output_qty: z.number().positive().optional().default(1),
  labour_cost: z.number().min(0).optional().default(0),
  overhead_cost: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("bill_of_materials")
    .select("*, products:product_id(name, sku)")
    .eq("tenant_id", session.user.tenantId)
    .eq("is_active", true)
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
  const tenantId = session.user.tenantId;

  const { items, ...head } = parsed.data;
  const { data: bom, error } = await db
    .from("bill_of_materials")
    .insert({ ...head, tenant_id: tenantId, created_by: session.user.id })
    .select()
    .single();

  if (error || !bom) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  const itemRows = items.map((i) => ({ ...i, tenant_id: tenantId, bom_id: bom.id }));
  const { error: itemsErr } = await db.from("bom_items").insert(itemRows);
  if (itemsErr) {
    await db.from("bill_of_materials").delete().eq("id", bom.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: bom }, { status: 201 });
}
