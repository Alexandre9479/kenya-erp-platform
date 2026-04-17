import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const allowed = [
    "name", "description", "category_id", "serial_number", "location",
    "assigned_to_employee_id", "depreciation_method", "depreciation_rate",
    "useful_life_years", "salvage_value", "notes",
  ];
  const update: any = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) update[k] = body[k];

  const { data, error } = await db.from("fixed_assets")
    .update(update).eq("id", id).eq("tenant_id", tenantId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServiceClient();
  const db = supabase as any;
  const { error } = await db.from("fixed_assets").delete()
    .eq("id", id).eq("tenant_id", session.user.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}
