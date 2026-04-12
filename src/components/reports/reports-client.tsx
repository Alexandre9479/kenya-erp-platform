"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  AlertCircle,
  BarChart3,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ReportData = {
  totalRevenue: number;
  totalReceived: number;
  outstanding: number;
  totalPurchases: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
  customerCount: number;
  productCount: number;
  totalStockItems: number;
  monthly: { month: string; revenue: number; received: number }[];
};

const KES = (v: number) => {
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0 }).format(v)}`;
};

const thisYear = new Date().getFullYear();
const defaultFrom = `${thisYear}-01-01`;
const defaultTo = new Date().toISOString().split("T")[0];

export function ReportsClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReport() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ type: "summary", from, to });
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }

  const kpis = data
    ? [
        { label: "Total Revenue", value: KES(data.totalRevenue), Icon: TrendingUp, from: "from-emerald-500", to: "to-teal-500", text: "text-emerald-600" },
        { label: "Collected", value: KES(data.totalReceived), Icon: DollarSign, from: "from-blue-500", to: "to-indigo-500", text: "text-blue-600" },
        { label: "Outstanding", value: KES(data.outstanding), Icon: AlertCircle, from: "from-amber-500", to: "to-orange-500", text: "text-amber-600" },
        { label: "Purchases", value: KES(data.totalPurchases), Icon: TrendingDown, from: "from-red-500", to: "to-rose-500", text: "text-red-600" },
        { label: "Customers", value: String(data.customerCount), Icon: Users, from: "from-violet-500", to: "to-purple-500", text: "text-violet-600" },
        { label: "Products", value: String(data.productCount), Icon: Package, from: "from-slate-500", to: "to-slate-600", text: "text-slate-600" },
      ]
    : [];

  const monthLabel = (m: string) => {
    const [year, month] = m.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Module Hero Strip ──────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-20 w-56 h-56 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner">
                <BarChart3 className="size-7 text-white" />
              </div>
              <div>
                <p className="text-indigo-200 text-sm font-medium tracking-wide uppercase">Analytics</p>
                <h1 className="text-2xl font-bold tracking-tight">Business Reports</h1>
                <p className="text-indigo-200 text-sm mt-0.5">Revenue, collections & performance insights</p>
              </div>
            </div>
          </div>

          {/* Date filter row inside hero */}
          <div className="flex flex-wrap items-end gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <Calendar className="size-4 text-indigo-200 mt-auto mb-1" />
            <div className="space-y-1">
              <Label className="text-indigo-100 text-xs font-medium">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-36 bg-white/20 border-white/30 text-white placeholder:text-indigo-200 scheme-dark h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-indigo-100 text-xs font-medium">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-36 bg-white/20 border-white/30 text-white placeholder:text-indigo-200 scheme-dark h-8 text-sm"
              />
            </div>
            <Button
              onClick={fetchReport}
              disabled={isLoading}
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-md h-8 text-sm"
            >
              {isLoading ? "Loading…" : "Generate Report"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-slate-200 shadow-sm">
                <CardContent className="pt-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-7 w-28" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => {
              const { Icon } = kpi;
              return (
                <Card key={kpi.label} className="border-slate-200 shadow-sm overflow-hidden">
                  <div className={`h-1 w-full bg-linear-to-r ${kpi.from} ${kpi.to}`} />
                  <CardContent className="pt-4">
                    <div className={`inline-flex p-2 rounded-xl mb-2 bg-linear-to-br ${kpi.from} ${kpi.to}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs text-slate-500 mb-0.5 font-medium">{kpi.label}</p>
                    <p className={`text-lg font-bold ${kpi.text}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* ── Revenue Chart ─────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-600" />
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="size-4 text-indigo-500" />
            Monthly Revenue vs Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data && data.monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={data.monthly.map((m) => ({ ...m, month: monthLabel(m.month) }))}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value) => [
                    `KES ${new Intl.NumberFormat("en-KE").format(value as number)}`,
                    undefined,
                  ]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10b981"
                  fill="url(#colorRevenue)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Collected"
                  stroke="#6366f1"
                  fill="url(#colorReceived)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
              No data for selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Invoice Stats ─────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Invoices", value: data.invoiceCount, Icon: FileText, color: "text-indigo-600", bar: "from-indigo-500 to-violet-500" },
            { label: "Paid Invoices", value: data.paidCount, Icon: CheckCircle2, color: "text-emerald-600", bar: "from-emerald-500 to-teal-500" },
            { label: "Overdue Invoices", value: data.overdueCount, Icon: Clock, color: "text-red-600", bar: "from-red-500 to-rose-500" },
          ].map(({ label, value, Icon, color, bar }) => (
            <Card key={label} className="border-slate-200 shadow-sm overflow-hidden">
              <div className={`h-1 w-full bg-linear-to-r ${bar}`} />
              <CardContent className="pt-4 flex items-center gap-4">
                <div className={`inline-flex p-3 rounded-xl bg-linear-to-br ${bar}`}>
                  <Icon className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">{label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
