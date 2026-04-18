"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  Trash2,
  CheckCircle2,
  Edit3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  FileText,
  ListChecks,
  Lock,
  BarChart3,
  Loader2,
  Save,
  ArrowRight,
  CircleDollarSign,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type BudgetStatus = "draft" | "approved" | "closed";

type Budget = {
  id: string;
  name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  status: BudgetStatus;
  notes: string | null;
};
type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
};
type VLine = {
  id?: string;
  account_id: string | null;
  category: string | null;
  line_type: "revenue" | "expense" | "cogs" | "other";
  period_year: number;
  period_month: number;
  amount: number;
  actual?: number;
  variance?: number;
  variance_pct?: number;
  accounts?: { code: string; name: string; account_type: string } | null;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const money = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const STATUS_CONFIG: Record<
  BudgetStatus,
  { label: string; pill: string; dot: string; icon: typeof FileText }
> = {
  draft: {
    label: "Draft",
    pill: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    icon: FileText,
  },
  approved: {
    label: "Approved",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    pill: "bg-slate-200 text-slate-600 border-slate-300",
    dot: "bg-slate-500",
    icon: Lock,
  },
};

// ─── Hero stat tile ─────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-medium">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-white tabular-nums leading-tight truncate">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-[11px] text-white/55 truncate">{hint}</p>
          )}
        </div>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-white/25 to-white/5 border border-white/15 shrink-0">
          <Icon className="size-4 text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BudgetsClient({
  initialBudgets,
  accounts,
}: {
  initialBudgets: Budget[];
  accounts: Account[];
}) {
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [lines, setLines] = useState<VLine[]>([]);
  const [variance, setVariance] = useState<VLine[]>([]);
  const [view, setView] = useState<"edit" | "variance">("edit");
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    period_type: "annual",
    period_start: `${new Date().getFullYear()}-01-01`,
    period_end: `${new Date().getFullYear()}-12-31`,
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Derived hero stats ────────────────────────────────────────────────
  const heroStats = useMemo(() => {
    const draft = budgets.filter((b) => b.status === "draft").length;
    const approved = budgets.filter((b) => b.status === "approved").length;
    const closed = budgets.filter((b) => b.status === "closed").length;
    return { total: budgets.length, draft, approved, closed };
  }, [budgets]);

  // ─── API ───────────────────────────────────────────────────────────────
  const reload = async () => {
    const res = await fetch("/api/budgets");
    const json = await res.json();
    if (json.data) setBudgets(json.data);
  };

  const openBudget = async (b: Budget) => {
    setSelected(b);
    setView("edit");
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets/${b.id}`);
      const json = await res.json();
      if (json.data?.lines?.length) {
        setLines(json.data.lines);
      } else {
        const start = new Date(b.period_start);
        const end = new Date(b.period_end);
        const seed: VLine[] = [];
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cursor <= end) {
          seed.push({
            account_id: null,
            category: "General",
            line_type: "expense",
            period_year: cursor.getFullYear(),
            period_month: cursor.getMonth() + 1,
            amount: 0,
          });
          cursor.setMonth(cursor.getMonth() + 1);
        }
        setLines(seed);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVariance = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets/${selected.id}/variance`);
      const json = await res.json();
      if (json.data) {
        setVariance(json.data.lines);
        setView("variance");
      } else {
        toast.error("Could not load variance");
      }
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async () => {
    if (!createForm.name.trim()) {
      toast.error("Please give the budget a name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        toast.success("Budget created");
        setCreateOpen(false);
        setCreateForm({
          name: "",
          period_type: "annual",
          period_start: `${new Date().getFullYear()}-01-01`,
          period_end: `${new Date().getFullYear()}-12-31`,
          notes: "",
        });
        await reload();
        await openBudget(json.data);
      } else {
        toast.error(json.error ?? "Could not create budget");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const addLine = () => {
    if (!selected) return;
    const start = new Date(selected.period_start);
    setLines([
      ...lines,
      {
        account_id: null,
        category: "",
        line_type: "expense",
        period_year: start.getFullYear(),
        period_month: start.getMonth() + 1,
        amount: 0,
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<VLine>) => {
    const next = [...lines];
    next[idx] = { ...next[idx]!, ...patch };
    setLines(next);
  };

  const removeLine = (idx: number) =>
    setLines(lines.filter((_, i) => i !== idx));

  const saveLines = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/budgets/${selected.id}/lines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (res.ok) {
        toast.success("Budget saved");
        await openBudget(selected);
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Could not save budget");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: BudgetStatus) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/budgets/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Budget ${status}`);
        await reload();
        setSelected({ ...selected, status });
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Could not update status");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const deleteBudget = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/budgets/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Budget deleted");
        if (selected?.id === deleteId) {
          setSelected(null);
          setLines([]);
        }
        setDeleteId(null);
        await reload();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Could not delete budget");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Totals for selected budget ─────────────────────────────────────────
  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        const v = Number(l.amount);
        if (l.line_type === "revenue") acc.revenue += v;
        else acc.expense += v;
        return acc;
      },
      { revenue: 0, expense: 0 }
    );
  }, [lines]);

  const net = totals.revenue - totals.expense;
  const netPositive = net >= 0;

  // ─── Variance totals ────────────────────────────────────────────────────
  const varianceTotals = useMemo(() => {
    if (variance.length === 0) return null;
    return variance.reduce(
      (acc, l) => {
        acc.budget += Number(l.amount ?? 0);
        acc.actual += Number(l.actual ?? 0);
        const over =
          l.line_type === "revenue"
            ? (l.variance ?? 0) < 0
            : (l.variance ?? 0) > 0;
        if (over) acc.overBudget += 1;
        return acc;
      },
      { budget: 0, actual: 0, overBudget: 0 }
    );
  }, [variance]);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 px-6 py-7 sm:px-8 sm:py-9 text-white shadow-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0c4a6e 0%, #0369a1 45%, #0891b2 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80 backdrop-blur">
                <Sparkles className="size-3" />
                Financial planning
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
                Budgets & Variance
              </h1>
              <p className="mt-1.5 text-sm text-white/75 max-w-xl">
                Plan spend and revenue across the period, then track actuals
                with live variance analysis.
              </p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2 shrink-0 bg-white text-sky-700 hover:bg-white/90 shadow-lg shadow-sky-950/30"
            >
              <Plus className="h-4 w-4" />
              New budget
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat
              label="Total budgets"
              value={heroStats.total.toLocaleString()}
              hint={`${accounts.length} linked accounts`}
              icon={Wallet}
            />
            <HeroStat
              label="Draft"
              value={heroStats.draft.toLocaleString()}
              hint="Awaiting approval"
              icon={FileText}
            />
            <HeroStat
              label="Approved"
              value={heroStats.approved.toLocaleString()}
              hint="Live & tracking"
              icon={CheckCircle2}
            />
            <HeroStat
              label="Closed"
              value={heroStats.closed.toLocaleString()}
              hint="Period ended"
              icon={Lock}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Left: budget list */}
        <Card className="relative overflow-hidden border-slate-200/80 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-sky-400/60 via-cyan-400/60 to-blue-400/60" />
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-sky-500 to-cyan-600 shrink-0">
                <ListChecks className="size-3.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  All budgets
                </h3>
                <p className="text-[11px] text-slate-500">
                  {budgets.length} {budgets.length === 1 ? "budget" : "budgets"}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCreateOpen(true)}
              className="h-7 w-7 shrink-0"
              aria-label="New budget"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <Separator />
          <CardContent className="p-0">
            {budgets.length === 0 ? (
              <div className="py-10 px-4 flex flex-col items-center gap-2 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-sky-50 to-cyan-50 border border-sky-100">
                  <Wallet className="size-5 text-sky-500" />
                </div>
                <p className="text-sm font-medium text-slate-800">
                  No budgets yet
                </p>
                <p className="text-xs text-slate-500">
                  Create your first budget to get started.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateOpen(true)}
                  className="mt-2 gap-1.5"
                >
                  <Plus className="size-3.5" />
                  New budget
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-130 overflow-y-auto">
                {budgets.map((b) => {
                  const cfg = STATUS_CONFIG[b.status];
                  const isSel = selected?.id === b.id;
                  return (
                    <button
                      key={b.id}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors flex items-start gap-3 group",
                        isSel
                          ? "bg-sky-50/60"
                          : "hover:bg-slate-50"
                      )}
                      onClick={() => openBudget(b)}
                    >
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 rounded-full shrink-0",
                          cfg.dot
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate text-slate-900">
                          {b.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Calendar className="size-3 shrink-0" />
                          <span className="tabular-nums">
                            {b.period_start} → {b.period_end}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium capitalize",
                              cfg.pill
                            )}
                          >
                            {cfg.label}
                          </Badge>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {b.period_type}
                          </span>
                        </div>
                      </div>
                      {isSel && (
                        <ArrowRight className="size-3.5 text-sky-600 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: editor / variance */}
        {selected ? (
          <Card className="relative overflow-hidden border-slate-200/80 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-sky-400/60 via-cyan-400/60 to-blue-400/60" />

            {/* Header strip */}
            <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-sky-500 to-cyan-600 shrink-0">
                  <Wallet className="size-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-900 truncate">
                      {selected.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium capitalize",
                        STATUS_CONFIG[selected.status].pill
                      )}
                    >
                      {STATUS_CONFIG[selected.status].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 tabular-nums">
                    <Calendar className="size-3" />
                    {selected.period_start} → {selected.period_end}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap shrink-0">
                <Button
                  variant={view === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("edit")}
                  className={cn(
                    "gap-1.5",
                    view === "edit" &&
                      "bg-linear-to-br from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700"
                  )}
                >
                  <Edit3 className="size-3.5" />
                  Edit lines
                </Button>
                <Button
                  variant={view === "variance" ? "default" : "outline"}
                  size="sm"
                  onClick={loadVariance}
                  disabled={loading}
                  className={cn(
                    "gap-1.5",
                    view === "variance" &&
                      "bg-linear-to-br from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700"
                  )}
                >
                  {loading && view !== "variance" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <BarChart3 className="size-3.5" />
                  )}
                  Variance
                </Button>
                {selected.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus("approved")}
                    className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                )}
                {selected.status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus("closed")}
                    className="gap-1.5"
                  >
                    <Lock className="size-3.5" />
                    Close
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(selected.id)}
                  className="h-8 w-8"
                  aria-label="Delete budget"
                >
                  <Trash2 className="size-3.5 text-rose-600" />
                </Button>
              </div>
            </div>

            <Separator />

            <CardContent className="p-4 sm:p-5 space-y-4">
              {view === "edit" && (
                <>
                  {/* Totals tiles */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-medium flex items-center gap-1">
                        <TrendingUp className="size-3" />
                        Revenue
                      </p>
                      <p className="mt-1 text-lg font-semibold text-emerald-800 tabular-nums">
                        KES {money(totals.revenue)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-rose-700 font-medium flex items-center gap-1">
                        <TrendingDown className="size-3" />
                        Expense
                      </p>
                      <p className="mt-1 text-lg font-semibold text-rose-800 tabular-nums">
                        KES {money(totals.expense)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border p-3",
                        netPositive
                          ? "border-sky-200/80 bg-sky-50/50"
                          : "border-amber-200/80 bg-amber-50/50"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] uppercase tracking-wider font-medium flex items-center gap-1",
                          netPositive ? "text-sky-700" : "text-amber-700"
                        )}
                      >
                        <Scale className="size-3" />
                        Net
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-lg font-semibold tabular-nums",
                          netPositive ? "text-sky-800" : "text-amber-800"
                        )}
                      >
                        {net < 0 ? "-" : ""}KES {money(Math.abs(net))}
                      </p>
                    </div>
                  </div>

                  {/* Lines table */}
                  <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">
                              Account / Category
                            </TableHead>
                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">
                              Type
                            </TableHead>
                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">
                              Period
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right font-semibold text-slate-700">
                              Amount (KES)
                            </TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-12"
                              >
                                <div className="flex flex-col items-center gap-2 text-slate-500">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 border border-slate-100">
                                    <ListChecks className="size-4 text-slate-400" />
                                  </div>
                                  <p className="text-sm text-slate-700 font-medium">
                                    No lines yet
                                  </p>
                                  <p className="text-xs">
                                    Add your first budget line below.
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            lines.map((l, i) => (
                              <TableRow
                                key={i}
                                className={cn(
                                  "transition-colors",
                                  l.line_type === "revenue" &&
                                    "bg-emerald-50/20",
                                  l.line_type === "expense" &&
                                    "bg-rose-50/10"
                                )}
                              >
                                <TableCell className="min-w-56 align-top">
                                  <Select
                                    value={l.account_id ?? "category"}
                                    onValueChange={(v) =>
                                      updateLine(
                                        i,
                                        v === "category"
                                          ? { account_id: null }
                                          : { account_id: v, category: null }
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="category">
                                        (free-text category)
                                      </SelectItem>
                                      {accounts.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                          {a.code} — {a.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {!l.account_id && (
                                    <Input
                                      className="h-7 text-xs mt-1.5"
                                      value={l.category ?? ""}
                                      onChange={(e) =>
                                        updateLine(i, {
                                          category: e.target.value,
                                        })
                                      }
                                      placeholder="Category name"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="align-top">
                                  <Select
                                    value={l.line_type}
                                    onValueChange={(v) =>
                                      updateLine(i, {
                                        line_type: v as VLine["line_type"],
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="revenue">
                                        Revenue
                                      </SelectItem>
                                      <SelectItem value="expense">
                                        Expense
                                      </SelectItem>
                                      <SelectItem value="cogs">COGS</SelectItem>
                                      <SelectItem value="other">
                                        Other
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="whitespace-nowrap align-top">
                                  <div className="flex gap-1">
                                    <Select
                                      value={String(l.period_month)}
                                      onValueChange={(v) =>
                                        updateLine(i, {
                                          period_month: Number(v),
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-xs w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {MONTH_NAMES.map((n, idx) => (
                                          <SelectItem
                                            key={idx}
                                            value={String(idx + 1)}
                                          >
                                            {n}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      className="h-8 text-xs w-20 tabular-nums"
                                      value={l.period_year}
                                      onChange={(e) =>
                                        updateLine(i, {
                                          period_year: Number(e.target.value),
                                        })
                                      }
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right align-top">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-xs text-right w-32 tabular-nums font-medium"
                                    value={l.amount}
                                    onChange={(e) =>
                                      updateLine(i, {
                                        amount: Number(e.target.value),
                                      })
                                    }
                                  />
                                </TableCell>
                                <TableCell className="align-top">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeLine(i)}
                                    className="h-8 w-8"
                                    aria-label="Remove line"
                                  >
                                    <Trash2 className="size-3.5 text-rose-600" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addLine}
                      className="gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      Add line
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveLines}
                      disabled={saving}
                      className="gap-1.5 bg-linear-to-br from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700"
                    >
                      {saving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      Save budget
                    </Button>
                  </div>
                </>
              )}

              {view === "variance" && (
                <>
                  {varianceTotals && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-sky-700 font-medium flex items-center gap-1">
                          <CircleDollarSign className="size-3" />
                          Budgeted
                        </p>
                        <p className="mt-1 text-lg font-semibold text-sky-800 tabular-nums">
                          KES {money(varianceTotals.budget)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-700 font-medium flex items-center gap-1">
                          <BarChart3 className="size-3" />
                          Actual
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">
                          KES {money(varianceTotals.actual)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-amber-700 font-medium flex items-center gap-1">
                          <TrendingUp className="size-3" />
                          Over budget
                        </p>
                        <p className="mt-1 text-lg font-semibold text-amber-800 tabular-nums">
                          {varianceTotals.overBudget} lines
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">
                              Account / Category
                            </TableHead>
                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">
                              Type
                            </TableHead>
                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">
                              Period
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right font-semibold text-slate-700">
                              Budget
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right font-semibold text-slate-700">
                              Actual
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right font-semibold text-slate-700">
                              Variance
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right font-semibold text-slate-700">
                              %
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variance.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center py-12"
                              >
                                <div className="flex flex-col items-center gap-2 text-slate-500">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-br from-sky-50 to-cyan-50 border border-sky-100">
                                    <BarChart3 className="size-4 text-sky-500" />
                                  </div>
                                  <p className="text-sm text-slate-700 font-medium">
                                    No variance data
                                  </p>
                                  <p className="text-xs">
                                    Add budget lines and save first.
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            variance.map((l, i) => {
                              const overBudget =
                                l.line_type === "revenue"
                                  ? (l.variance ?? 0) < 0
                                  : (l.variance ?? 0) > 0;
                              return (
                                <TableRow
                                  key={i}
                                  className={cn(
                                    overBudget
                                      ? "bg-rose-50/20"
                                      : "bg-emerald-50/10"
                                  )}
                                >
                                  <TableCell className="text-sm">
                                    {l.accounts
                                      ? `${l.accounts.code} — ${l.accounts.name}`
                                      : l.category ?? "—"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] capitalize",
                                        l.line_type === "revenue"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : l.line_type === "expense"
                                            ? "bg-rose-50 text-rose-700 border-rose-200"
                                            : "bg-slate-50 text-slate-700 border-slate-200"
                                      )}
                                    >
                                      {l.line_type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs whitespace-nowrap text-slate-600 tabular-nums">
                                    {MONTH_NAMES[l.period_month - 1]}{" "}
                                    {l.period_year}
                                  </TableCell>
                                  <TableCell className="text-right whitespace-nowrap tabular-nums text-slate-700">
                                    {money(l.amount)}
                                  </TableCell>
                                  <TableCell className="text-right whitespace-nowrap tabular-nums text-slate-700">
                                    {money(l.actual)}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "text-right whitespace-nowrap font-semibold tabular-nums",
                                      overBudget
                                        ? "text-rose-700"
                                        : "text-emerald-700"
                                    )}
                                  >
                                    {overBudget ? (
                                      <TrendingUp className="inline size-3 mr-1" />
                                    ) : (
                                      <TrendingDown className="inline size-3 mr-1" />
                                    )}
                                    {money(l.variance)}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "text-right whitespace-nowrap text-xs font-medium tabular-nums",
                                      overBudget
                                        ? "text-rose-700"
                                        : "text-emerald-700"
                                    )}
                                  >
                                    {(l.variance_pct ?? 0).toFixed(1)}%
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden border-slate-200/80 border-dashed shadow-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-sky-400/40 via-cyan-400/40 to-blue-400/40" />
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-sky-50 to-cyan-50 border border-sky-100 mx-auto">
                <Wallet className="size-6 text-sky-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                Select a budget
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                Pick a budget from the list, or create a new one to start
                planning revenue and expense lines.
              </p>
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-1.5 bg-linear-to-br from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700"
              >
                <Plus className="size-3.5" />
                New budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-sky-500 to-cyan-600 shrink-0" />

          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-100">
                <Wallet className="size-4 text-sky-600" />
              </div>
              <SheetTitle className="text-slate-900 text-lg font-semibold">
                New budget
              </SheetTitle>
            </div>
            <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
              Define the period and metadata. You can add lines right after.
            </SheetDescription>
          </SheetHeader>

          <Separator className="shrink-0" />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <Label>Budget name</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="e.g. FY 2026 Operating Budget"
                  disabled={creating}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Period type</Label>
                <Select
                  value={createForm.period_type}
                  onValueChange={(v) =>
                    setCreateForm({ ...createForm, period_type: v })
                  }
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    type="date"
                    value={createForm.period_start}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        period_start: e.target.value,
                      })
                    }
                    disabled={creating}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    type="date"
                    value={createForm.period_end}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        period_end: e.target.value,
                      })
                    }
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  placeholder="Optional context or assumptions"
                  disabled={creating}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Separator className="shrink-0" />

          <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={createBudget}
              disabled={creating}
              className="flex-1 bg-linear-to-br from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create budget"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && !deleting && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-100">
                <Trash2 className="size-4 text-rose-600" />
              </div>
              <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Removes the budget and all its lines. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteBudget}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
