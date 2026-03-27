import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { customers } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  type: z.enum(["individual", "company", "government"]).default("company"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("Kenya"),
  kraPin: z.string().optional(),
  creditLimit: z.coerce.number().default(0),
  paymentTerms: z.string().default("30"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const result = await db
      .select()
      .from(customers)
      .where(
        search
          ? or(
              ilike(customers.name, `%${search}%`),
              ilike(customers.email, `%${search}%`),
              ilike(customers.phone, `%${search}%`)
            )
          : eq(customers.tenantId, session.user.tenantId)
      );

    const filtered = result.filter(c => c.tenantId === session.user.tenantId);
    return NextResponse.json({ success: true, data: search ? filtered : result });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = customerSchema.parse(body);

    const newCustomer = await db.insert(customers).values({
      id: createId(),
      tenantId: session.user.tenantId,
      ...data,
      email: data.email || null,
      creditLimit: String(data.creditLimit),
      isActive: true,
    }).returning();

    return NextResponse.json({ success: true, data: newCustomer[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to create customer" }, { status: 500 });
  }
}