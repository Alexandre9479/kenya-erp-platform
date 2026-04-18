import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  employee_id: z.string().uuid().optional().nullable(),
  work_date: z.string(),
  hours: z.number().positive().max(24),
  billable: z.boolean().optional().default(true),
  hourly_rate: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  const projectId = searchParams.get("project_id");

  const supabase = await createServiceClient();
  const db = supabase as any;

  let q = db
    .from("timesheets")
    .select("*, projects(name, code), project_tasks(name), employees(first_name, last_name)")
    .eq("tenant_id", session.user.tenantId)
    .order("work_date", { ascending: false })
    .limit(200);

  if (employeeId) q = q.eq("employee_id", employeeId);
  if (projectId) q = q.eq("project_id", projectId);

  const { data, error } = await q;
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
    .from("timesheets")
    .insert({
      ...parsed.data,
      tenant_id: session.user.tenantId,
      user_id: session.user.id,
      status: "submitted",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
