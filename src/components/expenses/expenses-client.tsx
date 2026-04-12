"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt, Plus, Search, Loader2, Trash2,
  CheckCircle2, XCircle, Clock, Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Expense = {
  id: string;
  expense_number: string;
  title: string;
  amount: number;
  category: string | null;
  date: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
};

const CATEGORIES = [
  "Travel & Transport",
  "Office Supplies",
  "Utilities",
  "Rent",
  "Meals & Entertainment",
  "Marketing & Advertising",
  "Equipment & Maintenance",
  "Software & Subscriptions",
  "Professional Services",
  "Staff Welfare",
  "Miscellaneous",
];

const KES = (v: number) =>
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);

const statusConfig = {
  pending:  { label: "Pending",  icon: Clock,          className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2,   className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", icon: XCircle,        className: "bg-red-100 text-red-700 border-red-200" },
};

interface Props {
  initialExpenses: Expense[];
  total: number;
}

export default function ExpensesClient({ initialExpenses, total }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const filtered = expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.expense_number.toLowerCase().includes(search.toLowerCase()) ||
      (e.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter((e) => e.status === "pending");
  const approved = expenses.filter((e) => e.status === "approved");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          amount: parseFloat(form.amount),
          category: form.category || undefined,
          date: form.date,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      toast.success("Expense submitted successfully");
      setSheetOpen(false);
      setForm({ title: "", amount: "", category: "", date: new Date().toISOString().split("T")[0], notes: "" });
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Expense approved");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to approve expense");
    }
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Expense rejected");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to reject expense");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      toast.success("Expense deleted");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete expense");
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expenses</h1>
            <p className="text-slate-500 text-sm mt-0.5">{total} expense{total !== 1 ? "s" : ""} tracked</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 hidden sm:flex">
              <Download className="h-4 w-4" />Export
            </Button>
            <Button
              onClick={() => setSheetOpen(true)}
              className="gap-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 text-white shadow-lg shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" />New Expense
            </Button>
          </div>
        </div>

        {/* KPI summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
          {[
            { label: "Total Expenses", value: `KES ${KES(totalAmount)}`, icon: Receipt, gradient: "from-indigo-500 to-violet-600", bg: "bg-indigo-50", color: "text-indigo-600" },
            { label: "Pending Approval", value: String(pending.length), icon: Clock, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50", color: "text-amber-600" },
            { label: "Approved", value: `KES ${KES(approved.reduce((s, e) => s + e.amount, 0))}`, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", color: "text-emerald-600" },
          ].map(({ label, value, icon: Icon, gradient, bg, color }) => (
            <Card key={label} className="relative overflow-hidden border-0 shadow-sm">
              <div className={`h-1 w-full bg-linear-to-r ${gradient}`} />
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-slate-900">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative no-print">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-200"
          />
        </div>

        {/* Expenses table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-bold text-slate-900">Expense Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Receipt className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium mb-1">No expenses found</p>
                <p className="text-slate-400 text-sm mb-4">Submit your first expense to get started</p>
                <Button size="sm" onClick={() => setSheetOpen(true)} className="gap-2 no-print">
                  <Plus className="h-4 w-4" />New Expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-2.5">Expense #</th>
                      <th className="px-4 py-2.5">Title</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 no-print" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((exp) => {
                      const st = statusConfig[exp.status];
                      const Icon = st.icon;
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{exp.expense_number}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{exp.title}</p>
                            {exp.notes && <p className="text-xs text-slate-400 truncate max-w-48">{exp.notes}</p>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{exp.category ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(exp.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">KES {KES(exp.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${st.className}`}>
                              <Icon className="h-3 w-3" />{st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 no-print">
                            <div className="flex items-center justify-end gap-1.5">
                              {exp.status === "pending" && (
                                <>
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => handleApprove(exp.id)}
                                    className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    disabled={isPending}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => handleReject(exp.id)}
                                    className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    disabled={isPending}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {exp.status !== "approved" && (
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => handleDelete(exp.id)}
                                  className="h-7 px-2 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                  disabled={isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Expense Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold text-slate-900">Submit Expense</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Title *</Label>
              <Input
                placeholder="e.g. Team lunch at Java House"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount (KES) *</Label>
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</Label>
              <textarea
                rows={3}
                placeholder="Additional details..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 text-white font-semibold"
              >
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Expense"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
