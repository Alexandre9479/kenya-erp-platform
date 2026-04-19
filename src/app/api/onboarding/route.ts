import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  step: z.number().int().min(0).max(10).optional(),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, name, email, phone, address, city, country, kra_pin, logo_url, primary_color, currency, timezone, bank_name, bank_account, bank_branch, invoice_prefix, quote_prefix, lpo_prefix, receipt_prefix, dn_prefix, grn_prefix, terms_and_conditions, onboarding_completed, onboarding_step, onboarding_skipped"
    )
    .eq("id", session.user.tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
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

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();
  const db = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (
          c: string,
          v: string
        ) => {
          select: (c: string) => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof parsed.data.step === "number")
    patch.onboarding_step = parsed.data.step;
  if (typeof parsed.data.completed === "boolean")
    patch.onboarding_completed = parsed.data.completed;
  if (typeof parsed.data.skipped === "boolean")
    patch.onboarding_skipped = parsed.data.skipped;

  const { data, error } = await db
    .from("tenants")
    .update(patch)
    .eq("id", session.user.tenantId)
    .select("id, onboarding_completed, onboarding_step, onboarding_skipped")
    .single();

  if (error) {
    console.error("[onboarding PATCH]", error);
    return NextResponse.json(
      { error: "Could not update onboarding state" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
