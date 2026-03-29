import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { journalEntries, journalLines, accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.tenantId, session.user.tenantId)))
      .limit(1);

    if (!entry) return NextResponse.json({ success: false, error: "Journal entry not found" }, { status: 404 });

    const lines = await db
      .select({
        id: journalLines.id,
        accountId: journalLines.accountId,
        description: journalLines.description,
        debit: journalLines.debit,
        credit: journalLines.credit,
        accountName: accounts.name,
        accountCode: accounts.code,
      })
      .from(journalLines)
      .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(eq(journalLines.journalEntryId, id));

    return NextResponse.json({ success: true, data: { ...entry, lines } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch journal entry" }, { status: 500 });
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

    // Delete lines first (cascade)
    await db.delete(journalLines).where(eq(journalLines.journalEntryId, id));

    // Delete entry
    await db
      .delete(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.tenantId, session.user.tenantId)));

    return NextResponse.json({ success: true, message: "Journal entry deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete journal entry" }, { status: 500 });
  }
}