import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types/supabase";

// ─── Schema ───────────────────────────────────────────────────────────────────

const patchUserSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").optional(),
  role: z
    .enum([
      "super_admin",
      "tenant_admin",
      "accountant",
      "sales",
      "purchasing",
      "warehouse",
      "hr",
      "viewer",
    ])
    .optional(),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

// ─── PATCH /api/users/[id] ────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "No tenant associated with this account" }, { status: 400 });
    }
    if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Verify the target user belongs to this tenant
    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("id, role, tenant_id")
      .eq("id", id)
      .eq("tenant_id", session.user.tenantId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // tenant_admin cannot change their own role
    if (
      session.user.role === "tenant_admin" &&
      session.user.id === id &&
      parsed.data.role !== undefined
    ) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 403 }
      );
    }

    const updatePayload: TablesUpdate<"users"> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", session.user.tenantId)
      .select(
        "id, tenant_id, email, full_name, role, is_active, phone, avatar_url, last_login_at, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("[users PATCH]", error);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[users PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/users/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "No tenant associated with this account" }, { status: 400 });
    }
    if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot delete self
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account." },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Verify target user belongs to this tenant
    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", session.user.tenantId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Soft delete — set is_active = false
    const { error } = await supabase
      .from("users")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", session.user.tenantId);

    if (error) {
      console.error("[users DELETE]", error);
      return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[users DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
