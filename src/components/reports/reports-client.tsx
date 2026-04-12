"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Users, Package, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  const kpis = data ? [
    { label: "Total Revenue", value: KES(data.totalRevenue), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Collected", value: KES(data.totalReceived), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Outstanding", value: KES(data.outstanding), icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Purchases", value: KES(data.totalPurchases), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { label: "Customers", value: String(data.customerCount), icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Products", value: String(data.productCount), icon: Package, color: "text-slate-600", bg: "bg-slate-50" },
  ] : [];

  const monthLabel = (m: string) => {
    const [year, month] = m.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={fetchReport} disabled={isLoading}>
              {isLoading ? "Loading…" : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-7 w-28" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="pt-4">
                    <div className={`inline-flex p-2 rounded-lg mb-2 ${kpi.bg}`}>
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <p className="text-xs text-slate-500 mb-0.5">{kpi.label}</p>
                    <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue vs Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data && data.monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthly.map((m) => ({ ...m, month: monthLabel(m.month) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value) => [`KES ${new Intl.NumberFormat("en-KE").format(value as number)}`, undefined]}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                <Area type="monotone" dataKey="received" name="Collected" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
              No data for selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Stats */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.invoiceCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500">Paid Invoices</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{data.paidCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500">Overdue Invoices</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{data.overdueCount}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
