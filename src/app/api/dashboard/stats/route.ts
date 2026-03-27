import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { invoices, products, customers, employees, expenses } from "@/lib/db/schema";
import { eq, and, gte, count, sum, lt } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Total customers
    const [customerCount] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    // Total products
    const [productCount] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    // Low stock items
    const lowStockItems = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          lt(products.currentStock, products.reorderLevel)
        )
      );

    // Total employees
    const [employeeCount] = await db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.tenantId, tenantId));

    // Revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthRevenue] = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          gte(invoices.createdAt, startOfMonth)
        )
      );

    // Total invoices
    const [invoiceCount] = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));

    return NextResponse.json({
      success: true,
      data: {
        customers: customerCount.count,
        products: productCount.count,
        lowStock: lowStockItems.length,
        employees: employeeCount.count,
        monthRevenue: Number(monthRevenue.total || 0),
        invoices: invoiceCount.count,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}