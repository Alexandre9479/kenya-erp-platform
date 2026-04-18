import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const decideSchema = z.object({
  decision: z.enum(["approved", "rejected", "cancelled"]),
  decision_note: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = decideSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: existing, error: fetchErr } = await db
    .from("approval_requests")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single();
  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Already decided" }, { status: 400 });
  }

  const role = session.user.role;
  const uid = session.user.id;
  const canDecide =
    role === "super_admin" ||
    role === "tenant_admin" ||
    (existing.approver_user_id && existing.approver_user_id === uid) ||
    (existing.approver_role && existing.approver_role === role) ||
    (parsed.data.decision === "cancelled" && existing.requested_by === uid);

  if (!canDecide) return NextResponse.json({ error: "Not authorised to decide" }, { status: 403 });

  const { data, error } = await db
    .from("approval_requests")
    .update({
      status: parsed.data.decision,
      decided_by: uid,
      decided_at: new Date().toISOString(),
      decision_note: parsed.data.decision_note ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
