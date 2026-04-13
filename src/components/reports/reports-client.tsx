"use client";

import { useState, useEffect, useCallback } from "react";
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
  Printer,
  Scale,
  BookOpen,
  Building2,
  Receipt,
  Landmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Types ─────────────────────────────────────────────────────────── */
type SummaryData = {
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

type TrialBalanceRow = { id: string; code: string; name: string; type: string; sub_type: string; debit: number; credit: number; balance: number };
type TrialBalanceData = { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; asAt: string };

type PLAccount = { id: string; code: string; name: string; type: string; sub_type: string; amount: number };
type PLData = { revenueAccounts: PLAccount[]; expenseAccounts: PLAccount[]; totalRevenue: number; totalExpenses: number; netProfit: number; from: string; to: string };

type BSAccount = { id: string; code: string; name: string; type: string; sub_type: string; amount: number };
type BSData = { assetAccounts: BSAccount[]; liabilityAccounts: BSAccount[]; equityAccounts: BSAccount[]; totalAssets: number; totalLiabilities: number; totalEquity: number; retainedEarnings: number; asAt: string };

type AgingRow = { id: string; invoice_number?: string; lpo_number?: string; customer_name?: string; supplier_name?: string; due_date?: string; expected_date?: string; total_amount: number; amount_paid?: number; balance?: number; daysOverdue: number; bucket: string; status?: string };
type AgingData = { rows: AgingRow[]; buckets: Record<string, number>; total: number };

type VATRow = { invoice_number?: string; lpo_number?: string; issue_date: string; total_amount: number; tax_amount: number; status: string };
type VATData = { salesRows: VATRow[]; purchaseRows: VATRow[]; outputVAT: number; inputVAT: number; netVAT: number; from: string; to: string; vatPayable: number; vatRefundable: number };

/* ── Helpers ────────────────────────────────────────────────────────── */
const KES_SHORT = (v: number) => {
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0 }).format(v)}`;
};

const KES = (v: number) =>
  `KES ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v)}`;

const fmtNum = (v: number) =>
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);

const dateStr = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

const thisYear = new Date().getFullYear();
const defaultFrom = `${thisYear}-01-01`;
const defaultTo = new Date().toISOString().split("T")[0];

const BUCKET_LABELS: Record<string, string> = {
  current: "Current",
  "1_30": "1–30 days",
  "31_60": "31–60 days",
  "61_90": "61–90 days",
  "90_plus": "90+ days",
};

const BUCKET_COLORS: Record<string, string> = {
  current: "bg-emerald-100 text-emerald-700",
  "1_30": "bg-blue-100 text-blue-700",
  "31_60": "bg-amber-100 text-amber-700",
  "61_90": "bg-orange-100 text-orange-700",
  "90_plus": "bg-red-100 text-red-700",
};

/* ── Main Component ─────────────────────────────────────────────────── */
export function ReportsClient() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  // Data states
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [plData, setPlData] = useState<PLData | null>(null);
  const [bsData, setBsData] = useState<BSData | null>(null);
  const [arAging, setArAging] = useState<AgingData | null>(null);
  const [apAging, setApAging] = useState<AgingData | null>(null);
  const [vatData, setVatData] = useState<VATData | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = useCallback(async (reportType: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType, from, to });
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      switch (reportType) {
        case "summary": setSummaryData(json.data); break;
        case "trial_balance": setTrialBalance(json.data); break;
        case "profit_loss": setPlData(json.data); break;
        case "balance_sheet": setBsData(json.data); break;
        case "ar_aging": setArAging(json.data); break;
        case "ap_aging": setApAging(json.data); break;
        case "vat_summary": setVatData(json.data); break;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchReport("summary"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    const typeMap: Record<string, string> = {
      dashboard: "summary",
      trial_balance: "trial_balance",
      profit_loss: "profit_loss",
      balance_sheet: "balance_sheet",
      ar_aging: "ar_aging",
      ap_aging: "ap_aging",
      vat_summary: "vat_summary",
    };
    const dataMap: Record<string, unknown> = {
      dashboard: summaryData,
      trial_balance: trialBalance,
      profit_loss: plData,
      balance_sheet: bsData,
      ar_aging: arAging,
      ap_aging: apAging,
      vat_summary: vatData,
    };
    // Lazy-load: only fetch if data hasn't been loaded yet
    if (!dataMap[tab]) fetchReport(typeMap[tab]);
  }

  function handleGenerate() {
    const typeMap: Record<string, string> = {
      dashboard: "summary",
      trial_balance: "trial_balance",
      profit_loss: "profit_loss",
      balance_sheet: "balance_sheet",
      ar_aging: "ar_aging",
      ap_aging: "ap_aging",
      vat_summary: "vat_summary",
    };
    // Clear cached data to force refresh
    setSummaryData(null);
    setTrialBalance(null);
    setPlData(null);
    setBsData(null);
    setArAging(null);
    setApAging(null);
    setVatData(null);
    fetchReport(typeMap[activeTab]);
  }

  /* ── KPI cards config for dashboard ─────────────────────────── */
  const kpis = summaryData
    ? [
        { label: "Total Revenue", value: KES_SHORT(summaryData.totalRevenue), Icon: TrendingUp, from: "from-emerald-500", to: "to-teal-500", text: "text-emerald-600" },
        { label: "Collected", value: KES_SHORT(summaryData.totalReceived), Icon: DollarSign, from: "from-blue-500", to: "to-indigo-500", text: "text-blue-600" },
        { label: "Outstanding", value: KES_SHORT(summaryData.outstanding), Icon: AlertCircle, from: "from-amber-500", to: "to-orange-500", text: "text-amber-600" },
        { label: "Purchases", value: KES_SHORT(summaryData.totalPurchases), Icon: TrendingDown, from: "from-red-500", to: "to-rose-500", text: "text-red-600" },
        { label: "Customers", value: String(summaryData.customerCount), Icon: Users, from: "from-violet-500", to: "to-purple-500", text: "text-violet-600" },
        { label: "Products", value: String(summaryData.productCount), Icon: Package, from: "from-slate-500", to: "to-slate-600", text: "text-slate-600" },
      ]
    : [];

  const monthLabel = (m: string) => {
    const [year, month] = m.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Print styles ────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-printable, #report-printable * { visibility: visible !important; }
          #report-printable { position: fixed; inset: 0; padding: 20px; background: white; overflow: auto; }
          .no-print { display: none !important; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      {/* ── Module Hero Strip ──────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 p-6 text-white shadow-lg no-print">
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
                <p className="text-indigo-200 text-sm mt-0.5">Financial statements, aging & VAT reports</p>
              </div>
            </div>
          </div>

          {/* Date filter row inside hero */}
          <div className="flex flex-wrap items-end gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
            <Calendar className="size-4 text-indigo-200 mt-auto mb-1 hidden sm:block" />
            <div className="space-y-1 flex-1 min-w-28 sm:flex-none">
              <Label className="text-indigo-100 text-xs font-medium">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full sm:w-36 bg-white/20 border-white/30 text-white placeholder:text-indigo-200 scheme-dark h-8 text-sm"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-28 sm:flex-none">
              <Label className="text-indigo-100 text-xs font-medium">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full sm:w-36 bg-white/20 border-white/30 text-white placeholder:text-indigo-200 scheme-dark h-8 text-sm"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              size="sm"
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-md h-8 text-sm"
            >
              {isLoading ? "Loading…" : "Generate"}
            </Button>
            {activeTab !== "dashboard" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
                className="text-white hover:bg-white/20 h-8 text-sm gap-1.5"
              >
                <Printer className="size-3.5" />Print
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1 no-print">
        <TabsList className="flex h-auto gap-1 bg-slate-100 p-1 rounded-xl w-max min-w-full">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
            <BarChart3 className="size-3.5" />Dashboard
          </TabsTrigger>
          <TabsTrigger value="trial_balance" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
            <Scale className="size-3.5" />Trial Balance
          </TabsTrigger>
          <TabsTrigger value="profit_loss" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
            <BookOpen className="size-3.5" />Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="balance_sheet" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
            <Building2 className="size-3.5" />Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="ar_aging" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
            <Receipt className="size-3.5" />AR Aging
          </TabsTrigger>
          <TabsTrigger value="ap_aging" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
            <FileText className="size-3.5" />AP Aging
          </TabsTrigger>
          <TabsTrigger value="vat_summary" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
            <Landmark className="size-3.5" />VAT Return
          </TabsTrigger>
        </TabsList>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* DASHBOARD TAB                                         */}
        {/* ══════════════════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {isLoading && !summaryData
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
                    <Card key={kpi.label} className="border-slate-200 shadow-sm overflow-x-auto">
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

          {/* Revenue Chart */}
          <Card className="border-slate-200 shadow-sm overflow-x-auto">
            <div className="h-1 w-full bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-600" />
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="size-4 text-indigo-500" />
                Monthly Revenue vs Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && !summaryData ? (
                <Skeleton className="h-64 w-full" />
              ) : summaryData && summaryData.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={summaryData.monthly.map((m) => ({ ...m, month: monthLabel(m.month) }))}>
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
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value) => [`KES ${new Intl.NumberFormat("en-KE").format(value as number)}`, undefined]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="received" name="Collected" stroke="#6366f1" fill="url(#colorReceived)" strokeWidth={2.5} />
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
          {summaryData && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Total Invoices", value: summaryData.invoiceCount, Icon: FileText, color: "text-indigo-600", bar: "from-indigo-500 to-violet-500" },
                { label: "Paid Invoices", value: summaryData.paidCount, Icon: CheckCircle2, color: "text-emerald-600", bar: "from-emerald-500 to-teal-500" },
                { label: "Overdue Invoices", value: summaryData.overdueCount, Icon: Clock, color: "text-red-600", bar: "from-red-500 to-rose-500" },
              ].map(({ label, value, Icon, color, bar }) => (
                <Card key={label} className="border-slate-200 shadow-sm overflow-x-auto">
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
        </TabsContent>

        {/* ══════════════════════════════════════════════════════ */}
        {/* TRIAL BALANCE TAB                                     */}
        {/* ══════════════════════════════════════════════════════ */}
        <TabsContent value="trial_balance" className="mt-4">
          <div id="report-printable">
            {isLoading && !trialBalance ? (
              <ReportSkeleton />
            ) : trialBalance ? (
              <Card className="border-slate-200 shadow-sm overflow-x-auto">
                <div className="h-1 w-full bg-linear-to-r from-indigo-500 to-violet-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="size-5 text-indigo-600" />
                    Trial Balance
                  </CardTitle>
                  <p className="text-sm text-slate-500">As at {dateStr(trialBalance.asAt)}</p>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold text-slate-600 w-20 whitespace-nowrap">Code</TableHead>
                        <TableHead className="font-semibold text-slate-600">Account Name</TableHead>
                        <TableHead className="font-semibold text-slate-600">Type</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Debit (KES)</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Credit (KES)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-xs text-slate-500">{row.code}</TableCell>
                          <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                          <TableCell>
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {row.debit > 0 ? fmtNum(row.debit) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {row.credit > 0 ? fmtNum(row.credit) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-slate-100 font-bold text-slate-900">
                        <TableCell colSpan={3} className="text-right font-bold">Totals</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{fmtNum(trialBalance.totalDebit)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{fmtNum(trialBalance.totalCredit)}</TableCell>
                      </TableRow>
                      {Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) > 0.01 && (
                        <TableRow className="bg-red-50">
                          <TableCell colSpan={3} className="text-right font-bold text-red-600">Difference (out of balance)</TableCell>
                          <TableCell colSpan={2} className="text-right font-mono tabular-nums text-red-600 font-bold">
                            {fmtNum(Math.abs(trialBalance.totalDebit - trialBalance.totalCredit))}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableFooter>
                  </Table>
                  {trialBalance.rows.length === 0 && (
                    <div className="py-16 text-center text-slate-400 text-sm">No posted journal entries found for this period</div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════ */}
        {/* PROFIT & LOSS TAB                                     */}
        {/* ══════════════════════════════════════════════════════ */}
        <TabsContent value="profit_loss" className="mt-4">
          <div id="report-printable">
            {isLoading && !plData ? (
              <ReportSkeleton />
            ) : plData ? (
              <Card className="border-slate-200 shadow-sm overflow-x-auto">
                <div className="h-1 w-full bg-linear-to-r from-emerald-500 to-teal-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="size-5 text-emerald-600" />
                    Profit & Loss Statement
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    {dateStr(plData.from)} — {dateStr(plData.to)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Revenue Section */}
                  <div>
                    <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <TrendingUp className="size-4" />Revenue
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-emerald-50/50">
                          <TableHead className="font-semibold text-slate-600 w-20 whitespace-nowrap">Code</TableHead>
                          <TableHead className="font-semibold text-slate-600">Account</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">Amount (KES)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plData.revenueAccounts.map((acc) => (
                          <TableRow key={acc.id} className="hover:bg-emerald-50/30">
                            <TableCell className="font-mono text-xs text-slate-500">{acc.code}</TableCell>
                            <TableCell className="font-medium text-slate-900">{acc.name}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-emerald-700">{fmtNum(acc.amount)}</TableCell>
                          </TableRow>
                        ))}
                        {plData.revenueAccounts.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-4">No revenue entries</TableCell></TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-emerald-50 font-bold">
                          <TableCell colSpan={2} className="text-right font-bold text-emerald-800">Total Revenue</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-emerald-800">{fmtNum(plData.totalRevenue)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {/* Expense Section */}
                  <div>
                    <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <TrendingDown className="size-4" />Expenses
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-50/50">
                          <TableHead className="font-semibold text-slate-600 w-20 whitespace-nowrap">Code</TableHead>
                          <TableHead className="font-semibold text-slate-600">Account</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">Amount (KES)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plData.expenseAccounts.map((acc) => (
                          <TableRow key={acc.id} className="hover:bg-red-50/30">
                            <TableCell className="font-mono text-xs text-slate-500">{acc.code}</TableCell>
                            <TableCell className="font-medium text-slate-900">{acc.name}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-red-600">{fmtNum(acc.amount)}</TableCell>
                          </TableRow>
                        ))}
                        {plData.expenseAccounts.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-4">No expense entries</TableCell></TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-red-50 font-bold">
                          <TableCell colSpan={2} className="text-right font-bold text-red-800">Total Expenses</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-red-800">{fmtNum(plData.totalExpenses)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <Separator />

                  {/* Net Profit */}
                  <div className={`rounded-xl p-5 ${plData.netProfit >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          {plData.netProfit >= 0 ? "Net Profit" : "Net Loss"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">Revenue minus Expenses</p>
                      </div>
                      <p className={`text-2xl font-extrabold ${plData.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {KES(Math.abs(plData.netProfit))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════ */}
        {/* BALANCE SHEET TAB                                     */}
        {/* ══════════════════════════════════════════════════════ */}
        <TabsContent value="balance_sheet" className="mt-4">
          <div id="report-printable">
            {isLoading && !bsData ? (
              <ReportSkeleton />
            ) : bsData ? (
              <Card className="border-slate-200 shadow-sm overflow-x-auto">
                <div className="h-1 w-full bg-linear-to-r from-blue-500 to-indigo-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="size-5 text-blue-600" />
                    Balance Sheet
                  </CardTitle>
                  <p className="text-sm text-slate-500">As at {dateStr(bsData.asAt)}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Assets */}
                  <BSSection
                    title="Assets"
                    accounts={bsData.assetAccounts}
                    total={bsData.totalAssets}
                    color="blue"
                  />

                  <Separator />

                  {/* Liabilities */}
                  <BSSection
                    title="Liabilities"
                    accounts={bsData.liabilityAccounts}
                    total={bsData.totalLiabilities}
                    color="amber"
                  />

                  {/* Equity */}
                  <div>
                    <h3 className="text-sm font-bold text-violet-700 uppercase tracking-wider mb-2">Equity</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-violet-50/50">
                          <TableHead className="font-semibold text-slate-600 w-20 whitespace-nowrap">Code</TableHead>
                          <TableHead className="font-semibold text-slate-600">Account</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">Amount (KES)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bsData.equityAccounts.map((acc) => (
                          <TableRow key={acc.id} className="hover:bg-violet-50/30">
                            <TableCell className="font-mono text-xs text-slate-500">{acc.code}</TableCell>
                            <TableCell className="font-medium text-slate-900">{acc.name}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{fmtNum(acc.amount)}</TableCell>
                          </TableRow>
                        ))}
                        {bsData.retainedEarnings !== 0 && (
                          <TableRow className="bg-violet-50/30">
                            <TableCell className="font-mono text-xs text-slate-500">—</TableCell>
                            <TableCell className="font-medium text-slate-900 italic">Retained Earnings</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{fmtNum(bsData.retainedEarnings)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-violet-50 font-bold">
                          <TableCell colSpan={2} className="text-right font-bold text-violet-800">Total Equity</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-violet-800">{fmtNum(bsData.totalEquity)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <Separator />

                  {/* Summary boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 text-center">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Assets</p>
                      <p className="text-xl font-extrabold text-blue-800 mt-1">{KES(bsData.totalAssets)}</p>
                    </div>
                    <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 text-center">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Liabilities</p>
                      <p className="text-xl font-extrabold text-amber-800 mt-1">{KES(bsData.totalLiabilities)}</p>
                    </div>
                    <div className="rounded-xl p-4 bg-violet-50 border border-violet-200 text-center">
                      <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Total Equity</p>
                      <p className="text-xl font-extrabold text-violet-800 mt-1">{KES(bsData.totalEquity)}</p>
                    </div>
                  </div>

                  {/* Balance check */}
                  {Math.abs(bsData.totalAssets - (bsData.totalLiabilities + bsData.totalEquity)) > 0.01 && (
                    <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-center">
                      <p className="text-sm font-bold text-red-700">
                        ⚠ Out of balance by {KES(Math.abs(bsData.totalAssets - (bsData.totalLiabilities + bsData.totalEquity)))}
                      </p>
                      <p className="text-xs text-red-500 mt-1">Assets should equal Liabilities + Equity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════ */}
        {/* AR AGING TAB                                          */}
        {/* ══════════════════════════════════════════════════════ */}
        <TabsContent value="ar_aging" className="mt-4">
          <div id="report-printable">
            {isLoading && !arAging ? (
              <ReportSkeleton />
            ) : arAging ? (
              <Card className="border-slate-200 shadow-sm overflow-x-auto">
                <div className="h-1 w-full bg-linear-to-r from-amber-500 to-orange-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="size-5 text-amber-600" />
                    Accounts Receivable Aging
                  </CardTitle>
                  <p className="text-sm text-slate-500">Outstanding customer invoices by age</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bucket summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Object.entries(BUCKET_LABELS).map(([key, label]) => (
                      <div key={key} className={`rounded-xl p-3 text-center ${BUCKET_COLORS[key]}`}>
                        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
                        <p className="text-lg font-extrabold mt-1">{fmtNum(arAging.buckets[key] ?? 0)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Detail table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold text-slate-600">Invoice #</TableHead>
                        <TableHead className="font-semibold text-slate-600">Customer</TableHead>
                        <TableHead className="font-semibold text-slate-600">Due Date</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Total</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Paid</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Balance</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-center">Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arAging.rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-900">{row.invoice_number}</TableCell>
                          <TableCell className="text-slate-700">{row.customer_name}</TableCell>
                          <TableCell className="text-slate-600 text-sm">{row.due_date ? dateStr(row.due_date) : "—"}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{fmtNum(row.total_amount)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-emerald-600">{fmtNum(row.amount_paid ?? 0)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums font-semibold">{fmtNum(row.balance ?? 0)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BUCKET_COLORS[row.bucket]}`}>
                              {row.daysOverdue === 0 ? "Current" : `${row.daysOverdue}d`}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell colSpan={5} className="text-right font-bold text-slate-800">Total Outstanding</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-slate-900 font-bold">{fmtNum(arAging.total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                  {arAging.rows.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">No outstanding receivables</div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════ */}
        {/* AP AGING TAB                                          */}
        {/* ══════════════════════════════════════════════════════ */}
        <TabsContent value="ap_aging" className="mt-4">
          <div id="report-printable">
            {isLoading && !apAging ? (
              <ReportSkeleton />
            ) : apAging ? (
              <Card className="border-slate-200 shadow-sm overflow-x-auto">
                <div className="h-1 w-full bg-linear-to-r from-red-500 to-rose-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="size-5 text-red-600" />
                    Accounts Payable Aging
                  </CardTitle>
                  <p className="text-sm text-slate-500">Outstanding supplier purchase orders by age</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bucket summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Object.entries(BUCKET_LABELS).map(([key, label]) => (
                      <div key={key} className={`rounded-xl p-3 text-center ${BUCKET_COLORS[key]}`}>
                        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
                        <p className="text-lg font-extrabold mt-1">{fmtNum(apAging.buckets[key] ?? 0)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Detail table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold text-slate-600">LPO #</TableHead>
                        <TableHead className="font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="font-semibold text-slate-600">Due Date</TableHead>
                        <TableHead className="font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Amount</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-center">Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apAging.rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-900">{row.lpo_number}</TableCell>
                          <TableCell className="text-slate-700">{row.supplier_name}</TableCell>
                          <TableCell className="text-slate-600 text-sm">{row.expected_date ? dateStr(row.expected_date) : "—"}</TableCell>
                          <TableCell>
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums font-semibold">{fmtNum(row.total_amount)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BUCKET_COLORS[row.bucket]}`}>
                              {row.daysOverdue === 0 ? "Current" : `${row.daysOverdue}d`}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell colSpan={4} className="text-right font-bold text-slate-800">Total Payable</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-slate-900 font-bold">{fmtNum(apAging.total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                  {apAging.rows.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">No outstanding payables</div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════ */}
        {/* VAT RETURN TAB                                        */}
        {/* ══════════════════════════════════════════════════════ */}
        <TabsContent value="vat_summary" className="mt-4">
          <div id="report-printable">
            {isLoading && !vatData ? (
              <ReportSkeleton />
            ) : vatData ? (
              <Card className="border-slate-200 shadow-sm overflow-x-auto">
                <div className="h-1 w-full bg-linear-to-r from-slate-600 to-slate-800" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="size-5 text-slate-700" />
                    VAT Return Summary
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    For KRA filing — {dateStr(vatData.from)} to {dateStr(vatData.to)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* VAT Summary boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 text-center">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Output VAT (Sales)</p>
                      <p className="text-xl font-extrabold text-blue-800 mt-1">{KES(vatData.outputVAT)}</p>
                      <p className="text-xs text-blue-500 mt-0.5">{vatData.salesRows.length} invoices</p>
                    </div>
                    <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 text-center">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Input VAT (Purchases)</p>
                      <p className="text-xl font-extrabold text-amber-800 mt-1">{KES(vatData.inputVAT)}</p>
                      <p className="text-xs text-amber-500 mt-0.5">{vatData.purchaseRows.length} purchase orders</p>
                    </div>
                    <div className={`rounded-xl p-4 text-center border ${vatData.netVAT >= 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${vatData.netVAT >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {vatData.netVAT >= 0 ? "VAT Payable to KRA" : "VAT Refundable from KRA"}
                      </p>
                      <p className={`text-xl font-extrabold mt-1 ${vatData.netVAT >= 0 ? "text-red-800" : "text-emerald-800"}`}>
                        {KES(vatData.netVAT >= 0 ? vatData.vatPayable : vatData.vatRefundable)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Output − Input = Net</p>
                    </div>
                  </div>

                  {/* Output VAT detail */}
                  <div>
                    <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-2">Output VAT — Sales Invoices</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-50/50">
                          <TableHead className="font-semibold text-slate-600">Invoice #</TableHead>
                          <TableHead className="font-semibold text-slate-600">Date</TableHead>
                          <TableHead className="font-semibold text-slate-600">Status</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">Total (KES)</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">VAT (KES)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vatData.salesRows.map((row, i) => (
                          <TableRow key={i} className="hover:bg-blue-50/30">
                            <TableCell className="font-medium text-slate-900">{row.invoice_number}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{dateStr(row.issue_date)}</TableCell>
                            <TableCell>
                              <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 capitalize">{row.status}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{fmtNum(row.total_amount)}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-blue-700 font-semibold">{fmtNum(row.tax_amount)}</TableCell>
                          </TableRow>
                        ))}
                        {vatData.salesRows.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-4">No sales invoices in this period</TableCell></TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-blue-50 font-bold">
                          <TableCell colSpan={4} className="text-right font-bold text-blue-800">Total Output VAT</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-blue-800">{fmtNum(vatData.outputVAT)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {/* Input VAT detail */}
                  <div>
                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2">Input VAT — Purchase Orders</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-50/50">
                          <TableHead className="font-semibold text-slate-600">LPO #</TableHead>
                          <TableHead className="font-semibold text-slate-600">Date</TableHead>
                          <TableHead className="font-semibold text-slate-600">Status</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">Total (KES)</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">VAT (KES)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vatData.purchaseRows.map((row, i) => (
                          <TableRow key={i} className="hover:bg-amber-50/30">
                            <TableCell className="font-medium text-slate-900">{row.lpo_number}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{dateStr(row.issue_date)}</TableCell>
                            <TableCell>
                              <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 capitalize">{row.status}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{fmtNum(row.total_amount)}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-amber-700 font-semibold">{fmtNum(row.tax_amount)}</TableCell>
                          </TableRow>
                        ))}
                        {vatData.purchaseRows.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-4">No purchase orders in this period</TableCell></TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-amber-50 font-bold">
                          <TableCell colSpan={4} className="text-right font-bold text-amber-800">Total Input VAT</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-amber-800">{fmtNum(vatData.inputVAT)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <Separator />

                  {/* Final VAT computation */}
                  <div className="rounded-xl border border-slate-300 overflow-hidden">
                    <div className="bg-slate-800 text-white p-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider">VAT Computation Summary</h3>
                    </div>
                    <div className="divide-y">
                      <div className="flex justify-between items-center px-5 py-3">
                        <span className="text-sm text-slate-600">Output VAT (collected on sales)</span>
                        <span className="font-mono tabular-nums font-semibold">{fmtNum(vatData.outputVAT)}</span>
                      </div>
                      <div className="flex justify-between items-center px-5 py-3">
                        <span className="text-sm text-slate-600">Less: Input VAT (paid on purchases)</span>
                        <span className="font-mono tabular-nums font-semibold text-red-600">({fmtNum(vatData.inputVAT)})</span>
                      </div>
                      <div className={`flex justify-between items-center px-5 py-4 font-bold ${vatData.netVAT >= 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                        <span className={`text-sm ${vatData.netVAT >= 0 ? "text-red-800" : "text-emerald-800"}`}>
                          {vatData.netVAT >= 0 ? "Net VAT Payable to KRA" : "Net VAT Refundable from KRA"}
                        </span>
                        <span className={`font-mono tabular-nums text-lg ${vatData.netVAT >= 0 ? "text-red-800" : "text-emerald-800"}`}>
                          KES {fmtNum(vatData.netVAT >= 0 ? vatData.vatPayable : vatData.vatRefundable)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function ReportSkeleton() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="pt-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BSSection({
  title,
  accounts,
  total,
  color,
}: {
  title: string;
  accounts: BSAccount[];
  total: number;
  color: "blue" | "amber";
}) {
  const colorMap = {
    blue: { heading: "text-blue-700", bg: "bg-blue-50/50", hover: "hover:bg-blue-50/30", footer: "bg-blue-50", footerText: "text-blue-800" },
    amber: { heading: "text-amber-700", bg: "bg-amber-50/50", hover: "hover:bg-amber-50/30", footer: "bg-amber-50", footerText: "text-amber-800" },
  };
  const c = colorMap[color];

  return (
    <div>
      <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${c.heading}`}>{title}</h3>
      <Table>
        <TableHeader>
          <TableRow className={c.bg}>
            <TableHead className="font-semibold text-slate-600 w-20 whitespace-nowrap">Code</TableHead>
            <TableHead className="font-semibold text-slate-600">Account</TableHead>
            <TableHead className="font-semibold text-slate-600 text-right">Amount (KES)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((acc) => (
            <TableRow key={acc.id} className={c.hover}>
              <TableCell className="font-mono text-xs text-slate-500">{acc.code}</TableCell>
              <TableCell className="font-medium text-slate-900">{acc.name}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtNum(acc.amount)}</TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-4">No {title.toLowerCase()} entries</TableCell></TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow className={`${c.footer} font-bold`}>
            <TableCell colSpan={2} className={`text-right font-bold ${c.footerText}`}>Total {title}</TableCell>
            <TableCell className={`text-right font-mono tabular-nums ${c.footerText}`}>{fmtNum(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
