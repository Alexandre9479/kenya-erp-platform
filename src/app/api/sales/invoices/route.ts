import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { invoices, customers, users, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  total: z.number(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  invoiceNumber: z.string().min(1),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number(),
  taxAmount: z.number(),
  discount: z.number().default(0),
  total: z.number(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "partial", "overdue", "cancelled"]).default("draft"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

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
      .where(eq(invoices.tenantId, session.user.tenantId))
      .orderBy(desc(invoices.createdAt));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Invoices GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = invoiceSchema.parse(body);
    const tenantId = session.user.tenantId;

    const amountDue = data.total;

    const newInvoice = await db.insert(invoices).values({
      id: createId(),
      tenantId,
      invoiceNumber: data.invoiceNumber,
      customerId: data.customerId,
      status: data.status,
      issueDate: new Date(data.issueDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      items: data.items,
      subtotal: String(data.subtotal),
      taxAmount: String(data.taxAmount),
      discount: String(data.discount),
      total: String(data.total),
      amountPaid: "0",
      amountDue: String(amountDue),
      notes: data.notes || null,
      terms: data.terms || null,
      createdBy: session.user.id,
    }).returning();

    return NextResponse.json({ success: true, data: newInvoice[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    console.error("Invoice POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create invoice" }, { status: 500 });
  }
}