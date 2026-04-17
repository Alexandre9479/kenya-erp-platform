import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// ─── Validation ───────────────────────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.email().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  kra_pin: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  bank_branch: z.string().optional().nullable(),
  invoice_prefix: z.string().min(1).max(10).optional(),
  quote_prefix: z.string().min(1).max(10).optional(),
  lpo_prefix: z.string().min(1).max(10).optional(),
  credit_note_prefix: z.string().min(1).max(10).optional(),
  delivery_note_prefix: z.string().min(1).max(10).optional(),
  asset_prefix: z.string().min(1).max(10).optional(),
  receipt_prefix: z.string().min(1).max(10).optional(),
  payment_prefix: z.string().min(1).max(10).optional(),
  expense_prefix: z.string().min(1).max(10).optional(),
  journal_prefix: z.string().min(1).max(10).optional(),
  bill_prefix: z.string().min(1).max(10).optional(),
  grn_prefix: z.string().min(1).max(10).optional(),
  terms_and_conditions: z.string().optional().nullable(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

// ─── GET /api/settings ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "No tenant associated with this account" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", session.user.tenantId)
      .single();

    if (error || !data) {
      console.error("[settings GET]", error);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[settings GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/settings ──────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "No tenant associated with this account" }, { status: 400 });
    }
    // Only tenant_admin and super_admin can update settings
    if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("tenants")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", session.user.tenantId)
      .select("*")
      .single();

    if (error) {
      console.error("[settings PATCH]", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[settings PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
