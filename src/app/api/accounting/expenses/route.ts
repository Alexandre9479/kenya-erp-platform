import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { expenses, accounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const expenseSchema = z.object({
  accountId: z.string().optional(),
  date: z.string(),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "mpesa", "card"]).default("cash"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const result = await db
      .select({
        id: expenses.id,
        date: expenses.date,
        description: expenses.description,
        amount: expenses.amount,
        paymentMethod: expenses.paymentMethod,
        reference: expenses.reference,
        notes: expenses.notes,
        createdAt: expenses.createdAt,
        accountId: expenses.accountId,
        accountName: accounts.name,
        accountCode: accounts.code,
      })
      .from(expenses)
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .where(eq(expenses.tenantId, session.user.tenantId))
      .orderBy(desc(expenses.date));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = expenseSchema.parse(body);

    const newExpense = await db.insert(expenses).values({
      id: createId(),
      tenantId: session.user.tenantId,
      accountId: data.accountId || null,
      date: new Date(data.date),
      description: data.description,
      amount: String(data.amount),
      paymentMethod: data.paymentMethod,
      reference: data.reference || null,
      createdBy: session.user.id,
    }).returning();

    return NextResponse.json({ success: true, data: newExpense[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    console.error("Expense POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create expense" }, { status: 500 });
  }
}