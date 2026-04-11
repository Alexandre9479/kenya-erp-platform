import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  FileText,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RevenueChart from "@/components/dashboard/revenue-chart";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiData {
  totalRevenue: number;
  revenueChange: number;
  outstanding: number;
  totalCustomers: number;
  lowStockCount: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  issue_date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKES(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    sent: "bg-blue-100 text-blue-700",
    partial: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
    draft: "bg-slate-100 text-slate-600",
    cancelled: "bg-slate-100 text-slate-400",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

// Build last-6-months label array
function lastSixMonths() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" })
    );
  }
  return months;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getDashboardData(tenantId: string) {
  const supabase = await createServiceClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [
    revenueThisMonth,
    revenueLastMonth,
    outstandingResult,
    customersResult,
    recentInvoicesResult,
    stockResult,
  ] = await Promise.all([
    // Revenue this month (paid + partial invoices)
    supabase
      .from("invoices")
      .select("amount_paid")
      .eq("tenant_id", tenantId)
      .in("status", ["paid", "partial"])
      .gte("issue_date", monthStart),

    // Revenue last month
    supabase
      .from("invoices")
      .select("amount_paid")
      .eq("tenant_id", tenantId)
      .in("status", ["paid", "partial"])
      .gte("issue_date", lastMonthStart)
      .lt("issue_date", monthStart),

    // Outstanding balance
    supabase
      .from("invoices")
      .select("total_amount, amount_paid")
      .eq("tenant_id", tenantId)
      .in("status", ["sent", "partial", "overdue"]),

    // Active customers count
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),

    // Recent 8 invoices with customer name
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, status, issue_date, customers(name)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(8),

    // Low stock: stock_levels joined with products for reorder comparison
    supabase
      .from("stock_levels")
      .select("quantity, products(reorder_level)")
      .eq("tenant_id", tenantId),
  ]);

  // Aggregate
  const totalRevenue = (revenueThisMonth.data ?? []).reduce(
    (s, r) => s + (r.amount_paid ?? 0),
    0
  );
  const lastRevenue = (revenueLastMonth.data ?? []).reduce(
    (s, r) => s + (r.amount_paid ?? 0),
    0
  );
  const revenueChange =
    lastRevenue > 0
      ? Math.round(((totalRevenue - lastRevenue) / lastRevenue) * 100)
      : 0;

  const outstanding = (outstandingResult.data ?? []).reduce(
    (s, r) => s + Math.max(0, (r.total_amount ?? 0) - (r.amount_paid ?? 0)),
    0
  );

  const totalCustomers = customersResult.count ?? 0;

  // Low stock items
  const lowStockCount = (stockResult.data ?? []).filter((sl) => {
    const product = Array.isArray(sl.products) ? sl.products[0] : sl.products;
    const reorderLevel = (product as { reorder_level?: number } | null)?.reorder_level ?? 0;
    return sl.quantity <= reorderLevel;
  }).length;

  // Recent invoices
  const recentInvoices: RecentInvoice[] = (recentInvoicesResult.data ?? []).map(
    (inv) => {
      const customer = Array.isArray(inv.customers)
        ? inv.customers[0]
        : inv.customers;
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: (customer as { name?: string } | null)?.name ?? "—",
        total_amount: inv.total_amount,
        status: inv.status,
        issue_date: inv.issue_date,
      };
    }
  );

  return {
    kpi: { totalRevenue, revenueChange, outstanding, totalCustomers, lowStockCount } as KpiData,
    recentInvoices,
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.tenantId && session?.user?.role !== "super_admin") {
    redirect("/login");
  }

  const tenantId = session.user.tenantId ?? "";
  const { kpi, recentInvoices } = await getDashboardData(tenantId);

  // Placeholder chart data — replaced by real aggregation in a later phase
  const months = lastSixMonths();
  const chartData = months.map((month, i) => ({
    month,
    revenue: Math.round(120_000 + i * 35_000 + Math.random() * 40_000),
    expenses: Math.round(80_000 + i * 18_000 + Math.random() * 25_000),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Revenue This Month
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatKES(kpi.totalRevenue)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {kpi.revenueChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span
                className={
                  kpi.revenueChange >= 0 ? "text-emerald-600" : "text-red-600"
                }
              >
                {Math.abs(kpi.revenueChange)}% vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Outstanding Invoices
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <FileText className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatKES(kpi.outstanding)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Unpaid sent &amp; overdue
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active Customers
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {kpi.totalCustomers.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total registered</p>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Low Stock Alerts
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {kpi.lowStockCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Items below reorder level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Activity feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Revenue vs Expenses
            </CardTitle>
            <p className="text-xs text-slate-400">
              Last 6 months · KES
            </p>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No invoices yet</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {inv.customer_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {inv.invoice_number} · {shortDate(inv.issue_date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatKES(inv.total_amount)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor(inv.status)}`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
