import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .update(categories)
      .set({ isActive: false })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.tenantId, session.user.tenantId)
        )
      );

    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}