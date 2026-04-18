import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const upsertSchema = z.object({
  api_username: z.string().optional().nullable(),
  api_password: z.string().optional().nullable(),
  default_channel_id: z.string().optional().nullable(),
  webhook_secret: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  test_mode: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data } = await db
    .from("payhero_config")
    .select("tenant_id, api_username, default_channel_id, enabled, test_mode, updated_at")
    .eq("tenant_id", session.user.tenantId)
    .maybeSingle();

  // Never return api_password / webhook_secret to the client
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("payhero_config")
    .upsert(
      {
        tenant_id: session.user.tenantId,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    )
    .select("tenant_id, api_username, default_channel_id, enabled, test_mode, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
