import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().min(2, "Warehouse name must be at least 2 characters"),
  location: z.string().optional().nullable(),
  is_default: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, location, is_default, is_active, created_at")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    session.user.role !== "tenant_admin" &&
    session.user.role !== "super_admin"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  if (parsed.data.is_default) {
    await supabase
      .from("warehouses")
      .update({ is_default: false })
      .eq("tenant_id", session.user.tenantId);
  }

  const { data, error } = await supabase
    .from("warehouses")
    .insert({
      tenant_id: session.user.tenantId,
      name: parsed.data.name.trim(),
      location: parsed.data.location?.trim() || null,
      is_default: parsed.data.is_default ?? false,
      is_active: true,
    })
    .select("id, name, location, is_default, is_active, created_at")
    .single();

  if (error) {
    console.error("[onboarding/warehouses POST]", error);
    return NextResponse.json(
      { error: "Could not create warehouse" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
