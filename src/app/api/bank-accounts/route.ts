import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  bank_name: z.string().min(1, "Bank name is required"),
  account_name: z.string().optional().nullable(),
  account_number: z.string().min(1, "Account number is required"),
  branch: z.string().optional().nullable(),
  swift_code: z.string().optional().nullable(),
  is_default: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  const { data, error } = await (supabase as any)
    .from("bank_accounts")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();

  // If this is set as default, unset any existing default
  if (parsed.data.is_default) {
    await (supabase as any)
      .from("bank_accounts")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("is_default", true);
  }

  // If this is the first account, make it default
  const { count } = await (supabase as any)
    .from("bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const isFirst = (count ?? 0) === 0;

  const { data, error } = await (supabase as any)
    .from("bank_accounts")
    .insert({
      tenant_id: tenantId,
      bank_name: parsed.data.bank_name,
      account_name: parsed.data.account_name ?? null,
      account_number: parsed.data.account_number,
      branch: parsed.data.branch ?? null,
      swift_code: parsed.data.swift_code ?? null,
      is_default: parsed.data.is_default ?? isFirst,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
