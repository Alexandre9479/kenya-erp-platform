import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Zod schema for PATCH
// ---------------------------------------------------------------------------
const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .optional(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  kra_pin: z.string().max(20).optional().nullable(),
  credit_limit: z.number().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

// ---------------------------------------------------------------------------
// GET /api/customers/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = (
    session.user as typeof session.user & { tenantId: string | null }
  ).tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const { id } = await params;

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// PATCH /api/customers/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = (
    session.user as typeof session.user & { tenantId: string | null }
  ).tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const supabase = await createServiceClient();

  // Verify ownership before updating
  const { data: existing, error: fetchError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("customers")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/customers/:id]", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// DELETE /api/customers/[id]   (soft delete — sets is_active = false)
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = (
    session.user as typeof session.user & { tenantId: string | null }
  ).tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const { id } = await params;

  const supabase = await createServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("customers")
    .select("id, current_balance, is_active")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (existing.current_balance > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot deactivate customer with an outstanding balance. Clear the balance first.",
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("[DELETE /api/customers/:id]", error);
    return NextResponse.json(
      { error: "Failed to deactivate customer" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
