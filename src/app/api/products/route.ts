import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  category_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unit: z.string().min(1, "Unit is required"),
  cost_price: z.number().min(0, "Cost price must be 0 or more"),
  selling_price: z.number().min(0, "Selling price must be 0 or more"),
  vat_rate: z.number().min(0).max(100),
  reorder_level: z.number().int().min(0),
  barcode: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("category_id") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const showInactive = searchParams.get("show_inactive") === "true";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createServiceClient();

  let query = supabase
    .from("products")
    .select("*, categories(name), stock_levels(quantity)", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (!showInactive) {
    query = query.eq("is_active", true);
  }

  if (search.trim()) {
    query = query.or(
      `name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`
    );
  }

  if (categoryId.trim()) {
    query = query.eq("category_id", categoryId.trim());
  }

  query = query.order("name", { ascending: true }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type RawProduct = {
    id: string;
    tenant_id: string;
    category_id: string | null;
    sku: string;
    name: string;
    description: string | null;
    unit: string;
    cost_price: number;
    selling_price: number;
    vat_rate: number;
    reorder_level: number;
    is_active: boolean;
    image_url: string | null;
    barcode: string | null;
    created_at: string;
    updated_at: string;
    categories: { name: string } | null;
    stock_levels: { quantity: number }[];
  };

  const enriched = (data as unknown as RawProduct[]).map((product) => {
    const category_name = product.categories?.name ?? null;
    const total_stock = Array.isArray(product.stock_levels)
      ? product.stock_levels.reduce((sum, sl) => sum + sl.quantity, 0)
      : 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categories, stock_levels, ...rest } = product;
    return { ...rest, category_name, total_stock };
  });

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
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
  } = parsed.data;

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      tenant_id: tenantId,
      sku: sku.trim(),
      name: name.trim(),
      category_id: category_id ?? null,
      description: description?.trim() ?? null,
      unit: unit.trim(),
      cost_price,
      selling_price,
      vat_rate,
      reorder_level,
      is_active: true,
      barcode: barcode?.trim() ?? null,
      image_url: image_url ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
