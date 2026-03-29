import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updated = await db
      .update(accounts)
      .set(body)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, session.user.tenantId)))
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update account" }, { status: 500 });
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
      .update(accounts)
      .set({ isActive: false })
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, session.user.tenantId)));

    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete account" }, { status: 500 });
  }
}