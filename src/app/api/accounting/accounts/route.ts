import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const accountSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  parentId: z.string().optional(),
  description: z.string().optional(),
});

// Default chart of accounts for new tenants
const DEFAULT_ACCOUNTS = [
  // Assets
  { code: "1000", name: "Cash & Cash Equivalents", type: "asset" },
  { code: "1010", name: "Petty Cash", type: "asset" },
  { code: "1020", name: "Bank Account - Main", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1200", name: "Inventory", type: "asset" },
  { code: "1300", name: "Prepaid Expenses", type: "asset" },
  { code: "1500", name: "Fixed Assets", type: "asset" },
  { code: "1510", name: "Equipment", type: "asset" },
  { code: "1520", name: "Furniture & Fittings", type: "asset" },
  // Liabilities
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "VAT Payable", type: "liability" },
  { code: "2200", name: "PAYE Payable", type: "liability" },
  { code: "2300", name: "NHIF Payable", type: "liability" },
  { code: "2400", name: "NSSF Payable", type: "liability" },
  { code: "2500", name: "Loans Payable", type: "liability" },
  { code: "2600", name: "Accrued Expenses", type: "liability" },
  // Equity
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "3200", name: "Share Capital", type: "equity" },
  // Revenue
  { code: "4000", name: "Sales Revenue", type: "revenue" },
  { code: "4100", name: "Service Revenue", type: "revenue" },
  { code: "4200", name: "Other Income", type: "revenue" },
  { code: "4300", name: "Interest Income", type: "revenue" },
  // Expenses
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  { code: "5100", name: "Salaries & Wages", type: "expense" },
  { code: "5200", name: "Rent & Utilities", type: "expense" },
  { code: "5300", name: "Office Supplies", type: "expense" },
  { code: "5400", name: "Marketing & Advertising", type: "expense" },
  { code: "5500", name: "Transport & Travel", type: "expense" },
  { code: "5600", name: "Communication", type: "expense" },
  { code: "5700", name: "Professional Fees", type: "expense" },
  { code: "5800", name: "Bank Charges", type: "expense" },
  { code: "5900", name: "Depreciation", type: "expense" },
  { code: "6000", name: "Miscellaneous Expenses", type: "expense" },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    let result = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, session.user.tenantId), eq(accounts.isActive, true)))
      .orderBy(accounts.code);

    // Seed default accounts if none exist
    if (result.length === 0) {
      const defaultAccounts = DEFAULT_ACCOUNTS.map(acc => ({
        id: createId(),
        tenantId: session.user.tenantId,
        code: acc.code,
        name: acc.name,
        type: acc.type as "asset" | "liability" | "equity" | "revenue" | "expense",
        isActive: true,
      }));
      await db.insert(accounts).values(defaultAccounts);
      result = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.tenantId, session.user.tenantId), eq(accounts.isActive, true)))
        .orderBy(accounts.code);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Accounts GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = accountSchema.parse(body);

    const newAccount = await db.insert(accounts).values({
      id: createId(),
      tenantId: session.user.tenantId,
      ...data,
      isActive: true,
    }).returning();

    return NextResponse.json({ success: true, data: newAccount[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to create account" }, { status: 500 });
  }
}