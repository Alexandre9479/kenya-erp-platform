import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1),
  period_type: z.enum(["annual", "quarterly", "monthly", "custom"]),
  period_start: z.string(),
  period_end: z.string(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db.from("budgets")
    .select("*").eq("tenant_id", session.user.tenantId)
    .order("period_start", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db.from("budgets").insert({
    tenant_id: session.user.tenantId,
    name: parsed.data.name,
    period_type: parsed.data.period_type,
    period_start: parsed.data.period_start,
    period_end: parsed.data.period_end,
    notes: parsed.data.notes ?? null,
    created_by: session.user.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
