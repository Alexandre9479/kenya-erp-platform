import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { lpos, suppliers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const lpoItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  total: z.number(),
});

const lpoSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  lpoNumber: z.string().min(1),
  issueDate: z.string(),
  deliveryDate: z.string().optional(),
  items: z.array(lpoItemSchema).min(1, "At least one item is required"),
  subtotal: z.number(),
  taxAmount: z.number(),
  discount: z.number().default(0),
  total: z.number(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected", "cancelled"]).default("draft"),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

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
        items: lpos.items,
        supplierId: lpos.supplierId,
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        createdAt: lpos.createdAt,
      })
      .from(lpos)
      .leftJoin(suppliers, eq(lpos.supplierId, suppliers.id))
      .where(eq(lpos.tenantId, session.user.tenantId))
      .orderBy(desc(lpos.createdAt));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("LPOs GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch LPOs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = lpoSchema.parse(body);

    const newLpo = await db.insert(lpos).values({
      id: createId(),
      tenantId: session.user.tenantId,
      lpoNumber: data.lpoNumber,
      supplierId: data.supplierId,
      status: data.status,
      issueDate: new Date(data.issueDate),
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      items: data.items,
      subtotal: String(data.subtotal),
      taxAmount: String(data.taxAmount),
      discount: String(data.discount),
      total: String(data.total),
      notes: data.notes || null,
      terms: data.terms || null,
      createdBy: session.user.id,
    }).returning();

    return NextResponse.json({ success: true, data: newLpo[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    console.error("LPO POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create LPO" }, { status: 500 });
  }
}