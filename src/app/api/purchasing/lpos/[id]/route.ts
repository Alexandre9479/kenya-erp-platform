import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { lpos, suppliers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const result = await db
      .select({
        id: lpos.id,
        lpoNumber: lpos.lpoNumber,
        status: lpos.status,
        issueDate: lpos.issueDate,
        deliveryDate: lpos.deliveryDate,
        subtotal: lpos.subtotal,
        taxAmount: lpos.taxAmount,
        discount: lpos.discount,
        total: lpos.total,
        notes: lpos.notes,
        terms: lpos.terms,
        items: lpos.items,
        supplierId: lpos.supplierId,
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        supplierAddress: suppliers.address,
        createdAt: lpos.createdAt,
      })
      .from(lpos)
      .leftJoin(suppliers, eq(lpos.supplierId, suppliers.id))
      .where(and(eq(lpos.id, id), eq(lpos.tenantId, session.user.tenantId)))
      .limit(1);

    if (!result.length) return NextResponse.json({ success: false, error: "LPO not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch LPO" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updated = await db
      .update(lpos)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(lpos.id, id), eq(lpos.tenantId, session.user.tenantId)))
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update LPO" }, { status: 500 });
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

    await db
      .update(lpos)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(lpos.id, id), eq(lpos.tenantId, session.user.tenantId)));

    return NextResponse.json({ success: true, message: "LPO cancelled" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to cancel LPO" }, { status: 500 });
  }
}