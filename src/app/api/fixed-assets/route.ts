import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  asset_number: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  assigned_to_employee_id: z.string().uuid().optional().nullable(),
  acquisition_date: z.string(),
  acquisition_cost: z.number().nonnegative(),
  supplier_id: z.string().uuid().optional().nullable(),
  depreciation_method: z.enum(["straight_line", "reducing_balance", "none"]),
  depreciation_rate: z.number().min(0).max(100).default(0),
  useful_life_years: z.number().int().positive().optional().nullable(),
  salvage_value: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("fixed_assets")
    .select("*, fixed_asset_categories(name, default_method, default_rate)")
    .eq("tenant_id", tenantId)
    .order("asset_number");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  // Auto-number if not given
  let assetNumber = parsed.data.asset_number;
  if (!assetNumber) {
    const { data: tenant } = await db.from("tenants").select("asset_prefix").eq("id", tenantId).single();
    const prefix = tenant?.asset_prefix ?? "FA";
    const { count } = await db.from("fixed_assets")
      .select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    assetNumber = `${prefix}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  const { data, error } = await db.from("fixed_assets").insert({
    tenant_id: tenantId,
    asset_number: assetNumber,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category_id: parsed.data.category_id ?? null,
    serial_number: parsed.data.serial_number ?? null,
    location: parsed.data.location ?? null,
    assigned_to_employee_id: parsed.data.assigned_to_employee_id ?? null,
    acquisition_date: parsed.data.acquisition_date,
    acquisition_cost: parsed.data.acquisition_cost,
    supplier_id: parsed.data.supplier_id ?? null,
    depreciation_method: parsed.data.depreciation_method,
    depreciation_rate: parsed.data.depreciation_rate,
    useful_life_years: parsed.data.useful_life_years ?? null,
    salvage_value: parsed.data.salvage_value,
    notes: parsed.data.notes ?? null,
    created_by: session.user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
