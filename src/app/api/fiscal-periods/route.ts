import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  name: z.string().min(1),
  start_date: z.string(),
  end_date: z.string(),
});

const generateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  start_month: z.number().int().min(1).max(12).optional().default(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("fiscal_periods")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .order("start_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Generate a full 12-month year in one call
  if (body.generate) {
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

    const { year, start_month } = parsed.data;
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const m = ((start_month - 1 + i) % 12) + 1;
      const y = year + Math.floor((start_month - 1 + i) / 12);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 0));
      rows.push({
        tenant_id: session.user.tenantId,
        year: y,
        name: `${y}-${String(m).padStart(2, "0")}`,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        status: "open",
      });
    }

    const supabase = await createServiceClient();
    const db = supabase as any;
    const { data, error } = await db.from("fiscal_periods").insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db
    .from("fiscal_periods")
    .insert({ ...parsed.data, tenant_id: session.user.tenantId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
