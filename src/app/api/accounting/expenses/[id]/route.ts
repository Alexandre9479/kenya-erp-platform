import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.tenantId, session.user.tenantId)));

    return NextResponse.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete expense" }, { status: 500 });
  }
}