import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const CHANNEL_TYPES = [
  "cash",
  "mpesa_till",
  "mpesa_paybill",
  "mpesa_send",
  "bank",
  "cheque",
  "card",
  "other",
] as const;

const schema = z.object({
  name: z.string().min(1).max(120),
  channel_type: z.enum(CHANNEL_TYPES),
  mpesa_shortcode: z.string().optional().nullable(),
  mpesa_account_template: z.string().optional().nullable(),
  mpesa_phone: z.string().optional().nullable(),
  bank_account_id: z.string().uuid().optional().nullable(),
  provider: z.string().optional().nullable(),
  account_ref: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db
    .from("payment_channels")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .order("is_default", { ascending: false })
    .order("channel_type")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  // If is_default, clear other defaults
  if (parsed.data.is_default) {
    await db.from("payment_channels").update({ is_default: false }).eq("tenant_id", tenantId);
  }

  const { data, error } = await db
    .from("payment_channels")
    .insert({ ...parsed.data, tenant_id: tenantId, created_by: session.user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
