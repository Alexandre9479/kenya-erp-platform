import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: budget } = await db.from("budgets")
    .select("*").eq("id", id).eq("tenant_id", session.user.tenantId).single();
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: lines } = await db.from("budget_lines")
    .select("*, accounts(code, name, account_type)")
    .eq("tenant_id", session.user.tenantId)
    .eq("budget_id", id)
    .order("period_year")
    .order("period_month");

  return NextResponse.json({ data: { budget, lines: lines ?? [] } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const supabase = await createServiceClient();
  const db = supabase as any;

  const allowed = ["name", "status", "notes"];
  const update: any = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) update[k] = body[k];
  if (body.status === "approved") {
    update.approved_at = new Date().toISOString();
    update.approved_by = session.user.id;
  }

  const { data, error } = await db.from("budgets").update(update)
    .eq("id", id).eq("tenant_id", session.user.tenantId).select().single();
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
  const { error } = await db.from("budgets").delete()
    .eq("id", id).eq("tenant_id", session.user.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}
