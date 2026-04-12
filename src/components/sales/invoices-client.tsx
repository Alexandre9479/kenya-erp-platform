"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-400" },
};

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

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

  const limit = 25;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);

  // Derived KPI values
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* ── Module Hero Strip ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-emerald-100">
        <div className="relative h-24 bg-linear-to-r from-emerald-500 to-teal-600 px-6 flex items-center justify-between overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sales &amp; Invoices</h1>
              <p className="text-sm text-white/70">Track invoices, payments and outstanding balances</p>
            </div>
          </div>
          <Button
            asChild
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-sm shrink-0"
          >
            <Link href="/sales/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New Invoice
            </Link>
          </Button>
        </div>
        <div className="bg-white px-6 py-3 flex flex-wrap gap-4 border-t border-emerald-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-600 font-medium">{count} Total Invoices</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="text-sm text-slate-600 font-medium">{paidCount} Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm text-slate-600 font-medium">{overdueCount} Overdue</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-emerald-500 to-teal-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 font-medium">Total Invoices</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-emerald-500 to-teal-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{paidCount}</p>
              <p className="text-xs text-slate-500 font-medium">Paid Invoices</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-emerald-500 to-teal-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{overdueCount}</p>
              <p className="text-xs text-slate-500 font-medium">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search / Filter Bar ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search invoice number…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 focus-visible:ring-emerald-500"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
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
                <TableCell colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <p className="font-bold text-slate-800 text-base">No invoices found</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first invoice to get started</p>
                    <Button
                      asChild
                      className="mt-4 bg-linear-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
                    >
                      <Link href="/sales/new">
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Invoice
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const cfg = statusConfig[inv.status] ?? statusConfig.draft;
                const balance = inv.total_amount - inv.amount_paid;
                const isOverdue = inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_date) < new Date());
                return (
                  <TableRow key={inv.id} className="hover:bg-emerald-50/20 transition-colors border-b border-slate-100">
                    <TableCell>
                      <Link href={`/sales/${inv.id}`} className="font-medium text-emerald-600 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-700">{inv.customer_name}</TableCell>
                    <TableCell className="text-slate-500">{dateStr(inv.issue_date)}</TableCell>
                    <TableCell className={isOverdue ? "text-red-500 font-medium" : "text-slate-500"}>
                      {dateStr(inv.due_date)}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-800">KES {KES(inv.total_amount)}</TableCell>
                    <TableCell className="text-right text-slate-500">KES {KES(inv.amount_paid)}</TableCell>
                    <TableCell className={`text-right font-medium ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      KES {KES(balance)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/sales/${inv.id}`}>View</Link>
                          </DropdownMenuItem>
                          {inv.status === "draft" && (
                            <DropdownMenuItem onClick={() => markStatus(inv.id, "sent")}>
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(inv.status === "sent" || inv.status === "partial") && (
                            <DropdownMenuItem onClick={() => markStatus(inv.id, "paid")}>
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {inv.status === "draft" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
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
                                  <AlertDialogAction onClick={() => deleteInvoice(inv.id)} className="bg-red-600 hover:bg-red-700">
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
          <span>Showing {from}–{to} of {count}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={to >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
