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
  AlertCircle,
  Banknote,
  ArrowRightLeft,
  ClipboardList,
  ReceiptText,
  Truck,
  Sparkles,
  CalendarDays,
  Wallet,
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
import { PremiumHero, HeroStatGrid, HeroStat, EmptyState } from "@/components/ui/premium-hero";

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
const invoiceStatusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  draft:     { label: "Draft",     bg: "border-slate-200 bg-slate-50 text-slate-600",        dot: "bg-slate-400" },
  sent:      { label: "Sent",      bg: "border-blue-200 bg-blue-50 text-blue-700",           dot: "bg-blue-500" },
  partial:   { label: "Partial",   bg: "border-amber-200 bg-amber-50 text-amber-700",        dot: "bg-amber-500" },
  paid:      { label: "Paid",      bg: "border-emerald-200 bg-emerald-50 text-emerald-700",  dot: "bg-emerald-500 animate-pulse" },
  overdue:   { label: "Overdue",   bg: "border-rose-200 bg-rose-50 text-rose-700",           dot: "bg-rose-500 animate-pulse" },
  cancelled: { label: "Cancelled", bg: "border-slate-200 bg-slate-50 text-slate-400",        dot: "bg-slate-300" },
};

const quoteStatusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  draft:     { label: "Draft",     bg: "border-slate-200 bg-slate-50 text-slate-600",        dot: "bg-slate-400" },
  sent:      { label: "Sent",      bg: "border-blue-200 bg-blue-50 text-blue-700",           dot: "bg-blue-500" },
  accepted:  { label: "Accepted",  bg: "border-emerald-200 bg-emerald-50 text-emerald-700",  dot: "bg-emerald-500 animate-pulse" },
  rejected:  { label: "Rejected",  bg: "border-rose-200 bg-rose-50 text-rose-700",           dot: "bg-rose-500" },
  expired:   { label: "Expired",   bg: "border-slate-200 bg-slate-50 text-slate-400",        dot: "bg-slate-300" },
  converted: { label: "Converted", bg: "border-indigo-200 bg-indigo-50 text-indigo-700",     dot: "bg-indigo-500" },
};

const dnStatusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  pending:    { label: "Pending",    bg: "border-amber-200 bg-amber-50 text-amber-700",       dot: "bg-amber-500" },
  dispatched: { label: "Dispatched", bg: "border-blue-200 bg-blue-50 text-blue-700",          dot: "bg-blue-500 animate-pulse" },
  delivered:  { label: "Delivered",  bg: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500 animate-pulse" },
  cancelled:  { label: "Cancelled",  bg: "border-slate-200 bg-slate-50 text-slate-400",       dot: "bg-slate-300" },
};

const cnStatusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  draft:     { label: "Draft",     bg: "border-slate-200 bg-slate-50 text-slate-600",        dot: "bg-slate-400" },
  approved:  { label: "Approved",  bg: "border-blue-200 bg-blue-50 text-blue-700",           dot: "bg-blue-500" },
  applied:   { label: "Applied",   bg: "border-emerald-200 bg-emerald-50 text-emerald-700",  dot: "bg-emerald-500 animate-pulse" },
  cancelled: { label: "Cancelled", bg: "border-slate-200 bg-slate-50 text-slate-400",        dot: "bg-slate-300" },
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

/* ── Props ────────────────────────────────────────────────────── */
interface Props {
  initialInvoices: InvoiceRow[];
  invoiceCount: number;
  initialQuotes: QuoteRow[];
  quoteCount: number;
  initialCreditNotes?: CreditNoteRow[];
  creditNoteCount?: number;
}

export function SalesClient({ initialInvoices, invoiceCount, initialQuotes, quoteCount, initialCreditNotes = [], creditNoteCount = 0 }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "quotes" ? "quotes" : tabParam === "credit_notes" ? "credit_notes" : tabParam === "delivery_notes" ? "delivery_notes" : "invoices";

  // Invoice state
  const [invoices, setInvoices] = useState(initialInvoices);
  const [invCount, setInvCount] = useState(invoiceCount);
  const [invSearch, setInvSearch] = useState("");
  const [invStatus, setInvStatus] = useState("all");
  const [invPage, setInvPage] = useState(1);
  const [invLoading, setInvLoading] = useState(false);
  const invSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invFirstRender = useRef(true);

  // Quote state
  const [quotes, setQuotes] = useState(initialQuotes);
  const [qtCount, setQtCount] = useState(quoteCount);
  const [qtSearch, setQtSearch] = useState("");
  const [qtStatus, setQtStatus] = useState("all");
  const [qtPage, setQtPage] = useState(1);
  const [qtLoading, setQtLoading] = useState(false);
  const qtSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qtFirstRender = useRef(true);

  // Credit Note state
  const [creditNotes, setCreditNotes] = useState(initialCreditNotes);
  const [cnCount, setCnCount] = useState(creditNoteCount);
  const [cnSearch, setCnSearch] = useState("");
  const [cnStatus, setCnStatus] = useState("all");
  const [cnPage, setCnPage] = useState(1);
  const [cnLoading, setCnLoading] = useState(false);
  const cnSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cnFirstRender = useRef(true);
  const cnFetched = useRef(false);

  // Delivery Note state
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteRow[]>([]);
  const [dnCount, setDnCount] = useState(0);
  const [dnSearch, setDnSearch] = useState("");
  const [dnStatus, setDnStatus] = useState("all");
  const [dnPage, setDnPage] = useState(1);
  const [dnLoading, setDnLoading] = useState(false);
  const dnSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dnFirstRender = useRef(true);
  const dnFetched = useRef(false);

  // Payment dialog
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

  /* ── Actions ────────────────────────────── */
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
  const outstandingAmount = invoices.reduce((s, i) => s + Math.max(0, i.total_amount - i.amount_paid), 0);

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
    <div className="space-y-5 sm:space-y-6">
      {/* ── Premium Hero ─────────────────────────────────────────── */}
      <PremiumHero
        gradient="emerald"
        icon={FileText}
        eyebrow={<><Sparkles className="size-3" /> Revenue Pipeline</>}
        title="Sales & Invoices"
        description="Quotations, invoices, payments and customer statements — fully integrated."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="bg-white/15 border-white/30 text-white hover:bg-white/25 font-semibold backdrop-blur-sm">
              <Link href="/sales/quotes/new">
                <ClipboardList className="size-4 mr-1.5" />
                New Quote
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-md">
              <Link href="/sales/new">
                <Plus className="size-4 mr-1.5" />
                New Invoice
              </Link>
            </Button>
          </>
        }
      >
        <HeroStatGrid>
          <HeroStat icon={FileText}      label="Invoices"     value={invCount.toLocaleString()} />
          <HeroStat icon={TrendingUp}    label="Paid"         value={paidCount}                           accent="success" />
          <HeroStat icon={AlertCircle}   label="Overdue"      value={overdueCount}                        accent="danger" />
          <HeroStat icon={ClipboardList} label="Quotations"   value={qtCount.toLocaleString()}            accent="info" />
        </HeroStatGrid>
      </PremiumHero>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto w-max min-w-full">
            <TabsTrigger value="invoices" className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              <FileText className="size-3.5" />Invoices
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">{invCount}</span>
            </TabsTrigger>
            <TabsTrigger value="quotes" className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              <ClipboardList className="size-3.5" />Quotations
            </TabsTrigger>
            <TabsTrigger
              value="delivery_notes"
              className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm"
              onClick={() => { if (!dnFetched.current) { dnFetched.current = true; fetchDeliveryNotes(); } }}
            >
              <Truck className="size-3.5" /><span className="hidden sm:inline">Delivery</span> DN
            </TabsTrigger>
            <TabsTrigger
              value="credit_notes"
              className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm"
              onClick={() => { if (!cnFetched.current) { cnFetched.current = true; fetchCreditNotes(); } }}
            >
              <ReceiptText className="size-3.5" /><span className="hidden sm:inline">Credit</span> CN
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ══════════ INVOICES TAB ══════════ */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* Search / Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search invoice or customer…"
                value={invSearch}
                onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
                className="pl-9 focus-visible:ring-emerald-500"
              />
            </div>
            <Select value={invStatus} onValueChange={(v) => { setInvStatus(v); setInvPage(1); }}>
              <SelectTrigger className="sm:w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(invoiceStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <Wallet className="size-3" />
                KES {KES(outstandingAmount)} outstanding
              </span>
            </div>
          </div>

          {/* Mobile: Invoice cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {invLoading ? (
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
                const cfg = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.draft;
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
                      <div><p className="text-slate-400 uppercase tracking-wide">Total</p><p className="font-semibold text-slate-800 tabular-nums">KES {KES(inv.total_amount)}</p></div>
                      <div><p className="text-slate-400 uppercase tracking-wide">Paid</p><p className="font-semibold text-slate-600 tabular-nums">KES {KES(inv.amount_paid)}</p></div>
                      <div><p className="text-slate-400 uppercase tracking-wide">Balance</p><p className={`font-bold tabular-nums ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>KES {KES(balance)}</p></div>
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
                          {inv.status === "draft" && <DropdownMenuItem onClick={() => markInvoiceStatus(inv.id, "sent")}>Mark as Sent</DropdownMenuItem>}
                          {(inv.status === "sent" || inv.status === "partial" || inv.status === "overdue") && (
                            <DropdownMenuItem onClick={() => openPaymentDialog(inv)}><Banknote className="size-4 mr-1.5" />Record Payment</DropdownMenuItem>
                          )}
                          {(inv.status === "sent" || inv.status === "partial") && <DropdownMenuItem onClick={() => markInvoiceStatus(inv.id, "paid")}>Mark as Fully Paid</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: Invoice Table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
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
                    <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
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
                    const cfg = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.draft;
                    const balance = inv.total_amount - inv.amount_paid;
                    const isOverdue = inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_date) < new Date());
                    return (
                      <TableRow key={inv.id} className="hover:bg-emerald-50/40 transition-colors border-b border-slate-100">
                        <TableCell>
                          <Link href={`/sales/${inv.id}`} className="font-mono text-sm font-semibold text-emerald-700 hover:underline">{inv.invoice_number}</Link>
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
                        <TableCell className={`text-right font-semibold tabular-nums ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>KES {KES(balance)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/sales/${inv.id}`}>View Invoice</Link></DropdownMenuItem>
                              <DropdownMenuItem asChild><Link href={`/sales/statement/${inv.customer_id}`}>Customer Statement</Link></DropdownMenuItem>
                              {inv.status === "draft" && (
                                <DropdownMenuItem onClick={() => markInvoiceStatus(inv.id, "sent")}>Mark as Sent</DropdownMenuItem>
                              )}
                              {(inv.status === "sent" || inv.status === "partial" || inv.status === "overdue") && (
                                <DropdownMenuItem onClick={() => openPaymentDialog(inv)}>
                                  <Banknote className="size-4 mr-1.5" />Record Payment
                                </DropdownMenuItem>
                              )}
                              {(inv.status === "sent" || inv.status === "partial") && (
                                <DropdownMenuItem onClick={() => markInvoiceStatus(inv.id, "paid")}>Mark as Fully Paid</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {inv.status === "draft" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600">Delete</DropdownMenuItem>
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
                                      <AlertDialogAction onClick={() => deleteInvoice(inv.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
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
              <span className="tabular-nums">Showing {invFrom}–{invTo} of {invCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={invPage === 1} onClick={() => setInvPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={invTo >= invCount} onClick={() => setInvPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════ QUOTES TAB ══════════ */}
        <TabsContent value="quotes" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search quote or customer…"
                value={qtSearch}
                onChange={(e) => { setQtSearch(e.target.value); setQtPage(1); }}
                className="pl-9 focus-visible:ring-emerald-500"
              />
            </div>
            <Select value={qtStatus} onValueChange={(v) => { setQtStatus(v); setQtPage(1); }}>
              <SelectTrigger className="sm:w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(quoteStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild size="sm" className="sm:ml-auto bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md">
              <Link href="/sales/quotes/new"><Plus className="size-4 mr-1.5" />New Quote</Link>
            </Button>
          </div>

          {/* Mobile: Quote cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {qtLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : quotes.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No quotations found"
                description="Create a quotation and convert it to an invoice when accepted."
                action={
                  <Button asChild className="bg-linear-to-r from-emerald-600 to-teal-600 text-white">
                    <Link href="/sales/quotes/new"><Plus className="size-4 mr-1.5" /> New Quote</Link>
                  </Button>
                }
              />
            ) : (
              quotes.map((qt) => {
                const cfg = quoteStatusConfig[qt.status] ?? quoteStatusConfig.draft;
                const isExpired = qt.status !== "converted" && qt.status !== "rejected" && new Date(qt.expiry_date) < new Date();
                return (
                  <div key={qt.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className={`absolute left-0 top-0 h-full w-1 ${cfg.dot.split(" ")[0]}`} />
                    <div className="flex items-start gap-2.5 pl-1.5">
                      <div className={`size-9 rounded-lg bg-linear-to-br ${customerGradient(qt.customer_name)} flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm`}>
                        {qt.customer_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/sales/quotes/${qt.id}`} className="font-mono text-sm font-semibold text-emerald-700 hover:underline truncate">
                            {qt.quote_number}
                          </Link>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${cfg.bg}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">{qt.customer_name}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Amount</p>
                        <p className="font-semibold text-slate-800 tabular-nums">KES {KES(qt.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Valid Until</p>
                        <p className={`font-semibold ${isExpired ? "text-rose-600" : "text-slate-700"}`}>{dateStr(qt.expiry_date)}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/sales/quotes/${qt.id}`}>View Quote</Link></DropdownMenuItem>
                          {qt.status === "draft" && <DropdownMenuItem onClick={() => markQuoteStatus(qt.id, "sent")}>Mark as Sent</DropdownMenuItem>}
                          {(qt.status === "sent" || qt.status === "draft") && <DropdownMenuItem onClick={() => markQuoteStatus(qt.id, "accepted")}>Mark as Accepted</DropdownMenuItem>}
                          {qt.status !== "converted" && qt.status !== "rejected" && qt.status !== "expired" && (
                            <DropdownMenuItem onClick={() => convertQuote(qt.id)} className="text-indigo-600"><ArrowRightLeft className="size-4 mr-1.5" />Convert to Invoice</DropdownMenuItem>
                          )}
                          {qt.status === "converted" && qt.converted_invoice_id && (
                            <DropdownMenuItem asChild><Link href={`/sales/${qt.converted_invoice_id}`}>View Invoice</Link></DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: Quotes Table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
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
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={ClipboardList}
                        title="No quotations found"
                        description="Create a quotation and convert it to an invoice when accepted."
                        action={
                          <Button asChild className="bg-linear-to-r from-emerald-600 to-teal-600 text-white">
                            <Link href="/sales/quotes/new"><Plus className="size-4 mr-1.5" /> New Quote</Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((qt) => {
                    const cfg = quoteStatusConfig[qt.status] ?? quoteStatusConfig.draft;
                    const isExpired = qt.status !== "converted" && qt.status !== "rejected" && new Date(qt.expiry_date) < new Date();
                    return (
                      <TableRow key={qt.id} className="hover:bg-emerald-50/40 transition-colors border-b border-slate-100">
                        <TableCell>
                          <Link href={`/sales/quotes/${qt.id}`} className="font-mono text-sm font-semibold text-emerald-700 hover:underline">{qt.quote_number}</Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`size-7 rounded-lg bg-linear-to-br ${customerGradient(qt.customer_name)} flex items-center justify-center shrink-0 text-white font-bold text-[10px] shadow-sm`}>
                              {qt.customer_name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800 truncate">{qt.customer_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">{dateStr(qt.issue_date)}</TableCell>
                        <TableCell className={`text-xs whitespace-nowrap ${isExpired ? "text-rose-600 font-semibold" : "text-slate-500"}`}>{dateStr(qt.expiry_date)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-800 tabular-nums">KES {KES(qt.total_amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="size-4" /></Button>
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
                                    <ArrowRightLeft className="size-4 mr-1.5" />Convert to Invoice
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
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600">Delete</DropdownMenuItem>
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
                                      <AlertDialogAction onClick={() => deleteQuote(qt.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
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
              <span className="tabular-nums">Showing {qtFrom}–{qtTo} of {qtCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={qtPage === 1} onClick={() => setQtPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={qtTo >= qtCount} onClick={() => setQtPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════ DELIVERY NOTES TAB ══════════ */}
        <TabsContent value="delivery_notes" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search DN number…"
                value={dnSearch}
                onChange={(e) => { setDnSearch(e.target.value); setDnPage(1); }}
                className="pl-9 focus-visible:ring-blue-500"
              />
            </div>
            <Select value={dnStatus} onValueChange={(v) => { setDnStatus(v); setDnPage(1); }}>
              <SelectTrigger className="sm:w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(dnStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild size="sm" className="sm:ml-auto bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
              <Link href="/sales/delivery-note/new"><Plus className="size-4 mr-1.5" />New Delivery Note</Link>
            </Button>
          </div>

          {/* Mobile: DN cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {dnLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : deliveryNotes.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No delivery notes"
                description="Create delivery notes to track goods dispatched to customers."
                action={
                  <Button asChild className="bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                    <Link href="/sales/delivery-note/new"><Plus className="size-4 mr-1.5" /> New Delivery Note</Link>
                  </Button>
                }
              />
            ) : (
              deliveryNotes.map((dn) => {
                const cfg = dnStatusConfig[dn.status] ?? dnStatusConfig.pending;
                return (
                  <div key={dn.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className={`absolute left-0 top-0 h-full w-1 ${cfg.dot.split(" ")[0]}`} />
                    <div className="flex items-start gap-2.5 pl-1.5">
                      <div className={`size-9 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm`}>
                        <Truck className="size-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/sales/delivery-note/${dn.id}`} className="font-mono text-sm font-semibold text-blue-700 hover:underline truncate">
                            {dn.delivery_note_number}
                          </Link>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${cfg.bg}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">{dn.customer_name}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Invoice</p>
                        <Link href={`/sales/${dn.invoice_id}`} className="font-mono font-semibold text-emerald-700 hover:underline truncate block">{dn.invoice_number}</Link>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Delivery</p>
                        <p className="font-semibold text-slate-700">{dateStr(dn.delivery_date)}</p>
                      </div>
                    </div>
                    {dn.driver_name && (
                      <p className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        Driver: <span className="font-semibold text-slate-700">{dn.driver_name}</span>
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: DN table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
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
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : deliveryNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={Truck}
                        title="No delivery notes"
                        description="Create delivery notes to track goods dispatched to customers."
                        action={
                          <Button asChild className="bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                            <Link href="/sales/delivery-note/new"><Plus className="size-4 mr-1.5" /> New Delivery Note</Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryNotes.map((dn) => {
                    const cfg = dnStatusConfig[dn.status] ?? dnStatusConfig.pending;
                    return (
                      <TableRow key={dn.id} className="hover:bg-blue-50/40 transition-colors border-b border-slate-100">
                        <TableCell>
                          <Link href={`/sales/delivery-note/${dn.id}`} className="font-mono text-sm font-semibold text-blue-700 hover:underline">{dn.delivery_note_number}</Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/sales/${dn.invoice_id}`} className="font-mono text-xs text-emerald-700 hover:underline">{dn.invoice_number}</Link>
                        </TableCell>
                        <TableCell className="text-slate-700">{dn.customer_name}</TableCell>
                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">{dateStr(dn.delivery_date)}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{dn.driver_name ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/sales/delivery-note/${dn.id}`}>View DN</Link></DropdownMenuItem>
                              {dn.status === "pending" && <DropdownMenuItem onClick={() => markDnStatus(dn.id, "dispatched")}>Mark Dispatched</DropdownMenuItem>}
                              {dn.status === "dispatched" && <DropdownMenuItem onClick={() => markDnStatus(dn.id, "delivered")} className="text-emerald-600">Mark Delivered</DropdownMenuItem>}
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
              <span className="tabular-nums">Showing {dnFrom}–{dnTo} of {dnCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={dnPage === 1} onClick={() => setDnPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={dnTo >= dnCount} onClick={() => setDnPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════ CREDIT NOTES TAB ══════════ */}
        <TabsContent value="credit_notes" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search credit note…"
                value={cnSearch}
                onChange={(e) => { setCnSearch(e.target.value); setCnPage(1); }}
                className="pl-9 focus-visible:ring-amber-500"
              />
            </div>
            <Select value={cnStatus} onValueChange={(v) => { setCnStatus(v); setCnPage(1); }}>
              <SelectTrigger className="sm:w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(cnStatusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild size="sm" className="sm:ml-auto bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md">
              <Link href="/sales/credit-note/new"><Plus className="size-4 mr-1.5" />New Credit Note</Link>
            </Button>
          </div>

          {/* Mobile: CN cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {cnLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : creditNotes.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="No credit notes"
                description="Issue a credit note against an invoice for returns or adjustments."
                action={
                  <Button asChild className="bg-linear-to-r from-amber-600 to-orange-600 text-white">
                    <Link href="/sales/credit-note/new"><Plus className="size-4 mr-1.5" /> New Credit Note</Link>
                  </Button>
                }
              />
            ) : (
              creditNotes.map((cn) => {
                const cfg = cnStatusConfig[cn.status] ?? cnStatusConfig.draft;
                return (
                  <div key={cn.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className={`absolute left-0 top-0 h-full w-1 ${cfg.dot.split(" ")[0]}`} />
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-amber-700 truncate">{cn.credit_note_number}</p>
                        <p className="text-[11px] text-slate-600 truncate">{cn.customer_name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${cfg.bg}`}>
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Invoice</p>
                        <Link href={`/sales/${cn.invoice_id}`} className="font-mono font-semibold text-emerald-700 hover:underline truncate block">{cn.invoice_number}</Link>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Amount</p>
                        <p className="font-bold text-amber-700 tabular-nums">KES {KES(cn.total_amount)}</p>
                      </div>
                    </div>
                    <p className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 line-clamp-2">{cn.reason}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: CN table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
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
                    <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : creditNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={ReceiptText}
                        title="No credit notes"
                        description="Issue a credit note against an invoice for returns or adjustments."
                        action={
                          <Button asChild className="bg-linear-to-r from-amber-600 to-orange-600 text-white">
                            <Link href="/sales/credit-note/new"><Plus className="size-4 mr-1.5" /> New Credit Note</Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  creditNotes.map((cn) => {
                    const cfg = cnStatusConfig[cn.status] ?? cnStatusConfig.draft;
                    return (
                      <TableRow key={cn.id} className="hover:bg-amber-50/40 transition-colors border-b border-slate-100">
                        <TableCell className="font-mono text-sm font-semibold text-amber-700">{cn.credit_note_number}</TableCell>
                        <TableCell>
                          <Link href={`/sales/${cn.invoice_id}`} className="font-mono text-xs text-emerald-700 hover:underline">{cn.invoice_number}</Link>
                        </TableCell>
                        <TableCell className="text-slate-700">{cn.customer_name}</TableCell>
                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">{dateStr(cn.issue_date)}</TableCell>
                        <TableCell className="text-slate-600 text-sm max-w-50 truncate">{cn.reason}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-700 tabular-nums">KES {KES(cn.total_amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {cn.status === "draft" && <DropdownMenuItem onClick={() => markCnStatus(cn.id, "approved")}>Approve</DropdownMenuItem>}
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
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600">Delete</DropdownMenuItem>
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
                                      <AlertDialogAction onClick={() => deleteCreditNote(cn.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
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
              <span className="tabular-nums">Showing {cnFrom}–{cnTo} of {cnCount}</span>
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
