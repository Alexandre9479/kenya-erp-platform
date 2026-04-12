import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateProductSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  category_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unit: z.string().min(1).optional(),
  cost_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  vat_rate: z.number().min(0).max(100).optional(),
  reorder_level: z.number().int().min(0).optional(),
  barcode: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = await createServiceClient();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("id, tenant_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const {
    sku,
    name,
    category_id,
    description,
    unit,
    cost_price,
    selling_price,
    vat_rate,
    reorder_level,
    barcode,
    image_url,
    is_active,
  } = parsed.data;

  type ProductUpdate = {
    sku?: string;
    name?: string;
    category_id?: string | null;
    description?: string | null;
    unit?: string;
    cost_price?: number;
    selling_price?: number;
    vat_rate?: number;
    reorder_level?: number;
    barcode?: string | null;
    image_url?: string | null;
    is_active?: boolean;
    updated_at: string;
  };

  const updatePayload: ProductUpdate = { updated_at: new Date().toISOString() };
  if (sku !== undefined) updatePayload.sku = sku.trim();
  if (name !== undefined) updatePayload.name = name.trim();
  if (category_id !== undefined) updatePayload.category_id = category_id ?? null;
  if (description !== undefined) updatePayload.description = description?.trim() ?? null;
  if (unit !== undefined) updatePayload.unit = unit.trim();
  if (cost_price !== undefined) updatePayload.cost_price = cost_price;
  if (selling_price !== undefined) updatePayload.selling_price = selling_price;
  if (vat_rate !== undefined) updatePayload.vat_rate = vat_rate;
  if (reorder_level !== undefined) updatePayload.reorder_level = reorder_level;
  if (barcode !== undefined) updatePayload.barcode = barcode?.trim() ?? null;
  if (image_url !== undefined) updatePayload.image_url = image_url ?? null;
  if (is_active !== undefined) updatePayload.is_active = is_active;

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { id } = await params;

  const supabase = await createServiceClient();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("id, tenant_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Soft delete — set is_active=false
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
