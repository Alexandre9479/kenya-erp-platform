import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1),
  default_method: z.enum(["straight_line", "reducing_balance", "none"]),
  default_rate: z.number().min(0).max(100).default(0),
  default_useful_life_years: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db.from("fixed_asset_categories")
    .select("*").eq("tenant_id", session.user.tenantId).eq("is_active", true)
    .order("name");
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
  const { data, error } = await db.from("fixed_asset_categories").insert({
    tenant_id: session.user.tenantId,
    name: parsed.data.name,
    default_method: parsed.data.default_method,
    default_rate: parsed.data.default_rate,
    default_useful_life_years: parsed.data.default_useful_life_years ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
