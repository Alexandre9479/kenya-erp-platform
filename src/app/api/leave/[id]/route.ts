import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["approved", "rejected", "cancelled"]).optional(),
  rejection_reason: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const userId = session.user.id;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const updatePayload: Record<string, any> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status === "approved") {
    updatePayload.approved_by = userId;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from("leave_requests")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notification
  if (parsed.data.status) {
    const statusLabel = parsed.data.status === "approved" ? "approved" : parsed.data.status === "rejected" ? "rejected" : "cancelled";
    await db.from("notifications").insert({
      tenant_id: tenantId,
      user_id: null,
      title: `Leave Request ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
      message: `A leave request has been ${statusLabel}.`,
      type: parsed.data.status === "approved" ? "success" : parsed.data.status === "rejected" ? "error" : "warning",
      link: "/hr",
    });
  }

  return NextResponse.json({ data });
}
