import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["open", "closed", "locked"]).optional(),
  name: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "closed") {
    update.closed_by = session.user.id;
    update.closed_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from("fiscal_periods")
    .update(update)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
