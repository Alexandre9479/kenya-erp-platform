import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { parseCSVToObjects, toNumber, orNull } from "@/lib/csv/parse";

const rowSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unit: z.string().min(1, "Unit is required"),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  vat_rate: z.number().min(0).max(100),
  reorder_level: z.number().int().min(0),
  barcode: z.string().nullable().optional(),
});

type ImportError = { row: number; message: string };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  let body: { csv_text?: string };
  try {
    body = (await req.json()) as { csv_text?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const csv = (body.csv_text ?? "").trim();
  if (!csv) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  const { headers, rows } = parseCSVToObjects(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }

  const required = ["sku", "name", "unit", "cost_price", "selling_price"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Pre-load categories for lookup by name (case-insensitive)
  const { data: categoryData } = await supabase
    .from("categories")
    .select("id, name")
    .eq("tenant_id", tenantId);

  const categoryMap = new Map<string, string>();
  (categoryData ?? []).forEach((c: { id: string; name: string }) => {
    categoryMap.set(c.name.trim().toLowerCase(), c.id);
  });

  const errors: ImportError[] = [];
  const validRows: Array<{
    tenant_id: string;
    sku: string;
    name: string;
    category_id: string | null;
    description: string | null;
    unit: string;
    cost_price: number;
    selling_price: number;
    vat_rate: number;
    reorder_level: number;
    is_active: boolean;
    barcode: string | null;
    image_url: string | null;
  }> = [];

  const newCategoryNames = new Set<string>();

  rows.forEach((r) => {
    const cat = (r.category ?? "").trim();
    if (cat && !categoryMap.has(cat.toLowerCase())) {
      newCategoryNames.add(cat);
    }
  });

  // Auto-create missing categories
  if (newCategoryNames.size > 0) {
    const toInsert = Array.from(newCategoryNames).map((name) => ({
      tenant_id: tenantId,
      name,
      description: null,
      parent_id: null,
    }));
    const { data: created, error: catErr } = await supabase
      .from("categories")
      .insert(toInsert)
      .select("id, name");
    if (catErr) {
      console.error("[import/products] category create error", catErr);
    } else {
      (created ?? []).forEach((c: { id: string; name: string }) => {
        categoryMap.set(c.name.trim().toLowerCase(), c.id);
      });
    }
  }

  rows.forEach((r, idx) => {
    const rowNum = idx + 2;
    const categoryName = (r.category ?? "").trim();
    const candidate = {
      sku: (r.sku ?? "").trim(),
      name: (r.name ?? "").trim(),
      category: categoryName || null,
      description: orNull(r.description),
      unit: (r.unit ?? "").trim(),
      cost_price: toNumber(r.cost_price),
      selling_price: toNumber(r.selling_price),
      vat_rate: toNumber(r.vat_rate),
      reorder_level: Math.floor(toNumber(r.reorder_level)),
      barcode: orNull(r.barcode),
    };

    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({
        row: rowNum,
        message: parsed.error.issues[0]?.message ?? "Validation failed",
      });
      return;
    }

    const categoryId = categoryName
      ? categoryMap.get(categoryName.toLowerCase()) ?? null
      : null;

    validRows.push({
      tenant_id: tenantId,
      sku: parsed.data.sku,
      name: parsed.data.name,
      category_id: categoryId,
      description: parsed.data.description ?? null,
      unit: parsed.data.unit,
      cost_price: parsed.data.cost_price,
      selling_price: parsed.data.selling_price,
      vat_rate: parsed.data.vat_rate,
      reorder_level: parsed.data.reorder_level,
      is_active: true,
      barcode: parsed.data.barcode ?? null,
      image_url: null,
    });
  });

  let inserted = 0;
  if (validRows.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .insert(validRows)
      .select("id");

    if (error) {
      console.error("[POST /api/import/products]", error);
      return NextResponse.json(
        { error: `Insert failed: ${error.message}`, errors },
        { status: 500 }
      );
    }
    inserted = data?.length ?? 0;
  }

  return NextResponse.json({
    inserted,
    failed: errors.length,
    total: rows.length,
    errors,
  });
}
