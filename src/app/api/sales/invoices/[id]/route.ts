import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { invoices, customers } from "@/lib/db/schema";
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
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        discount: invoices.discount,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        amountDue: invoices.amountDue,
        notes: invoices.notes,
        terms: invoices.terms,
        items: invoices.items,
        customerId: invoices.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.tenantId, session.user.tenantId)
        )
      )
      .limit(1);

    if (!result.length) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch invoice" }, { status: 500 });
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
      .update(invoices)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.tenantId, session.user.tenantId)
        )
      )
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update invoice" }, { status: 500 });
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
      .update(invoices)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.tenantId, session.user.tenantId)
        )
      );

    return NextResponse.json({ success: true, message: "Invoice cancelled" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to cancel invoice" }, { status: 500 });
  }
}