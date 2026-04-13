import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type: z.enum(["annual", "sick", "maternity", "paternity", "compassionate", "unpaid"]),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  days: z.number().int().positive(),
  reason: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();
  const db = supabase as any;

  let query = db
    .from("leave_requests")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with employee names
  const rows = (data ?? []) as any[];
  const empIds = [...new Set(rows.map((r: any) => r.employee_id))];
  let empMap: Record<string, string> = {};

  if (empIds.length > 0) {
    const { data: emps } = await supabase.from("employees").select("id, full_name").in("id", empIds);
    (emps ?? []).forEach((e) => { empMap[e.id] = e.full_name; });
  }

  const enriched = rows.map((r: any) => ({
    ...r,
    employee_name: empMap[r.employee_id] ?? "—",
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("leave_requests")
    .insert({
      tenant_id: tenantId,
      employee_id: parsed.data.employee_id,
      leave_type: parsed.data.leave_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      days: parsed.data.days,
      reason: parsed.data.reason ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create notification
  await (supabase as any).from("notifications").insert({
    tenant_id: tenantId,
    user_id: null,
    title: "New Leave Request",
    message: `Leave request submitted for review (${parsed.data.leave_type}, ${parsed.data.days} days).`,
    type: "info",
    link: "/hr",
  });

  return NextResponse.json({ data }, { status: 201 });
}
