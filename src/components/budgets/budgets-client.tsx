"use client";

import { useState } from "react";
import {
  Wallet, Plus, Trash2, CheckCircle2, AlertCircle, Edit3, TrendingUp, TrendingDown, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Budget = {
  id: string; name: string;
  period_type: string;
  period_start: string; period_end: string;
  status: "draft" | "approved" | "closed";
  notes: string | null;
};
type Account = { id: string; code: string; name: string; account_type: string };
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

const money = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function BudgetsClient({
  initialBudgets,
  accounts,
}: {
  initialBudgets: Budget[];
  accounts: Account[];
}) {
  const [budgets, setBudgets] = useState(initialBudgets);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [lines, setLines] = useState<VLine[]>([]);
  const [variance, setVariance] = useState<VLine[]>([]);
  const [view, setView] = useState<"edit" | "variance">("edit");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", period_type: "annual",
    period_start: `${new Date().getFullYear()}-01-01`,
    period_end: `${new Date().getFullYear()}-12-31`,
    notes: "",
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = async () => {
    const res = await fetch("/api/budgets");
    const json = await res.json();
    if (json.data) setBudgets(json.data);
  };

  const openBudget = async (b: Budget) => {
    setSelected(b);
    setView("edit");
    const res = await fetch(`/api/budgets/${b.id}`);
    const json = await res.json();
    if (json.data?.lines?.length) {
      setLines(json.data.lines);
    } else {
      // Seed empty lines for each month in period
      const start = new Date(b.period_start);
      const end = new Date(b.period_end);
      const seed: VLine[] = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        seed.push({
          account_id: null, category: "General", line_type: "expense",
          period_year: cursor.getFullYear(), period_month: cursor.getMonth() + 1, amount: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      setLines(seed);
    }
  };

  const loadVariance = async () => {
    if (!selected) return;
    const res = await fetch(`/api/budgets/${selected.id}/variance`);
    const json = await res.json();
    if (json.data) {
      setVariance(json.data.lines);
      setView("variance");
    }
  };

  const createBudget = async () => {
    if (!createForm.name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        await reload();
        await openBudget(json.data);
      }
    } finally { setCreating(false); }
  };

  const addLine = () => {
    if (!selected) return;
    const start = new Date(selected.period_start);
    setLines([
      ...lines,
      {
        account_id: null, category: "",
        line_type: "expense",
        period_year: start.getFullYear(), period_month: start.getMonth() + 1,
        amount: 0,
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<VLine>) => {
    const next = [...lines];
    next[idx] = { ...next[idx], ...patch };
    setLines(next);
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const saveLines = async () => {
    if (!selected) return;
    await fetch(`/api/budgets/${selected.id}/lines`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    await openBudget(selected);
  };

  const updateStatus = async (status: "approved" | "closed" | "draft") => {
    if (!selected) return;
    await fetch(`/api/budgets/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await reload();
    setSelected({ ...selected, status });
  };

  const deleteBudget = async () => {
    if (!deleteId) return;
    await fetch(`/api/budgets/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    if (selected?.id === deleteId) { setSelected(null); setLines([]); }
    await reload();
  };

  const totals = lines.reduce(
    (acc, l) => {
      const v = Number(l.amount);
      if (l.line_type === "revenue") acc.revenue += v;
      else acc.expense += v;
      return acc;
    },
    { revenue: 0, expense: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-blue-600 via-sky-600 to-cyan-700 p-4 sm:p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
            <Wallet className="size-5 sm:size-7 text-white" />
          </div>
          <div>
            <p className="text-blue-100 text-xs sm:text-sm font-medium tracking-wide uppercase">Finance</p>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Budgets & Variance</h1>
            <p className="text-blue-100 text-sm mt-0.5 hidden sm:block">Plan spend and track against actuals</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Left: budget list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Budgets</CardTitle>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="size-3.5" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Budget</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="e.g. FY 2026 Operating Budget" />
                  </div>
                  <div className="space-y-1">
                    <Label>Period type</Label>
                    <Select value={createForm.period_type}
                      onValueChange={(v) => setCreateForm({ ...createForm, period_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Start</Label>
                      <Input type="date" value={createForm.period_start}
                        onChange={(e) => setCreateForm({ ...createForm, period_start: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>End</Label>
                      <Input type="date" value={createForm.period_end}
                        onChange={(e) => setCreateForm({ ...createForm, period_end: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Textarea value={createForm.notes}
                      onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={createBudget} disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {budgets.length === 0 ? (
              <div className="text-center py-6 px-4">
                <Wallet className="size-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No budgets. Create one to get started.</p>
              </div>
            ) : (
              <div className="divide-y">
                {budgets.map((b) => (
                  <button
                    key={b.id}
                    className={cn(
                      "w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between gap-2",
                      selected?.id === b.id && "bg-indigo-50"
                    )}
                    onClick={() => openBudget(b)}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{b.name}</div>
                      <div className="text-xs text-slate-500 truncate">{b.period_start} → {b.period_end}</div>
                    </div>
                    <Badge variant={b.status === "approved" ? "default" : "outline"} className="capitalize shrink-0 text-xs">
                      {b.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: editor / variance */}
        {selected ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">{selected.name}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  <Calendar className="inline size-3 mr-1" />
                  {selected.period_start} → {selected.period_end}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant={view === "edit" ? "default" : "outline"} size="sm" onClick={() => setView("edit")}>
                  <Edit3 className="size-3.5 mr-1" />Edit
                </Button>
                <Button variant={view === "variance" ? "default" : "outline"} size="sm" onClick={loadVariance}>
                  <TrendingUp className="size-3.5 mr-1" />Variance
                </Button>
                {selected.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus("approved")}>
                    <CheckCircle2 className="size-3.5 mr-1" />Approve
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(selected.id)}>
                  <Trash2 className="size-3.5 text-red-600" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {view === "edit" && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Total revenue: <strong className="text-emerald-700">KES {money(totals.revenue)}</strong></span>
                    <span>•</span>
                    <span>Total expense: <strong className="text-red-700">KES {money(totals.expense)}</strong></span>
                    <span>•</span>
                    <span>Net: <strong>KES {money(totals.revenue - totals.expense)}</strong></span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Account / Category</TableHead>
                          <TableHead className="whitespace-nowrap">Type</TableHead>
                          <TableHead className="whitespace-nowrap">Period</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Amount (KES)</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((l, i) => (
                          <TableRow key={i}>
                            <TableCell className="min-w-48">
                              <Select
                                value={l.account_id ?? "category"}
                                onValueChange={(v) => updateLine(i, v === "category" ? { account_id: null } : { account_id: v, category: null })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="category">(free-text category)</SelectItem>
                                  {accounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!l.account_id && (
                                <Input
                                  className="h-7 text-xs mt-1"
                                  value={l.category ?? ""}
                                  onChange={(e) => updateLine(i, { category: e.target.value })}
                                  placeholder="Category name"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Select value={l.line_type} onValueChange={(v) => updateLine(i, { line_type: v as any })}>
                                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="revenue">Revenue</SelectItem>
                                  <SelectItem value="expense">Expense</SelectItem>
                                  <SelectItem value="cogs">COGS</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex gap-1">
                                <Select value={String(l.period_month)} onValueChange={(v) => updateLine(i, { period_month: Number(v) })}>
                                  <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {MONTH_NAMES.map((n, idx) => (
                                      <SelectItem key={idx} value={String(idx + 1)}>{n}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number" className="h-8 text-xs w-20"
                                  value={l.period_year}
                                  onChange={(e) => updateLine(i, { period_year: Number(e.target.value) })}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input type="number" step="0.01" className="h-8 text-xs text-right w-32"
                                value={l.amount}
                                onChange={(e) => updateLine(i, { amount: Number(e.target.value) })} />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => removeLine(i)}>
                                <Trash2 className="size-3.5 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={addLine}><Plus className="size-3.5 mr-1" />Add line</Button>
                    <Button size="sm" onClick={saveLines}>Save budget</Button>
                  </div>
                </>
              )}

              {view === "variance" && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Account / Category</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="whitespace-nowrap">Period</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Budget</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Actual</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Variance</TableHead>
                        <TableHead className="whitespace-nowrap text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">
                            No lines yet. Add budget lines and save first.
                          </TableCell>
                        </TableRow>
                      ) : variance.map((l, i) => {
                        const overBudget = l.line_type === "revenue" ? (l.variance ?? 0) < 0 : (l.variance ?? 0) > 0;
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-sm">
                              {l.accounts ? `${l.accounts.code} — ${l.accounts.name}` : (l.category ?? "—")}
                            </TableCell>
                            <TableCell className="text-xs capitalize">{l.line_type}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {MONTH_NAMES[l.period_month - 1]} {l.period_year}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">{money(l.amount)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">{money(l.actual)}</TableCell>
                            <TableCell className={cn(
                              "text-right whitespace-nowrap font-semibold",
                              overBudget ? "text-red-700" : "text-emerald-700"
                            )}>
                              {overBudget && <TrendingUp className="inline size-3 mr-1" />}
                              {!overBudget && <TrendingDown className="inline size-3 mr-1" />}
                              {money(l.variance)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right whitespace-nowrap text-xs",
                              overBudget ? "text-red-700" : "text-emerald-700"
                            )}>
                              {(l.variance_pct ?? 0).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-10 text-center text-slate-500 text-sm">
            <Wallet className="size-10 text-slate-300 mx-auto mb-2" />
            Select a budget on the left, or create a new one.
          </CardContent></Card>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>Removes the budget and all its lines. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteBudget} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
