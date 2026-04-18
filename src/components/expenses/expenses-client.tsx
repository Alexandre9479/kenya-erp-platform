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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

type Expense = {
  id: string;
  expense_number: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  payment_method: string;
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

const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "mpesa_till",    label: "M-Pesa Till (Buy Goods)" },
  { value: "mpesa_paybill", label: "M-Pesa Paybill" },
  { value: "mpesa_send",    label: "M-Pesa Send Money" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque" },
  { value: "card",          label: "Card / POS" },
  { value: "other",         label: "Other" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label]).concat([["mpesa", "M-Pesa"]])
);

const KES = (v: number) =>
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);

const statusConfig = {
  pending:  { label: "Pending",  icon: Clock,        className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", icon: XCircle,      className: "bg-red-100 text-red-700 border-red-200" },
};

type TenantInfo = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  kra_pin: string | null;
  logo_url: string | null;
};

type PaymentChannel = {
  id: string;
  name: string;
  channel_type:
    | "cash"
    | "mpesa_till"
    | "mpesa_paybill"
    | "mpesa_send"
    | "bank"
    | "cheque"
    | "card"
    | "other";
  is_default: boolean;
  is_active: boolean;
};

const METHOD_TO_CHANNEL_TYPE: Record<string, PaymentChannel["channel_type"] | null> = {
  cash: "cash",
  mpesa_till: "mpesa_till",
  mpesa_paybill: "mpesa_paybill",
  mpesa_send: "mpesa_send",
  bank_transfer: "bank",
  cheque: "cheque",
  card: "card",
  other: "other",
};

interface Props {
  initialExpenses: Expense[];
  total: number;
  tenant?: TenantInfo;
  paymentChannels?: PaymentChannel[];
}

export default function ExpensesClient({ initialExpenses, total, tenant, paymentChannels = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "Miscellaneous",
    expense_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    payment_channel_id: "",
    notes: "",
  });

  const eligibleChannels = paymentChannels.filter(
    (c) => c.is_active && c.channel_type === METHOD_TO_CHANNEL_TYPE[form.payment_method]
  );

  const filtered = expenses.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.expense_number.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const approvedTotal = expenses
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description.trim(),
          amount: parseFloat(form.amount),
          category: form.category,
          expense_date: form.expense_date,
          payment_method: form.payment_method,
          payment_channel_id: form.payment_channel_id || null,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      toast.success("Expense submitted successfully");
      setSheetOpen(false);
      setForm({ description: "", amount: "", category: "Miscellaneous", expense_date: new Date().toISOString().split("T")[0], payment_method: "cash", payment_channel_id: "", notes: "" });
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

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #expenses-printable, #expenses-printable * { visibility: visible !important; }
          #expenses-printable { position: fixed; inset: 0; padding: 24px; background: white; overflow: auto; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { margin: 15mm; size: A4 landscape; }
        }
      `}</style>

      <div id="expenses-printable" className="space-y-6">
        {/* Print-only company header */}
        <div className="hidden print-only" style={{ display: "none" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              {tenant?.logo_url && (
                <div className="relative w-14 h-14 mb-2">
                  <Image src={tenant.logo_url} alt="Logo" fill className="object-contain" />
                </div>
              )}
              <h2 className="text-lg font-bold text-slate-900">{tenant?.name ?? "Company"}</h2>
              {tenant?.address && <p className="text-xs text-slate-500">{tenant.address}</p>}
              {tenant?.city && <p className="text-xs text-slate-500">{tenant.city}</p>}
              {tenant?.phone && <p className="text-xs text-slate-500">Tel: {tenant.phone}</p>}
              {tenant?.kra_pin && <p className="text-xs text-slate-500">KRA PIN: {tenant.kra_pin}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-extrabold text-indigo-700 uppercase tracking-wide">Expense Report</h1>
              <p className="text-sm text-slate-500 mt-1">Generated: {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="border-t-2 border-indigo-600 mb-4" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expenses</h1>
            <p className="text-slate-500 text-sm mt-0.5">{total} expense{total !== 1 ? "s" : ""} tracked</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 hidden sm:flex">
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

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
          {[
            { label: "Total Expenses",    value: `KES ${KES(totalAmount)}`,  icon: Receipt,      gradient: "from-indigo-500 to-violet-600", bg: "bg-indigo-50",  color: "text-indigo-600" },
            { label: "Pending Approval",  value: String(pendingCount),        icon: Clock,        gradient: "from-amber-500 to-orange-500",  bg: "bg-amber-50",   color: "text-amber-600" },
            { label: "Approved Total",    value: `KES ${KES(approvedTotal)}`, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-600",  bg: "bg-emerald-50", color: "text-emerald-600" },
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

        {/* Table */}
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
                      <th className="px-4 py-2.5 whitespace-nowrap">Expense #</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Description</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Category</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Date</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Method</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
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
                            <p className="font-semibold text-slate-900">{exp.description}</p>
                            {exp.notes && <p className="text-xs text-slate-400 truncate max-w-48">{exp.notes}</p>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{exp.category}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(exp.expense_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{PAYMENT_METHOD_LABELS[exp.payment_method] ?? exp.payment_method}</td>
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
                                  <Button size="sm" variant="ghost" onClick={() => handleApprove(exp.id)}
                                    className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" disabled={isPending}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleReject(exp.id)}
                                    className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" disabled={isPending}>
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {exp.status !== "approved" && (
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(exp.id)}
                                  className="h-7 px-2 text-slate-400 hover:text-red-500 hover:bg-red-50" disabled={isPending}>
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
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 to-violet-600 shrink-0" />
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100">
                <Receipt className="size-4 text-indigo-600" />
              </div>
              <SheetTitle className="text-slate-900 text-lg font-semibold">Submit Expense</SheetTitle>
            </div>
            <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
              Record a business expense for approval.
            </SheetDescription>
          </SheetHeader>
          <Separator className="shrink-0" />
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Description <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Team lunch at Java House"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (KES) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date" value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v, payment_channel_id: "" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {eligibleChannels.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Payment Channel <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Select
                    value={form.payment_channel_id || "__none__"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, payment_channel_id: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {eligibleChannels.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.is_default ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Pick the specific till, paybill, or account this was paid from.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={3} placeholder="Additional details..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="resize-none"
                />
              </div>
            </div>
            <Separator className="shrink-0" />
            <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-32">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Expense"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
