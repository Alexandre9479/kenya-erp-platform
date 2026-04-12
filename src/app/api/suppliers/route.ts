import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  kra_pin: z.string().optional().nullable(),
  payment_terms: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name")
    .range(offset, offset + limit - 1);

  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

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
    .from("suppliers")
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      kra_pin: parsed.data.kra_pin ?? null,
      payment_terms: parsed.data.payment_terms ?? 30,
      notes: parsed.data.notes ?? null,
      is_active: true,
      current_balance: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
