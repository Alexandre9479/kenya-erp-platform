import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "summary";
  const from = searchParams.get("from") ?? new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

  const supabase = await createServiceClient();

  if (type === "summary") {
    const [invoicesResult, posResult, customersResult, productsResult, stockResult, paymentsResult] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount, amount_paid, status, issue_date")
        .eq("tenant_id", tenantId)
        .gte("issue_date", from)
        .lte("issue_date", to),
      supabase
        .from("purchase_orders")
        .select("total_amount, status, issue_date")
        .eq("tenant_id", tenantId)
        .gte("issue_date", from)
        .lte("issue_date", to),
      supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("stock_levels")
        .select("quantity")
        .eq("tenant_id", tenantId),
      supabase
        .from("invoices")
        .select("amount_paid, issue_date")
        .eq("tenant_id", tenantId)
        .gte("issue_date", from)
        .lte("issue_date", to)
        .gt("amount_paid", 0),
    ]);

    const invoices = invoicesResult.data ?? [];
    const pos = posResult.data ?? [];

    const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
    const totalReceived = invoices.reduce((s, i) => s + (i.amount_paid ?? 0), 0);
    const totalPurchases = pos.reduce((s, p) => s + (p.total_amount ?? 0), 0);
    const outstanding = totalRevenue - totalReceived;
    const invoiceCount = invoices.length;
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    const overdueCount = invoices.filter((i) => i.status === "overdue" || (i.status === "sent" && new Date(i.issue_date) < new Date())).length;
    const totalStockItems = (stockResult.data ?? []).reduce((s, sl) => s + (sl.quantity ?? 0), 0);

    // Monthly revenue breakdown (last 6 months)
    const monthlyMap: Record<string, { revenue: number; received: number }> = {};
    invoices.forEach((inv) => {
      const month = inv.issue_date.substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, received: 0 };
      monthlyMap[month].revenue += inv.total_amount ?? 0;
      monthlyMap[month].received += inv.amount_paid ?? 0;
    });
    const monthly = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, vals]) => ({ month, ...vals }));

    return NextResponse.json({
      data: {
        totalRevenue,
        totalReceived,
        outstanding,
        totalPurchases,
        invoiceCount,
        paidCount,
        overdueCount,
        customerCount: customersResult.data?.length ?? 0,
        productCount: productsResult.data?.length ?? 0,
        totalStockItems,
        monthly,
      },
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
