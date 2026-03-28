import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { lpos, suppliers, tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [lpoResult] = await db
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
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        supplierAddress: suppliers.address,
      })
      .from(lpos)
      .leftJoin(suppliers, eq(lpos.supplierId, suppliers.id))
      .where(and(eq(lpos.id, id), eq(lpos.tenantId, session.user.tenantId)))
      .limit(1);

    if (!lpoResult) return NextResponse.json({ success: false, error: "LPO not found" }, { status: 404 });

    const [tenantResult] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.user.tenantId))
      .limit(1);

    return NextResponse.json({ success: true, data: { lpo: lpoResult, tenant: tenantResult } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch LPO data" }, { status: 500 });
  }
}