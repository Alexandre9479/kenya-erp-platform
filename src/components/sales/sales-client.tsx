"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  TrendingUp,
  Clock,
  AlertCircle,
  Banknote,
  ArrowRightLeft,
  ClipboardList,
  ReceiptText,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ── Types ────────────────────────────────────────────────────── */
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

type QuoteRow = {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  total_amount: number;
  converted_invoice_id: string | null;
};

type CreditNoteRow = {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  issue_date: string;
  reason: string;
  status: string;
  total_amount: number;
};

type DeliveryNoteRow = {
  id: string;
  delivery_note_number: string;
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  delivery_date: string;
  status: string;
  driver_name: string | null;
  vehicle_reg: string | null;
};

/* ── Config ────────────────────────────────────────────────────── */
const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-600" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  partial:   { label: "Partial",   className: "bg-amber-100 text-amber-700" },
  paid:      { label: "Paid",      className: "bg-emerald-100 text-emerald-700" },
  overdue:   { label: "Overdue",   className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-400" },
};

const quoteStatusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-600" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  accepted:  { label: "Accepted",  className: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700" },
  expired:   { label: "Expired",   className: "bg-slate-100 text-slate-400" },
  converted: { label: "Converted", className: "bg-indigo-100 text-indigo-700" },
};

const dnStatusConfig: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending",    className: "bg-amber-100 text-amber-700" },
  dispatched:  { label: "Dispatched", className: "bg-blue-100 text-blue-700" },
  delivered:   { label: "Delivered",  className: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Cancelled",  className: "bg-slate-100 text-slate-400" },
};

const cnStatusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-600" },
  approved:  { label: "Approved",  className: "bg-blue-100 text-blue-700" },
  applied:   { label: "Applied",   className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-400" },
};

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

/* ── Props ────────────────────────────────────────────────────── */
interface Props {
  initialInvoices: InvoiceRow[];
  invoiceCount: number;
  initialQuotes: QuoteRow[];
  quoteCount: number;
  initialCreditNotes?: CreditNoteRow[];
  creditNoteCount?: number;
}

/* ── Main Component ──────────────────────────────────────────── */
export function SalesClient({ initialInvoices, invoiceCount, initialQuotes, quoteCount, initialCreditNotes = [], creditNoteCount = 0 }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "quotes" ? "quotes" : tabParam === "credit_notes" ? "credit_notes" : tabParam === "delivery_notes" ? "delivery_notes" : "invoices";

  // ── Invoice state ──
  const [invoices, setInvoices] = useState(initialInvoices);
  const [invCount, setInvCount] = useState(invoiceCount);
  const [invSearch, setInvSearch] = useState("");
  const [invStatus, setInvStatus] = useState("all");
  const [invPage, setInvPage] = useState(1);
  const [invLoading, setInvLoading] = useState(false);
  const invSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invFirstRender = useRef(true);

  // ── Quote state ──
  const [quotes, setQuotes] = useState(initialQuotes);
  const [qtCount, setQtCount] = useState(quoteCount);
  const [qtSearch, setQtSearch] = useState("");
  const [qtStatus, setQtStatus] = useState("all");
  const [qtPage, setQtPage] = useState(1);
  const [qtLoading, setQtLoading] = useState(false);
  const qtSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qtFirstRender = useRef(true);

  // ── Credit Note state ──
  const [creditNotes, setCreditNotes] = useState(initialCreditNotes);
  const [cnCount, setCnCount] = useState(creditNoteCount);
  const [cnSearch, setCnSearch] = useState("");
  const [cnStatus, setCnStatus] = useState("all");
  const [cnPage, setCnPage] = useState(1);
  const [cnLoading, setCnLoading] = useState(false);
  const cnSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cnFirstRender = useRef(true);
  const cnFetched = useRef(false);

  // ── Delivery Note state ──
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteRow[]>([]);
  const [dnCount, setDnCount] = useState(0);
  const [dnSearch, setDnSearch] = useState("");
  const [dnStatus, setDnStatus] = useState("all");
  const [dnPage, setDnPage] = useState(1);
  const [dnLoading, setDnLoading] = useState(false);
  const dnSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dnFirstRender = useRef(true);
  const dnFetched = useRef(false);

  // ── Payment dialog ──
  const [paymentTarget, setPaymentTarget] = useState<InvoiceRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  /* ── Invoice fetching ──────────────────────────── */
  useEffect(() => {
    if (invFirstRender.current) { invFirstRender.current = false; return; }
    if (invSearchTimer.current) clearTimeout(invSearchTimer.current);
    invSearchTimer.current = setTimeout(fetchInvoices, 400);
    return () => { if (invSearchTimer.current) clearTimeout(invSearchTimer.current); };
  }, [invSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (invFirstRender.current) return;
    fetchInvoices();
  }, [invStatus, invPage]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInvoices() {
    setInvLoading(true);
    try {
      const params = new URLSearchParams({ search: invSearch, page: String(invPage), limit: "25" });
      if (invStatus !== "all") params.set("status", invStatus);
      const res = await fetch(`/api/invoices?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setInvoices(json.data);
      setInvCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setInvLoading(false);
    }
  }

  /* ── Quote fetching ──────────────────────────── */
  useEffect(() => {
    if (qtFirstRender.current) { qtFirstRender.current = false; return; }
    if (qtSearchTimer.current) clearTimeout(qtSearchTimer.current);
    qtSearchTimer.current = setTimeout(fetchQuotes, 400);
    return () => { if (qtSearchTimer.current) clearTimeout(qtSearchTimer.current); };
  }, [qtSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (qtFirstRender.current) return;
    fetchQuotes();
  }, [qtStatus, qtPage]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchQuotes() {
    setQtLoading(true);
    try {
      const params = new URLSearchParams({ search: qtSearch, page: String(qtPage), limit: "25" });
      if (qtStatus !== "all") params.set("status", qtStatus);
      const res = await fetch(`/api/quotes?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setQuotes(json.data);
      setQtCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load quotes");
    } finally {
      setQtLoading(false);
    }
  }

  /* ── Delivery Note fetching ─────────────────────── */
  useEffect(() => {
    if (dnFirstRender.current) { dnFirstRender.current = false; return; }
    if (dnSearchTimer.current) clearTimeout(dnSearchTimer.current);
    dnSearchTimer.current = setTimeout(fetchDeliveryNotes, 400);
    return () => { if (dnSearchTimer.current) clearTimeout(dnSearchTimer.current); };
  }, [dnSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dnFirstRender.current) return;
    fetchDeliveryNotes();
  }, [dnStatus, dnPage]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchDeliveryNotes() {
    setDnLoading(true);
    try {
      const params = new URLSearchParams({ search: dnSearch, page: String(dnPage), limit: "25" });
      if (dnStatus !== "all") params.set("status", dnStatus);
      const res = await fetch(`/api/delivery-notes?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDeliveryNotes(json.data);
      setDnCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load delivery notes");
    } finally {
      setDnLoading(false);
    }
  }

  /* ── Credit Note fetching ──────────────────────── */
  useEffect(() => {
    if (cnFirstRender.current) { cnFirstRender.current = false; return; }
    if (cnSearchTimer.current) clearTimeout(cnSearchTimer.current);
    cnSearchTimer.current = setTimeout(fetchCreditNotes, 400);
    return () => { if (cnSearchTimer.current) clearTimeout(cnSearchTimer.current); };
  }, [cnSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cnFirstRender.current) return;
    fetchCreditNotes();
  }, [cnStatus, cnPage]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCreditNotes() {
    setCnLoading(true);
    try {
      const params = new URLSearchParams({ search: cnSearch, page: String(cnPage), limit: "25" });
      if (cnStatus !== "all") params.set("status", cnStatus);
      const res = await fetch(`/api/credit-notes?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setCreditNotes(json.data);
      setCnCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load credit notes");
    } finally {
      setCnLoading(false);
    }
  }

  /* ── Invoice actions ────────────────────────────── */
  async function markInvoiceStatus(id: string, newStatus: string) {
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

  /* ── Quote actions ─────────────────────────────── */
  async function markQuoteStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Quote updated");
      fetchQuotes();
    } catch {
      toast.error("Failed to update quote");
    }
  }

  async function deleteQuote(id: string) {
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed");
      }
      toast.success("Quote deleted");
      fetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function convertQuote(id: string) {
    try {
      const res = await fetch(`/api/quotes/${id}/convert`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(json.message ?? "Converted to invoice");
      fetchQuotes();
      fetchInvoices();
      router.push(`/sales/${json.data.invoice_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert");
    }
  }

  /* ── Delivery Note actions ────────────────────────── */
  async function markDnStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Delivery note updated");
      fetchDeliveryNotes();
    } catch {
      toast.error("Failed to update delivery note");
    }
  }

  /* ── Credit Note actions ─────────────────────────── */
  async function markCnStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/credit-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(newStatus === "applied" ? "Credit note applied to invoice" : "Credit note updated");
      fetchCreditNotes();
      if (newStatus === "applied") fetchInvoices();
    } catch {
      toast.error("Failed to update credit note");
    }
  }

  async function deleteCreditNote(id: string) {
    try {
      const res = await fetch(`/api/credit-notes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed");
      }
      toast.success("Credit note deleted");
      fetchCreditNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  /* ── Derived values ─────────────────────────────── */
  const invLimit = 25;
  const invFrom = (invPage - 1) * invLimit + 1;
  const invTo = Math.min(invPage * invLimit, invCount);
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const qtLimit = 25;
  const qtFrom = (qtPage - 1) * qtLimit + 1;
  const qtTo = Math.min(qtPage * qtLimit, qtCount);

  const cnLimit = 25;
  const cnFrom = (cnPage - 1) * cnLimit + 1;
  const cnTo = Math.min(cnPage * cnLimit, cnCount);

  const dnLimit = 25;
  const dnFrom = (dnPage - 1) * dnLimit + 1;
  const dnTo = Math.min(dnPage * dnLimit, dnCount);

  return (
    <div className="space-y-6">
      {/* ── Module Hero Strip ────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-emerald-100">
        <div className="relative bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-4 sm:px-6 sm:py-0 sm:h-24 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sales &amp; Invoices</h1>
              <p className="text-sm text-white/70 hidden sm:block">Quotes, invoices, payments &amp; customer statements</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30 font-semibold shadow-sm">
              <Link href="/sales/quotes/new">
                <ClipboardList className="h-4 w-4 mr-1.5" />
                New Quote
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-sm">
              <Link href="/sales/new">
                <Plus className="h-4 w-4 mr-1.5" />
                New Invoice
              </Link>
            </Button>
          </div>
        </div>
        <div className="bg-white px-6 py-3 flex flex-wrap gap-4 border-t border-emerald-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-600 font-medium">{invCount} Invoices</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="text-sm text-slate-600 font-medium">{paidCount} Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm text-slate-600 font-medium">{overdueCount} Overdue</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span className="text-sm text-slate-600 font-medium">{qtCount} Quotations</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto w-max min-w-full">
            <TabsTrigger value="invoices" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
              <FileText className="size-3.5" />Invoices
            </TabsTrigger>
            <TabsTrigger value="quotes" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
              <ClipboardList className="size-3.5" />Quotations
            </TabsTrigger>
            <TabsTrigger
              value="delivery_notes"
              className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm"
              onClick={() => { if (!dnFetched.current) { dnFetched.current = true; fetchDeliveryNotes(); } }}
            >
              <Truck className="size-3.5" /><span className="hidden sm:inline">Delivery</span> DN
            </TabsTrigger>
            <TabsTrigger
              value="credit_notes"
              className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm"
              onClick={() => { if (!cnFetched.current) { cnFetched.current = true; fetchCreditNotes(); } }}
            >
              <ReceiptText className="size-3.5" /><span className="hidden sm:inline">Credit</span> CN
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ══════════ INVOICES TAB ══════════ */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-linear-to-r from-emerald-500 to-teal-600" />
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{invCount}</p>
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
                  <p className="text-xs text-slate-500 font-medium">Paid</p>
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

          {/* Search / Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search invoice number…"
                value={invSearch}
                onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
                className="pl-9 focus-visible:ring-emerald-500"
              />
            </div>
            <Select value={invStatus} onValueChange={(v) => { setInvStatus(v); setInvPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(invoiceStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Table */}
          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Issue Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Paid</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Balance</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invLoading ? (
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
                        <Button asChild className="mt-4 bg-linear-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
                          <Link href="/sales/new"><Plus className="h-4 w-4 mr-1.5" />New Invoice</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const cfg = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.draft;
                    const balance = inv.total_amount - inv.amount_paid;
                    const isOverdue = inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_date) < new Date());
                    return (
                      <TableRow key={inv.id} className="hover:bg-emerald-50/20 transition-colors border-b border-slate-100">
                        <TableCell>
                          <Link href={`/sales/${inv.id}`} className="font-medium text-emerald-600 hover:underline">{inv.invoice_number}</Link>
                        </TableCell>
                        <TableCell className="text-slate-700">{inv.customer_name}</TableCell>
                        <TableCell className="text-slate-500">{dateStr(inv.issue_date)}</TableCell>
                        <TableCell className={isOverdue ? "text-red-500 font-medium" : "text-slate-500"}>{dateStr(inv.due_date)}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-800">KES {KES(inv.total_amount)}</TableCell>
                        <TableCell className="text-right text-slate-500">KES {KES(inv.amount_paid)}</TableCell>
                        <TableCell className={`text-right font-medium ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>KES {KES(balance)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/sales/${inv.id}`}>View Invoice</Link></DropdownMenuItem>
                              <DropdownMenuItem asChild><Link href={`/sales/statement/${inv.customer_id}`}>Customer Statement</Link></DropdownMenuItem>
                              {inv.status === "draft" && (
                                <DropdownMenuItem onClick={() => markInvoiceStatus(inv.id, "sent")}>Mark as Sent</DropdownMenuItem>
                              )}
                              {(inv.status === "sent" || inv.status === "partial" || inv.status === "overdue") && (
                                <DropdownMenuItem onClick={() => openPaymentDialog(inv)}>
                                  <Banknote className="h-4 w-4 mr-1.5" />Record Payment
                                </DropdownMenuItem>
                              )}
                              {(inv.status === "sent" || inv.status === "partial") && (
                                <DropdownMenuItem onClick={() => markInvoiceStatus(inv.id, "paid")}>Mark as Fully Paid</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {inv.status === "draft" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Delete</DropdownMenuItem>
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
                                      <AlertDialogAction onClick={() => deleteInvoice(inv.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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

          {invCount > invLimit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Showing {invFrom}–{invTo} of {invCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={invPage === 1} onClick={() => setInvPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={invTo >= invCount} onClick={() => setInvPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════ QUOTES TAB ══════════ */}
        <TabsContent value="quotes" className="mt-4 space-y-4">
          {/* Search / Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search quote number…"
                value={qtSearch}
                onChange={(e) => { setQtSearch(e.target.value); setQtPage(1); }}
                className="pl-9 focus-visible:ring-emerald-500"
              />
            </div>
            <Select value={qtStatus} onValueChange={(v) => { setQtStatus(v); setQtPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(quoteStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quotes Table */}
          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Quote #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Issue Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Valid Until</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {qtLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                          <ClipboardList className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No quotations found</p>
                        <p className="text-sm text-slate-500 mt-1">Create a quotation and convert it to an invoice when accepted</p>
                        <Button asChild className="mt-4 bg-linear-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
                          <Link href="/sales/quotes/new"><Plus className="h-4 w-4 mr-1.5" />New Quote</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((qt) => {
                    const cfg = quoteStatusConfig[qt.status] ?? quoteStatusConfig.draft;
                    const isExpired = qt.status !== "converted" && qt.status !== "rejected" && new Date(qt.expiry_date) < new Date();
                    return (
                      <TableRow key={qt.id} className="hover:bg-emerald-50/20 transition-colors border-b border-slate-100">
                        <TableCell>
                          <Link href={`/sales/quotes/${qt.id}`} className="font-medium text-emerald-600 hover:underline">{qt.quote_number}</Link>
                        </TableCell>
                        <TableCell className="text-slate-700">{qt.customer_name}</TableCell>
                        <TableCell className="text-slate-500">{dateStr(qt.issue_date)}</TableCell>
                        <TableCell className={isExpired ? "text-red-500 font-medium" : "text-slate-500"}>{dateStr(qt.expiry_date)}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-800">KES {KES(qt.total_amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/sales/quotes/${qt.id}`}>View Quote</Link></DropdownMenuItem>
                              {qt.status === "draft" && (
                                <DropdownMenuItem onClick={() => markQuoteStatus(qt.id, "sent")}>Mark as Sent</DropdownMenuItem>
                              )}
                              {(qt.status === "sent" || qt.status === "draft") && (
                                <DropdownMenuItem onClick={() => markQuoteStatus(qt.id, "accepted")}>Mark as Accepted</DropdownMenuItem>
                              )}
                              {qt.status !== "converted" && qt.status !== "rejected" && qt.status !== "expired" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => convertQuote(qt.id)} className="text-indigo-600">
                                    <ArrowRightLeft className="h-4 w-4 mr-1.5" />Convert to Invoice
                                  </DropdownMenuItem>
                                </>
                              )}
                              {qt.status === "converted" && qt.converted_invoice_id && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/sales/${qt.converted_invoice_id}`}>View Invoice</Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {qt.status === "draft" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Delete</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete {qt.quote_number}. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteQuote(qt.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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

          {qtCount > qtLimit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Showing {qtFrom}–{qtTo} of {qtCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={qtPage === 1} onClick={() => setQtPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={qtTo >= qtCount} onClick={() => setQtPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>
        {/* ══════════ DELIVERY NOTES TAB ══════════ */}
        <TabsContent value="delivery_notes" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search DN number…"
                value={dnSearch}
                onChange={(e) => { setDnSearch(e.target.value); setDnPage(1); }}
                className="pl-9 focus-visible:ring-blue-500"
              />
            </div>
            <Select value={dnStatus} onValueChange={(v) => { setDnStatus(v); setDnPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(dnStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild size="sm" className="ml-auto bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/sales/delivery-note/new"><Plus className="h-4 w-4 mr-1.5" />New Delivery Note</Link>
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">DN #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Delivery Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Driver</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dnLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : deliveryNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                          <Truck className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No delivery notes</p>
                        <p className="text-sm text-slate-500 mt-1">Create delivery notes to track goods dispatched to customers</p>
                        <Button asChild className="mt-4 bg-linear-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700">
                          <Link href="/sales/delivery-note/new"><Plus className="h-4 w-4 mr-1.5" />New Delivery Note</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryNotes.map((dn) => {
                    const cfg = dnStatusConfig[dn.status] ?? dnStatusConfig.pending;
                    return (
                      <TableRow key={dn.id} className="hover:bg-blue-50/20 transition-colors border-b border-slate-100">
                        <TableCell>
                          <Link href={`/sales/delivery-note/${dn.id}`} className="font-medium text-blue-600 hover:underline">{dn.delivery_note_number}</Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/sales/${dn.invoice_id}`} className="text-emerald-600 hover:underline text-sm">{dn.invoice_number}</Link>
                        </TableCell>
                        <TableCell className="text-slate-700">{dn.customer_name}</TableCell>
                        <TableCell className="text-slate-500">{dateStr(dn.delivery_date)}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{dn.driver_name ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/sales/delivery-note/${dn.id}`}>View DN</Link></DropdownMenuItem>
                              {dn.status === "pending" && (
                                <DropdownMenuItem onClick={() => markDnStatus(dn.id, "dispatched")}>Mark Dispatched</DropdownMenuItem>
                              )}
                              {dn.status === "dispatched" && (
                                <DropdownMenuItem onClick={() => markDnStatus(dn.id, "delivered")} className="text-emerald-600">Mark Delivered</DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild><Link href={`/sales/${dn.invoice_id}`}>View Invoice</Link></DropdownMenuItem>
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

          {dnCount > dnLimit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Showing {dnFrom}–{dnTo} of {dnCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={dnPage === 1} onClick={() => setDnPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={dnTo >= dnCount} onClick={() => setDnPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════ CREDIT NOTES TAB ══════════ */}
        <TabsContent value="credit_notes" className="mt-4 space-y-4">
          {/* Search / Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search credit note…"
                value={cnSearch}
                onChange={(e) => { setCnSearch(e.target.value); setCnPage(1); }}
                className="pl-9 focus-visible:ring-amber-500"
              />
            </div>
            <Select value={cnStatus} onValueChange={(v) => { setCnStatus(v); setCnPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(cnStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild size="sm" className="ml-auto bg-amber-600 hover:bg-amber-700 text-white">
              <Link href="/sales/credit-note/new"><Plus className="h-4 w-4 mr-1.5" />New Credit Note</Link>
            </Button>
          </div>

          {/* Credit Notes Table */}
          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">CN #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Reason</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cnLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : creditNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                          <ReceiptText className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No credit notes</p>
                        <p className="text-sm text-slate-500 mt-1">Issue a credit note against an invoice for returns or adjustments</p>
                        <Button asChild className="mt-4 bg-linear-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
                          <Link href="/sales/credit-note/new"><Plus className="h-4 w-4 mr-1.5" />New Credit Note</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  creditNotes.map((cn) => {
                    const cfg = cnStatusConfig[cn.status] ?? cnStatusConfig.draft;
                    return (
                      <TableRow key={cn.id} className="hover:bg-amber-50/20 transition-colors border-b border-slate-100">
                        <TableCell className="font-medium text-amber-700">{cn.credit_note_number}</TableCell>
                        <TableCell>
                          <Link href={`/sales/${cn.invoice_id}`} className="text-emerald-600 hover:underline text-sm">{cn.invoice_number}</Link>
                        </TableCell>
                        <TableCell className="text-slate-700">{cn.customer_name}</TableCell>
                        <TableCell className="text-slate-500">{dateStr(cn.issue_date)}</TableCell>
                        <TableCell className="text-slate-600 text-sm max-w-50 truncate">{cn.reason}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-700">KES {KES(cn.total_amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {cn.status === "draft" && (
                                <DropdownMenuItem onClick={() => markCnStatus(cn.id, "approved")}>Approve</DropdownMenuItem>
                              )}
                              {(cn.status === "draft" || cn.status === "approved") && (
                                <DropdownMenuItem onClick={() => markCnStatus(cn.id, "applied")} className="text-emerald-600">
                                  Apply to Invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={`/sales/${cn.invoice_id}`}>View Invoice</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {cn.status === "draft" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Delete</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Credit Note?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete {cn.credit_note_number}. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteCreditNote(cn.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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

          {cnCount > cnLimit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Showing {cnFrom}–{cnTo} of {cnCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={cnPage === 1} onClick={() => setCnPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={cnTo >= cnCount} onClick={() => setCnPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Record Payment Dialog ────────────────────────────── */}
      <AlertDialog open={!!paymentTarget} onOpenChange={(open) => { if (!open) { setPaymentTarget(null); setPaymentAmount(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Record Payment
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Recording payment for <span className="font-semibold text-slate-900">{paymentTarget?.invoice_number}</span>{" "}
                  ({paymentTarget?.customer_name})
                </p>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-3 text-xs">
                  <div>
                    <span className="text-slate-500">Invoice Total</span>
                    <p className="font-semibold text-slate-900">KES {KES(paymentTarget?.total_amount ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Already Paid</span>
                    <p className="font-semibold text-slate-900">KES {KES(paymentTarget?.amount_paid ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Balance</span>
                    <p className="font-semibold text-red-600">KES {KES((paymentTarget?.total_amount ?? 0) - (paymentTarget?.amount_paid ?? 0))}</p>
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
                    className="focus-visible:ring-emerald-500"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRecordingPayment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); recordPayment(); }}
              disabled={isRecordingPayment}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isRecordingPayment ? "Recording…" : "Record Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
