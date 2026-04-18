import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const clockSchema = z.object({
  employee_id: z.string().uuid(),
  action: z.enum(["in","out"]),
  source: z.enum(["manual","mobile","biometric","geofence","web"]).optional().default("web"),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = await createServiceClient();
  const db = supabase as any;

  let q = db
    .from("attendance_records")
    .select("*, employees(first_name, last_name)")
    .eq("tenant_id", session.user.tenantId)
    .order("work_date", { ascending: false })
    .limit(500);

  if (employeeId) q = q.eq("employee_id", employeeId);
  if (from) q = q.gte("work_date", from);
  if (to) q = q.lte("work_date", to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = clockSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await db
    .from("attendance_records")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .eq("employee_id", parsed.data.employee_id)
    .eq("work_date", today)
    .maybeSingle();

  const now = new Date().toISOString();

  if (parsed.data.action === "in") {
    if (existing?.clock_in) {
      return NextResponse.json({ error: "Already clocked in" }, { status: 400 });
    }
    const payload = {
      tenant_id: session.user.tenantId,
      employee_id: parsed.data.employee_id,
      work_date: today,
      clock_in: now,
      source: parsed.data.source,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      notes: parsed.data.notes ?? null,
      status: "present",
    };
    const q = existing
      ? db.from("attendance_records").update(payload).eq("id", existing.id)
      : db.from("attendance_records").insert(payload);
    const { data, error } = await q.select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  }

  // clock out
  if (!existing || !existing.clock_in) return NextResponse.json({ error: "Clock in first" }, { status: 400 });
  const hours = (new Date(now).getTime() - new Date(existing.clock_in).getTime()) / 1000 / 3600;

  const { data, error } = await db
    .from("attendance_records")
    .update({
      clock_out: now,
      hours_worked: Number(hours.toFixed(2)),
      notes: parsed.data.notes ?? existing.notes,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
