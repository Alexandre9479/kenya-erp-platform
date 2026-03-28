import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["individual", "company", "government"]).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  kraPin: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
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

    const updated = await db
      .update(customers)
      .set({
        ...data,
        email: data.email || null,
        creditLimit: data.creditLimit !== undefined ? String(data.creditLimit) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.tenantId, session.user.tenantId)))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 500 });
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
      .update(customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, session.user.tenantId)));

    return NextResponse.json({ success: true, message: "Customer deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete customer" }, { status: 500 });
  }
}