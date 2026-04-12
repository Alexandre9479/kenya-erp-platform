"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Search, FileText, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search invoice number…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
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
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
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
                  <TableCell colSpan={9} className="py-12 text-center">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">No invoices found</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/sales/new">Create your first invoice</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const cfg = statusConfig[inv.status] ?? statusConfig.draft;
                  const balance = inv.total_amount - inv.amount_paid;
                  const isOverdue = inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_date) < new Date());
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link href={`/sales/${inv.id}`} className="font-medium text-blue-600 hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell className="text-slate-500">{dateStr(inv.issue_date)}</TableCell>
                      <TableCell className={isOverdue ? "text-red-500 font-medium" : "text-slate-500"}>
                        {dateStr(inv.due_date)}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">KES {KES(inv.total_amount)}</TableCell>
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
        </CardContent>
      </Card>

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
