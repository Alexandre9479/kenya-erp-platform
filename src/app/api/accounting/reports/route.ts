import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { invoices, expenses, accounts } from "@/lib/db/schema";
import { eq, and, gte, lte, sum } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || new Date(new Date().getFullYear(), 0, 1).toISOString();
    const to = searchParams.get("to") || new Date().toISOString();
    const tenantId = session.user.tenantId;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Total Revenue (paid invoices)
    const revenueResult = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, "paid"),
          gte(invoices.issueDate, fromDate),
          lte(invoices.issueDate, toDate)
        )
      );

    // Total Expenses
    const expenseResult = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(
        and(
          eq(expenses.tenantId, tenantId),
          gte(expenses.date, fromDate),
          lte(expenses.date, toDate)
        )
      );

    // Outstanding Receivables
    const receivablesResult = await db
      .select({ total: sum(invoices.amountDue) })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, "sent")
        )
      );

    // Overdue invoices
    const overdueResult = await db
      .select({ total: sum(invoices.amountDue) })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, "overdue")
        )
      );

    // Expenses by account
    const expensesByAccount = await db
      .select({
        accountName: accounts.name,
        accountCode: accounts.code,
        total: sum(expenses.amount),
      })
      .from(expenses)
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .where(
        and(
          eq(expenses.tenantId, tenantId),
          gte(expenses.date, fromDate),
          lte(expenses.date, toDate)
        )
      )
      .groupBy(accounts.name, accounts.code);

    const totalRevenue = Number(revenueResult[0]?.total || 0);
    const totalExpenses = Number(expenseResult[0]?.total || 0);
    const grossProfit = totalRevenue - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          grossProfit,
          profitMargin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0,
          receivables: Number(receivablesResult[0]?.total || 0),
          overdue: Number(overdueResult[0]?.total || 0),
        },
        expensesByAccount: expensesByAccount.filter(e => Number(e.total) > 0),
        period: { from, to },
      },
    });
  } catch (error) {
    console.error("Accounting reports error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate report" }, { status: 500 });
  }
}