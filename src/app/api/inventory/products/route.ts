import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { products, categories } from "@/lib/db/schema";
import { eq, and, ilike, or, asc, desc, lt } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().default("pcs"),
  buyingPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(16),
  currentStock: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  maxStockLevel: z.number().optional(),
  warehouseLocation: z.string().optional(),
});

// GET - List all products
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const tenantId = session.user.tenantId;

    let query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        unit: products.unit,
        buyingPrice: products.buyingPrice,
        sellingPrice: products.sellingPrice,
        taxRate: products.taxRate,
        currentStock: products.currentStock,
        reorderLevel: products.reorderLevel,
        maxStockLevel: products.maxStockLevel,
        warehouseLocation: products.warehouseLocation,
        isActive: products.isActive,
        createdAt: products.createdAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          search
            ? or(
                ilike(products.name, `%${search}%`),
                ilike(products.sku, `%${search}%`)
              )
            : undefined,
          categoryId ? eq(products.categoryId, categoryId) : undefined,
          lowStock ? lt(products.currentStock, products.reorderLevel) : undefined
        )
      )
      .$dynamic();

    const result = await query.orderBy(
      sortOrder === "asc"
        ? asc(products[sortBy as keyof typeof products] as never)
        : desc(products[sortBy as keyof typeof products] as never)
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST - Create product
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = productSchema.parse(body);
    const tenantId = session.user.tenantId;

    const newProduct = await db.insert(products).values({
  id: createId(),
  tenantId,
  name: data.name,
  description: data.description,
  sku: data.sku,
  barcode: data.barcode || null,
  categoryId: data.categoryId && data.categoryId !== "" ? data.categoryId : null,
  unit: data.unit,
  buyingPrice: String(data.buyingPrice),
  sellingPrice: String(data.sellingPrice),
  taxRate: String(data.taxRate),
  currentStock: String(data.currentStock),
  reorderLevel: String(data.reorderLevel),
  maxStockLevel: data.maxStockLevel ? String(data.maxStockLevel) : null,
  warehouseLocation: data.warehouseLocation || null,
  isActive: true,
}).returning();

    return NextResponse.json({ success: true, data: newProduct[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    console.error("Product POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 });
  }
}