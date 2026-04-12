import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as TablesUpdate<"expenses">;
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("expenses")
    .update(body)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = await createServiceClient();

  // Only allow deleting pending expenses
  const { data: existing } = await supabase
    .from("expenses")
    .select("status")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single();

  if (existing?.status === "approved") {
    return NextResponse.json({ error: "Cannot delete an approved expense" }, { status: 400 });
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
