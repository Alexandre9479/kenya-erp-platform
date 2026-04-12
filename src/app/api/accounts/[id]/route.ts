import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types/supabase";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  sub_type: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("accounts")
    .select("id, is_system")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.is_system) return NextResponse.json({ error: "System accounts cannot be modified" }, { status: 400 });

  const updatePayload: TablesUpdate<"accounts"> = { ...parsed.data };

  const { data, error } = await supabase
    .from("accounts")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("accounts")
    .select("id, is_system")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.is_system) return NextResponse.json({ error: "System accounts cannot be deleted" }, { status: 400 });

  const updatePayload: TablesUpdate<"accounts"> = { is_active: false };

  const { error } = await supabase
    .from("accounts")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
