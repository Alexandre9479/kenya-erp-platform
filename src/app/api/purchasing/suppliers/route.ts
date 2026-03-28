import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { suppliers } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("Kenya"),
  kraPin: z.string().optional(),
  bankDetails: z.string().optional(),
  paymentTerms: z.string().default("30"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    let result = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, session.user.tenantId));

    if (search) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = supplierSchema.parse(body);

    const newSupplier = await db.insert(suppliers).values({
      id: createId(),
      tenantId: session.user.tenantId,
      ...data,
      email: data.email || null,
      isActive: true,
    }).returning();

    return NextResponse.json({ success: true, data: newSupplier[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to create supplier" }, { status: 500 });
  }
}