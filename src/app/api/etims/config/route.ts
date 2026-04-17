import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  environment: z.enum(["sandbox", "production"]),
  device_type: z.enum(["OSCU", "VSCU"]),
  device_serial: z.string().optional().nullable(),
  kra_pin: z.string().optional().nullable(),
  branch_id: z.string().optional().nullable(),
  endpoint_url: z.string().optional().nullable(),
  api_key: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data } = await db.from("etims_config")
    .select("*").eq("tenant_id", session.user.tenantId).maybeSingle();
  return NextResponse.json({ data });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: existing } = await db.from("etims_config").select("id")
    .eq("tenant_id", tenantId).maybeSingle();

  const payload = {
    ...parsed.data,
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await db.from("etims_config")
      .update(payload).eq("id", existing.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const { data, error } = await db.from("etims_config").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
