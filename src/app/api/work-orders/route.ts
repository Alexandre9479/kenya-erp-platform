import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  product_id: z.string().uuid(),
  bom_id: z.string().uuid().optional().nullable(),
  warehouse_id: z.string().uuid().optional().nullable(),
  planned_qty: z.number().positive(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("work_orders")
    .select("*, products:product_id(name, sku), warehouses(name)")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: false })
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

  const { data: numData } = await db.rpc("next_doc_number", {
    p_tenant_id: session.user.tenantId,
    p_doc_type: "work_order",
  });
  const woNumber = `WO-${String(numData ?? 1).padStart(6, "0")}`;

  const { data, error } = await db
    .from("work_orders")
    .insert({
      ...parsed.data,
      tenant_id: session.user.tenantId,
      wo_number: woNumber,
      status: "draft",
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
