import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  customer_id: z.string().uuid().optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget_amount: z.number().min(0).optional().default(0),
  currency_code: z.string().length(3).optional().default("KES"),
  billing_type: z.enum(["fixed","time_and_materials","non_billable"]).optional().default("time_and_materials"),
  hourly_rate: z.number().min(0).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db
    .from("projects")
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
  const { data, error } = await db
    .from("projects")
    .insert({ ...parsed.data, tenant_id: session.user.tenantId, created_by: session.user.id, status: "active" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
