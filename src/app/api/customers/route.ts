import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.email().optional().or(z.literal("")).transform((v) => v || null),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  kra_pin: z.string().max(20).optional().nullable(),
  credit_limit: z.number().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
});

// ---------------------------------------------------------------------------
// GET /api/customers
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
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

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10))
  );
  const showInactive = searchParams.get("show_inactive") === "true";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createServiceClient();

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .range(from, to);

  if (!showInactive) {
    query = query.eq("is_active", true);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[GET /api/customers]", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

// ---------------------------------------------------------------------------
// POST /api/customers
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      is_active: true,
      current_balance: 0,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      kra_pin: parsed.data.kra_pin ?? null,
      credit_limit: parsed.data.credit_limit,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/customers]", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
