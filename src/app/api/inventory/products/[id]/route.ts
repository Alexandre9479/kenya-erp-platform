import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().optional(),
  buyingPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  reorderLevel: z.number().min(0).optional(),
  maxStockLevel: z.number().optional(),
  warehouseLocation: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const tenantId = session.user.tenantId;

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.categoryId !== undefined) {
      updateData.categoryId = data.categoryId && data.categoryId !== "" ? data.categoryId : null;
      }

    if (data.buyingPrice !== undefined) updateData.buyingPrice = String(data.buyingPrice);
    if (data.sellingPrice !== undefined) updateData.sellingPrice = String(data.sellingPrice);
    if (data.taxRate !== undefined) updateData.taxRate = String(data.taxRate);
    if (data.reorderLevel !== undefined) updateData.reorderLevel = String(data.reorderLevel);
    if (data.maxStockLevel !== undefined) updateData.maxStockLevel = String(data.maxStockLevel);

    const updated = await db
      .update(products)
      .set(updateData)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tenantId = session.user.tenantId;

    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}