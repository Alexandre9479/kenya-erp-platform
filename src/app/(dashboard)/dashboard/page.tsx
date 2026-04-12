import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  TrendingUp, FileText, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Clock, ShoppingCart,
  Package, CreditCard, Activity,
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RevenueChart from "@/components/dashboard/revenue-chart";

export const metadata: Metadata = { title: "Dashboard" };

interface KpiData {
  totalRevenue: number;
  revenueChange: number;
  outstanding: number;
  totalCustomers: number;
  lowStockCount: number;
  overdueCount: number;
}
interface RecentInvoice {
  id: string; invoice_number: string; customer_name: string;
  total_amount: number; status: string; issue_date: string;
}

const KES = (v: number) =>
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const KESShort = (v: number) => {
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${KES(v)}`;
};

const statusConfig: Record<string, { label: string; dot: string }> = {
  paid: { label: "Paid", dot: "bg-emerald-500" },
  sent: { label: "Sent", dot: "bg-blue-500" },
  partial: { label: "Partial", dot: "bg-amber-500" },
  overdue: { label: "Overdue", dot: "bg-red-500" },
  draft: { label: "Draft", dot: "bg-slate-400" },
  cancelled: { label: "Cancelled", dot: "bg-slate-300" },
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

function lastSixMonths() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    d.setDate(1);
    return d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
  });
}

async function getDashboardData(tenantId: string) {
  const supabase = await createServiceClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [revThis, revLast, outstanding, customers, recentInvoices, stock, overdue] =
    await Promise.all([
      supabase.from("invoices").select("amount_paid").eq("tenant_id", tenantId)
        .in("status", ["paid", "partial"]).gte("issue_date", monthStart),
      supabase.from("invoices").select("amount_paid").eq("tenant_id", tenantId)
        .in("status", ["paid", "partial"]).gte("issue_date", lastMonthStart).lt("issue_date", monthStart),
      supabase.from("invoices").select("total_amount, amount_paid").eq("tenant_id", tenantId)
        .in("status", ["sent", "partial", "overdue"]),
      supabase.from("customers").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("invoices")
        .select("id, invoice_number, total_amount, status, issue_date, customers(name)")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(8),
      supabase.from("stock_levels").select("quantity, products(reorder_level)").eq("tenant_id", tenantId),
      supabase.from("invoices").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "overdue"),
    ]);

  const totalRevenue = (revThis.data ?? []).reduce((s, r) => s + (r.amount_paid ?? 0), 0);
  const lastRevenue = (revLast.data ?? []).reduce((s, r) => s + (r.amount_paid ?? 0), 0);
  const revenueChange = lastRevenue > 0 ? Math.round(((totalRevenue - lastRevenue) / lastRevenue) * 100) : 0;
  const outstandingTotal = (outstanding.data ?? []).reduce(
    (s, r) => s + Math.max(0, (r.total_amount ?? 0) - (r.amount_paid ?? 0)), 0);
  const lowStockCount = (stock.data ?? []).filter((sl) => {
    const p = Array.isArray(sl.products) ? sl.products[0] : sl.products;
    return sl.quantity <= ((p as { reorder_level?: number } | null)?.reorder_level ?? 0);
  }).length;
  const recentList: RecentInvoice[] = (recentInvoices.data ?? []).map((inv) => {
    const c = Array.isArray(inv.customers) ? inv.customers[0] : inv.customers;
    return { id: inv.id, invoice_number: inv.invoice_number, customer_name: (c as { name?: string } | null)?.name ?? "—",
      total_amount: inv.total_amount, status: inv.status, issue_date: inv.issue_date };
  });

  return {
    kpi: { totalRevenue, revenueChange, outstanding: outstandingTotal,
      totalCustomers: customers.count ?? 0, lowStockCount, overdueCount: overdue.count ?? 0 } as KpiData,
    recentInvoices: recentList,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.tenantId && session?.user?.role !== "super_admin") redirect("/login");

  const tenantId = session.user.tenantId ?? "";
  const { kpi, recentInvoices } = await getDashboardData(tenantId);
  const months = lastSixMonths();
  const chartData = months.map((month, i) => ({
    month,
    revenue: Math.round(120_000 + i * 35_000 + Math.random() * 40_000),
    expenses: Math.round(80_000 + i * 18_000 + Math.random() * 25_000),
  }));

  const kpiCards = [
    {
      label: "Revenue This Month", value: KESShort(kpi.totalRevenue),
      change: kpi.revenueChange, suffix: "vs last month",
      icon: TrendingUp, gradient: "from-indigo-500 to-violet-600",
      bg: "bg-indigo-50", textColor: "text-indigo-600",
    },
    {
      label: "Outstanding Balance", value: KESShort(kpi.outstanding),
      sub: "Unpaid sent & overdue invoices",
      icon: CreditCard, gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50", textColor: "text-amber-600",
    },
    {
      label: "Active Customers", value: kpi.totalCustomers.toLocaleString(),
      sub: "Total registered customers",
      icon: Users, gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50", textColor: "text-emerald-600",
    },
    {
      label: "Overdue Invoices", value: String(kpi.overdueCount),
      sub: `${kpi.lowStockCount} low-stock alerts`,
      icon: AlertTriangle, gradient: "from-red-500 to-rose-600",
      bg: "bg-red-50", textColor: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <Button asChild className="hidden sm:flex bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 shadow-lg shadow-indigo-500/20 text-white">
          <Link href="/sales/new">
            <ShoppingCart className="mr-2 h-4 w-4" />New Invoice
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              {/* Gradient top bar */}
              <div className={`h-1 w-full bg-linear-to-r ${card.gradient}`} />
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                  <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${card.textColor}`} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{card.value}</p>
                {card.change !== undefined && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs">
                    {card.change >= 0
                      ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                    <span className={card.change >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                      {Math.abs(card.change)}%
                    </span>
                    <span className="text-slate-400">{card.suffix}</span>
                  </div>
                )}
                {card.sub && <p className="mt-1.5 text-xs text-slate-400">{card.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart + Recent Invoices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Revenue vs Expenses</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Last 6 months · KES</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />Expenses</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-indigo-600 hover:text-indigo-700 h-7 px-2">
                <Link href="/sales">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <Clock className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400 mb-3">No invoices yet</p>
                <Button size="sm" variant="outline" asChild className="text-xs">
                  <Link href="/sales/new">Create first invoice</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentInvoices.map((inv) => {
                  const st = statusConfig[inv.status] ?? statusConfig.draft;
                  return (
                    <li key={inv.id} className="flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/sales/${inv.id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                            {inv.customer_name}
                          </Link>
                          <p className="text-xs text-slate-400">{inv.invoice_number} · {shortDate(inv.issue_date)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-bold text-slate-900">KES {KES(inv.total_amount)}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "New Invoice", href: "/sales/new", icon: ShoppingCart, color: "from-indigo-500 to-violet-600" },
          { label: "New LPO", href: "/purchasing/new", icon: Package, color: "from-emerald-500 to-teal-600" },
          { label: "View Reports", href: "/reports", icon: Activity, color: "from-amber-500 to-orange-500" },
          { label: "Manage Stock", href: "/warehouse", icon: AlertTriangle, color: "from-rose-500 to-red-600" },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={label} href={href}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-linear-to-br ${color} text-white shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200`}>
            <Icon className="h-5 w-5" />
            <span className="text-xs font-semibold text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
