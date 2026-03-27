import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, session.user.tenantId))
      .orderBy(categories.name);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = categorySchema.parse(body);

    const newCategory = await db.insert(categories).values({
      id: createId(),
      tenantId: session.user.tenantId,
      ...data,
      isActive: true,
    }).returning();

    return NextResponse.json({ success: true, data: newCategory[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 });
  }
}