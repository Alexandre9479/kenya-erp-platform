"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  TrendingUp,
  AlertCircle,
  Banknote,
  Sparkles,
  CalendarDays,
  Wallet,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PremiumHero, HeroStatGrid, HeroStat, EmptyState } from "@/components/ui/premium-hero";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  amount_paid: number;
};

const statusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  draft:     { label: "Draft",     bg: "border-slate-200 bg-slate-50 text-slate-600",      dot: "bg-slate-400" },
  sent:      { label: "Sent",      bg: "border-blue-200 bg-blue-50 text-blue-700",         dot: "bg-blue-500" },
  partial:   { label: "Partial",   bg: "border-amber-200 bg-amber-50 text-amber-700",      dot: "bg-amber-500" },
  paid:      { label: "Paid",      bg: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500 animate-pulse" },
  overdue:   { label: "Overdue",   bg: "border-rose-200 bg-rose-50 text-rose-700",         dot: "bg-rose-500 animate-pulse" },
  cancelled: { label: "Cancelled", bg: "border-slate-200 bg-slate-50 text-slate-400",      dot: "bg-slate-300" },
};

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

const AVATAR_PALETTE = [
  "from-emerald-500 to-teal-600",
  "from-teal-500 to-cyan-600",
  "from-lime-500 to-emerald-600",
  "from-indigo-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
];

function customerGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

interface Props {
  initialInvoices: InvoiceRow[];
  totalCount: number;
}

export function InvoicesClient({ initialInvoices, totalCount }: Props) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [count, setCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchInvoices, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    if (isFirstRender.current) return;
    fetchInvoices();
  }, [status, page]);

  async function fetchInvoices() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: "25" });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/invoices?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setInvoices(json.data);
      setCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }

  async function markStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice updated");
      fetchInvoices();
    } catch {
      toast.error("Failed to update invoice");
    }
  }

  async function deleteInvoice(id: string) {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed");
      }
      toast.success("Invoice deleted");
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const [paymentTarget, setPaymentTarget] = useState<InvoiceRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  function openPaymentDialog(inv: InvoiceRow) {
    setPaymentTarget(inv);
    const balance = inv.total_amount - inv.amount_paid;
    setPaymentAmount(balance > 0 ? balance.toFixed(2) : "");
  }

  async function recordPayment() {
    if (!paymentTarget) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    setIsRecordingPayment(true);
    try {
      const newPaid = paymentTarget.amount_paid + amount;
      const res = await fetch(`/api/invoices/${paymentTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_paid: newPaid }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed");
      }
      toast.success(`Payment of KES ${KES(amount)} recorded`);
      setPaymentTarget(null);
      setPaymentAmount("");
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  }

  const limit = 25;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);

  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const outstandingAmount = invoices.reduce((s, i) => s + Math.max(0, i.total_amount - i.amount_paid), 0);
  const collectedAmount = invoices.reduce((s, i) => s + i.amount_paid, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Premium Hero ─────────────────────────────────────────────── */}
      <PremiumHero
        gradient="emerald"
        icon={FileText}
        eyebrow={<><Sparkles className="size-3" /> Revenue Pipeline</>}
        title="Sales & Invoices"
        description="Issue invoices, track collections and chase outstanding balances."
        actions={
          <Button
            asChild
            size="sm"
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-md shrink-0"
          >
            <Link href="/sales/new">
              <Plus className="size-4 mr-1.5" />
              New Invoice
            </Link>
          </Button>
        }
      >
        <HeroStatGrid>
          <HeroStat icon={Receipt}     label="Invoices"     value={count.toLocaleString()} />
          <HeroStat icon={TrendingUp}  label="Paid"         value={paidCount}                      accent="success" />
          <HeroStat icon={AlertCircle} label="Overdue"      value={overdueCount}                   accent="danger" />
          <HeroStat icon={Wallet}      label="Outstanding"  value={`KES ${KES(outstandingAmount)}`} accent="warning" />
        </HeroStatGrid>
      </PremiumHero>

      {/* ── Search / Filter Bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search invoice or customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 focus-visible:ring-emerald-500"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            KES {KES(collectedAmount)} collected
          </span>
        </div>
      </div>

      {/* ── Mobile: Invoice Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Create your first invoice to get started."
            action={
              <Button asChild className="bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700">
                <Link href="/sales/new"><Plus className="size-4 mr-1.5" /> New Invoice</Link>
              </Button>
            }
          />
        ) : (
          invoices.map((inv) => {
            const cfg = statusConfig[inv.status] ?? statusConfig.draft;
            const balance = inv.total_amount - inv.amount_paid;
            const isOverdue = inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_date) < new Date());
            return (
              <div key={inv.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className={`absolute left-0 top-0 h-full w-1 ${cfg.dot.split(" ")[0]}`} />
                <div className="flex items-start gap-2.5 pl-1.5">
                  <div className={`size-9 rounded-lg bg-linear-to-br ${customerGradient(inv.customer_name)} flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm`}>
                    {inv.customer_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/sales/${inv.id}`} className="font-mono text-sm font-semibold text-emerald-700 hover:underline truncate">
                        {inv.invoice_number}
                      </Link>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${cfg.bg}`}>
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{inv.customer_name}</p>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide">Total</p>
                    <p className="font-semibold text-slate-800 tabular-nums">KES {KES(inv.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide">Paid</p>
                    <p className="font-semibold text-slate-600 tabular-nums">KES {KES(inv.amount_paid)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide">Balance</p>
                    <p className={`font-bold tabular-nums ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>KES {KES(balance)}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                  <span className={`inline-flex items-center gap-1 ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                    <CalendarDays className="size-3" />
                    Due {dateStr(inv.due_date)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/sales/${inv.id}`}>View Invoice</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href={`/sales/statement/${inv.customer_id}`}>Customer Statement</Link></DropdownMenuItem>
                      {inv.status === "draft" && <DropdownMenuItem onClick={() => markStatus(inv.id, "sent")}>Mark as Sent</DropdownMenuItem>}
                      {(inv.status === "sent" || inv.status === "partial" || inv.status === "overdue") && (
                        <DropdownMenuItem onClick={() => openPaymentDialog(inv)}><Banknote className="size-4 mr-1.5" />Record Payment</DropdownMenuItem>
                      )}
                      {(inv.status === "sent" || inv.status === "partial") && (
                        <DropdownMenuItem onClick={() => markStatus(inv.id, "paid")}>Mark as Fully Paid</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop Table ────────────────────────────────────────────── */}
      <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-y border-slate-200">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Paid</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Balance</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="No invoices found"
                    description="Create your first invoice to get started."
                    action={
                      <Button asChild className="bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700">
                        <Link href="/sales/new"><Plus className="size-4 mr-1.5" /> New Invoice</Link>
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const cfg = statusConfig[inv.status] ?? statusConfig.draft;
                const balance = inv.total_amount - inv.amount_paid;
                const isOverdue = inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_date) < new Date());
                return (
                  <TableRow key={inv.id} className="hover:bg-emerald-50/40 transition-colors border-b border-slate-100">
                    <TableCell>
                      <Link href={`/sales/${inv.id}`} className="font-mono text-sm font-semibold text-emerald-700 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`size-7 rounded-lg bg-linear-to-br ${customerGradient(inv.customer_name)} flex items-center justify-center shrink-0 text-white font-bold text-[10px] shadow-sm`}>
                          {inv.customer_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 truncate">{inv.customer_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3 text-slate-400" />{dateStr(inv.issue_date)}</span>
                    </TableCell>
                    <TableCell className={`text-xs whitespace-nowrap ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" />{dateStr(inv.due_date)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg}`}>
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-800 tabular-nums">KES {KES(inv.total_amount)}</TableCell>
                    <TableCell className="text-right text-slate-500 tabular-nums">KES {KES(inv.amount_paid)}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      KES {KES(balance)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/sales/${inv.id}`}>View Invoice</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/sales/statement/${inv.customer_id}`}>Customer Statement</Link>
                          </DropdownMenuItem>
                          {inv.status === "draft" && (
                            <DropdownMenuItem onClick={() => markStatus(inv.id, "sent")}>
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(inv.status === "sent" || inv.status === "partial" || inv.status === "overdue") && (
                            <DropdownMenuItem onClick={() => openPaymentDialog(inv)}>
                              <Banknote className="size-4 mr-1.5" />
                              Record Payment
                            </DropdownMenuItem>
                          )}
                          {(inv.status === "sent" || inv.status === "partial") && (
                            <DropdownMenuItem onClick={() => markStatus(inv.id, "paid")}>
                              Mark as Fully Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {inv.status === "draft" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600">
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete {inv.invoice_number}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteInvoice(inv.id)} className="bg-rose-600 hover:bg-rose-700">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {count > limit && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="tabular-nums">Showing {from}–{to} of {count}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={to >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* ── Record Payment Dialog ────────────────────────────────────── */}
      <AlertDialog open={!!paymentTarget} onOpenChange={(open) => { if (!open) { setPaymentTarget(null); setPaymentAmount(""); } }}>
        <AlertDialogContent className="overflow-hidden p-0">
          <div className="h-1.5 w-full bg-linear-to-r from-emerald-600 to-teal-600" />
          <AlertDialogHeader className="px-6 pt-5">
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
                <Banknote className="size-5 text-white" />
              </div>
              <span>Record Payment</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm mt-2">
                <p className="text-slate-600">
                  Recording payment for <span className="font-semibold text-slate-900">{paymentTarget?.invoice_number}</span>{" "}
                  (<span className="text-slate-800">{paymentTarget?.customer_name}</span>)
                </p>
                <div className="grid grid-cols-3 gap-2 bg-linear-to-br from-slate-50 to-slate-100 rounded-xl p-3 text-xs border border-slate-200">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase tracking-wide">Invoice Total</span>
                    <p className="font-semibold text-slate-900 tabular-nums">KES {KES(paymentTarget?.total_amount ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase tracking-wide">Already Paid</span>
                    <p className="font-semibold text-slate-900 tabular-nums">KES {KES(paymentTarget?.amount_paid ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase tracking-wide">Balance</span>
                    <p className="font-bold text-rose-600 tabular-nums">KES {KES((paymentTarget?.total_amount ?? 0) - (paymentTarget?.amount_paid ?? 0))}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Payment Amount (KES)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount…"
                    className="focus-visible:ring-emerald-500 tabular-nums"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 pb-5 pt-2">
            <AlertDialogCancel disabled={isRecordingPayment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); recordPayment(); }}
              disabled={isRecordingPayment}
              className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20"
            >
              {isRecordingPayment ? "Recording…" : "Record Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
