import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { journalEntries, journalLines, accounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const journalLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  description: z.string().optional(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});

const journalSchema = z.object({
  date: z.string(),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, "At least 2 lines required"),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // Get all journal entries
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, session.user.tenantId))
      .orderBy(desc(journalEntries.date));

    // Get lines for each entry
    const entriesWithLines = await Promise.all(
      entries.map(async (entry) => {
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
          .where(eq(journalLines.journalEntryId, entry.id));

        return { ...entry, lines };
      })
    );

    return NextResponse.json({ success: true, data: entriesWithLines });
  } catch (error) {
    console.error("Journals GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch journals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = journalSchema.parse(body);

    // Validate double entry — debits must equal credits
    const totalDebits = data.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredits = data.lines.reduce((sum, l) => sum + Number(l.credit), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { success: false, error: `Journal is not balanced. Debits (${totalDebits.toFixed(2)}) must equal Credits (${totalCredits.toFixed(2)})` },
        { status: 400 }
      );
    }

    if (totalDebits === 0) {
      return NextResponse.json(
        { success: false, error: "Journal entry cannot have zero amounts" },
        { status: 400 }
      );
    }

    // Get next journal number
    const count = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, session.user.tenantId));

    const entryNumber = `JNL-${String(count.length + 1).padStart(5, "0")}`;

    // Create journal entry
    const entryId = createId();
    await db.insert(journalEntries).values({
      id: entryId,
      tenantId: session.user.tenantId,
      entryNumber,
      date: new Date(data.date),
      description: data.description,
      reference: data.reference || null,
      createdBy: session.user.id,
    });

    // Create journal lines
    await db.insert(journalLines).values(
      data.lines.map((line) => ({
        id: createId(),
        journalEntryId: entryId,
        accountId: line.accountId,
        description: line.description || null,
        debit: String(line.debit),
        credit: String(line.credit),
      }))
    );

    return NextResponse.json({
      success: true,
      data: { id: entryId, entryNumber },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    console.error("Journal POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create journal entry" }, { status: 500 });
  }
}