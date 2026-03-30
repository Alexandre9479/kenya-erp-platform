import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { invoices, receipts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "mpesa", "card"]),
  paymentDate: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = paymentSchema.parse(body);
    const tenantId = session.user.tenantId;

    // Get the invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "cancelled") {
      return NextResponse.json({ success: false, error: "Cannot record payment on a cancelled invoice" }, { status: 400 });
    }

    const currentAmountDue = Number(invoice.amountDue);
    if (data.amount > currentAmountDue + 0.01) {
      return NextResponse.json(
        { success: false, error: `Payment amount (${data.amount}) exceeds amount due (${currentAmountDue.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Calculate new amounts
    const newAmountPaid = Number(invoice.amountPaid) + data.amount;
    const newAmountDue = Number(invoice.total) - newAmountPaid;

    // Determine new status
    let newStatus: "paid" | "partial" | typeof invoice.status;
    if (newAmountDue <= 0.01) {
      newStatus = "paid";
    } else if (newAmountPaid > 0) {
      newStatus = "partial";
    } else {
      newStatus = invoice.status;
    }

    // Get receipt number
    const receiptCount = await db
      .select()
      .from(receipts)
      .where(eq(receipts.tenantId, tenantId));

    const receiptNumber = `RCP-${String(receiptCount.length + 1).padStart(5, "0")}`;

    // Update invoice
    await db
      .update(invoices)
      .set({
        amountPaid: String(newAmountPaid),
        amountDue: String(Math.max(0, newAmountDue)),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    // Create receipt record
    const receipt = await db.insert(receipts).values({
      id: createId(),
      tenantId,
      receiptNumber,
      invoiceId: id,
      customerId: invoice.customerId,
      amount: String(data.amount),
      paymentMethod: data.paymentMethod,
      paymentDate: new Date(data.paymentDate),
      reference: data.reference || null,
      notes: data.notes || null,
      createdBy: session.user.id,
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        receipt: receipt[0],
        invoice: {
          status: newStatus,
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
        },
      },
      message: newStatus === "paid"
        ? "Invoice fully paid! Receipt generated."
        : `Payment recorded. Remaining balance: KSh ${Math.max(0, newAmountDue).toLocaleString()}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    console.error("Payment POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to record payment" }, { status: 500 });
  }
}