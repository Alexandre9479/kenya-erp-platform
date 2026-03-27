import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { invoices, customers, tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [invoiceResult] = await db
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
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        customerAddress: customers.address,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, session.user.tenantId)))
      .limit(1);

    if (!invoiceResult) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const [tenantResult] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.user.tenantId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: { invoice: invoiceResult, tenant: tenantResult },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch invoice data" }, { status: 500 });
  }
}