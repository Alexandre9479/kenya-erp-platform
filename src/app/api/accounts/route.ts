import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  code: z.string().min(1, "Code required"),
  name: z.string().min(1, "Name required"),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  sub_type: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const search = searchParams.get("search") ?? "";

  const supabase = await createServiceClient();

  let query = supabase
    .from("accounts")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("code");

  if (type) query = query.eq("type", type as "asset" | "liability" | "equity" | "revenue" | "expense");
  if (search.trim()) query = query.or(`name.ilike.%${search.trim()}%,code.ilike.%${search.trim()}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      tenant_id: tenantId,
      code: parsed.data.code,
      name: parsed.data.name,
      type: parsed.data.type,
      sub_type: parsed.data.sub_type ?? null,
      parent_id: parsed.data.parent_id ?? null,
      description: parsed.data.description ?? null,
      is_active: true,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Account code already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
