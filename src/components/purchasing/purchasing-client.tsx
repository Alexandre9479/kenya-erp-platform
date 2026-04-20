"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Users,
  ShoppingCart,
  Building2,
  Sparkles,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SupplierForm } from "./supplier-form";
import {
  PremiumHero,
  HeroStatGrid,
  HeroStat,
  EmptyState,
} from "@/components/ui/premium-hero";

type PORow = {
  id: string;
  lpo_number: string;
  supplier_name: string;
  issue_date: string;
  expected_date: string | null;
  status: string;
  total_amount: number;
};

type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  kra_pin: string | null;
  current_balance: number;
  payment_terms: number;
  notes: string | null;
  address: string | null;
};

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-600 border-slate-200",     dot: "bg-slate-400" },
  approved:  { label: "Approved",  className: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500" },
  partial:   { label: "Partial",   className: "bg-amber-100 text-amber-700 border-amber-200",    dot: "bg-amber-500" },
  received:  { label: "Received",  className: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700 border-rose-200",       dot: "bg-rose-500" },
};

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

interface Props {
  initialPOs: PORow[];
  poCount: number;
  initialSuppliers: SupplierRow[];
  supplierCount: number;
}

export function PurchasingClient({ initialPOs, poCount, initialSuppliers, supplierCount }: Props) {
  const [pos, setPOs] = useState(initialPOs);
  const [poTotal, setPOTotal] = useState(poCount);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierTotal, setSupplierTotal] = useState(supplierCount);

  const [poSearch, setPOSearch] = useState("");
  const [poStatus, setPOStatus] = useState("all");
  const [poPage, setPOPage] = useState(1);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);

  const [isLoadingPO, setIsLoadingPO] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);

  const poTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (poTimer.current) clearTimeout(poTimer.current);
    poTimer.current = setTimeout(fetchPOs, 400);
    return () => { if (poTimer.current) clearTimeout(poTimer.current); };
  }, [poSearch]);

  useEffect(() => {
    if (isFirst.current) return;
    fetchPOs();
  }, [poStatus, poPage]);

  useEffect(() => {
    if (isFirst.current) return;
    if (suppTimer.current) clearTimeout(suppTimer.current);
    suppTimer.current = setTimeout(fetchSuppliers, 400);
    return () => { if (suppTimer.current) clearTimeout(suppTimer.current); };
  }, [supplierSearch, supplierPage]);

  async function fetchPOs() {
    setIsLoadingPO(true);
    try {
      const params = new URLSearchParams({ search: poSearch, page: String(poPage), limit: "25" });
      if (poStatus !== "all") params.set("status", poStatus);
      const res = await fetch(`/api/purchase-orders?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setPOs(json.data);
      setPOTotal(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load LPOs");
    } finally {
      setIsLoadingPO(false);
    }
  }

  async function fetchSuppliers() {
    setIsLoadingSuppliers(true);
    try {
      const params = new URLSearchParams({ search: supplierSearch, page: String(supplierPage), limit: "25" });
      const res = await fetch(`/api/suppliers?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSuppliers(json.data);
      setSupplierTotal(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setIsLoadingSuppliers(false);
    }
  }

  async function deleteSupplier(id: string) {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Supplier removed");
      fetchSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function updatePOStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("LPO updated");
      fetchPOs();
    } catch {
      toast.error("Failed to update LPO");
    }
  }

  const limit = 25;

  const pendingCount = pos.filter((p) => p.status === "draft" || p.status === "approved" || p.status === "sent").length;
  const receivedCount = pos.filter((p) => p.status === "received").length;
  const supplierDebtTotal = suppliers.reduce((s, sp) => s + (sp.current_balance ?? 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PremiumHero
        gradient="orange"
        icon={ShoppingCart}
        eyebrow={
          <>
            <Sparkles className="size-3 sm:size-3.5" />
            Procurement
          </>
        }
        title="Purchasing"
        description="Manage local purchase orders, supplier relationships and incoming deliveries."
        actions={
          <Button
            asChild
            size="sm"
            className="bg-white text-orange-700 hover:bg-white/90 font-semibold shadow-md gap-1.5"
          >
            <Link href="/purchasing/new">
              <Plus className="size-3.5" />
              New LPO
            </Link>
          </Button>
        }
      >
        <HeroStatGrid>
          <HeroStat icon={FileText} label="Total LPOs" value={String(poTotal)} sub={`${pos.length} in view`} />
          <HeroStat icon={Clock} label="In progress" value={String(pendingCount)} sub="draft + sent" accent="warning" />
          <HeroStat icon={CheckCircle2} label="Received" value={String(receivedCount)} sub="fully delivered" accent="success" />
          <HeroStat
            icon={Building2}
            label="Suppliers"
            value={String(supplierTotal)}
            sub={supplierDebtTotal > 0 ? `KES ${(supplierDebtTotal / 1000).toFixed(0)}K owed` : "No AP"}
            accent={supplierDebtTotal > 0 ? "danger" : "default"}
          />
        </HeroStatGrid>
      </PremiumHero>

      <Tabs defaultValue="lpos">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="lpos"><FileText className="mr-1.5 h-3.5 w-3.5" />LPOs ({poTotal})</TabsTrigger>
            <TabsTrigger value="suppliers"><Users className="mr-1.5 h-3.5 w-3.5" />Suppliers ({supplierTotal})</TabsTrigger>
          </TabsList>
        </div>

        {/* LPOs Tab */}
        <TabsContent value="lpos" className="space-y-4 mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search LPO number…"
                value={poSearch}
                onChange={(e) => { setPOSearch(e.target.value); setPOPage(1); }}
                className="pl-9 focus-visible:ring-amber-500"
              />
            </div>
            <Select value={poStatus} onValueChange={(v) => { setPOStatus(v); setPOPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {isLoadingPO ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))
            ) : pos.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={FileText}
                  title="No LPOs found"
                  description="Create your first local purchase order"
                  action={
                    <Button
                      asChild
                      size="sm"
                      className="bg-linear-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5"
                    >
                      <Link href="/purchasing/new">
                        <Plus className="size-3.5" /> New LPO
                      </Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              pos.map((po) => {
                const cfg = statusConfig[po.status] ?? statusConfig.draft;
                return (
                  <div
                    key={po.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500" />
                    <div className="p-3 pt-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/purchasing/${po.id}`}
                            className="font-semibold text-[15px] text-amber-700 hover:underline tabular-nums"
                          >
                            {po.lpo_number}
                          </Link>
                          <p className="text-xs text-slate-600 truncate mt-0.5">{po.supplier_name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/purchasing/${po.id}`}>View / Print</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {po.status === "draft" && (
                              <DropdownMenuItem onClick={() => updatePOStatus(po.id, "approved")}>Approve</DropdownMenuItem>
                            )}
                            {po.status === "approved" && (
                              <DropdownMenuItem onClick={() => updatePOStatus(po.id, "sent")}>Mark as Sent</DropdownMenuItem>
                            )}
                            {po.status === "sent" && (
                              <DropdownMenuItem onClick={() => updatePOStatus(po.id, "partial")}>Partial Delivery</DropdownMenuItem>
                            )}
                            {(po.status === "sent" || po.status === "partial") && (
                              <DropdownMenuItem onClick={() => updatePOStatus(po.id, "received")}>Goods Received</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {(po.status === "draft" || po.status === "approved") && (
                              <DropdownMenuItem className="text-red-600" onClick={() => updatePOStatus(po.id, "cancelled")}>Cancel</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}
                        >
                          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          KES {KES(po.total_amount)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1 min-w-0">
                          <CalendarDays className="size-3 shrink-0" />
                          <span className="truncate">Issued {dateStr(po.issue_date)}</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0 justify-end">
                          <Clock className="size-3 shrink-0" />
                          <span className="truncate">{po.expected_date ? dateStr(po.expected_date) : "No ETA"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">LPO #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Issue Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Expected</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPO ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : pos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={FileText}
                        title="No LPOs found"
                        description="Create your first local purchase order"
                        action={
                          <Button
                            asChild
                            size="sm"
                            className="bg-linear-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5"
                          >
                            <Link href="/purchasing/new">
                              <Plus className="size-3.5" /> New LPO
                            </Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pos.map((po) => {
                    const cfg = statusConfig[po.status] ?? statusConfig.draft;
                    return (
                      <TableRow key={po.id} className="hover:bg-amber-50/20 transition-colors border-b border-slate-100">
                        <TableCell><Link href={`/purchasing/${po.id}`} className="font-medium text-amber-600 hover:text-amber-700 hover:underline">{po.lpo_number}</Link></TableCell>
                        <TableCell className="text-slate-700">{po.supplier_name}</TableCell>
                        <TableCell className="text-slate-500">{dateStr(po.issue_date)}</TableCell>
                        <TableCell className="text-slate-500">{po.expected_date ? dateStr(po.expected_date) : "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-800">KES {KES(po.total_amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/purchasing/${po.id}`}>View / Print</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {po.status === "draft" && (
                                <DropdownMenuItem onClick={() => updatePOStatus(po.id, "approved")}>Approve</DropdownMenuItem>
                              )}
                              {po.status === "approved" && (
                                <DropdownMenuItem onClick={() => updatePOStatus(po.id, "sent")}>Mark as Sent</DropdownMenuItem>
                              )}
                              {po.status === "sent" && (
                                <DropdownMenuItem onClick={() => updatePOStatus(po.id, "partial")}>Partial Delivery</DropdownMenuItem>
                              )}
                              {(po.status === "sent" || po.status === "partial") && (
                                <DropdownMenuItem onClick={() => updatePOStatus(po.id, "received")}>Goods Received</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {(po.status === "draft" || po.status === "approved") && (
                                <DropdownMenuItem className="text-red-600" onClick={() => updatePOStatus(po.id, "cancelled")}>Cancel</DropdownMenuItem>
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

          {poTotal > limit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Showing {(poPage - 1) * limit + 1}–{Math.min(poPage * limit, poTotal)} of {poTotal}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={poPage === 1} onClick={() => setPOPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={poPage * limit >= poTotal} onClick={() => setPOPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search suppliers…"
                value={supplierSearch}
                onChange={(e) => { setSupplierSearch(e.target.value); setSupplierPage(1); }}
                className="pl-9 focus-visible:ring-amber-500"
              />
            </div>
            <Button
              onClick={() => { setEditingSupplier(null); setSupplierFormOpen(true); }}
              className="bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />New Supplier
            </Button>
          </div>

          {/* Mobile supplier cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {isLoadingSuppliers ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))
            ) : suppliers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={Users}
                  title="No suppliers found"
                  description="Add your first supplier to start purchasing"
                  action={
                    <Button
                      onClick={() => setSupplierFormOpen(true)}
                      size="sm"
                      className="bg-linear-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5"
                    >
                      <Plus className="size-3.5" /> Add supplier
                    </Button>
                  }
                />
              </div>
            ) : (
              suppliers.map((s) => {
                const initial = (s.name?.trim() ?? "?").charAt(0).toUpperCase();
                const isOwing = s.current_balance > 0;
                return (
                  <div
                    key={s.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500" />
                    <div className="p-3 pt-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 text-white font-bold text-sm shrink-0 shadow-sm">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {s.kra_pin ?? "No PIN"} · {s.payment_terms}d terms
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingSupplier(s); setSupplierFormOpen(true); }}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Remove</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Supplier?</AlertDialogTitle>
                                  <AlertDialogDescription>This will deactivate {s.name}. Cannot be undone if they have orders.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSupplier(s.id)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-600 min-w-0">
                          {s.email ? <Mail className="size-3 shrink-0" /> : <Phone className="size-3 shrink-0" />}
                          <span className="truncate">{s.email ?? s.phone ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-600 min-w-0 justify-end">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{s.city ?? "—"}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">Balance</span>
                        <span className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${isOwing ? "text-rose-600" : "text-slate-700"}`}>
                          {isOwing && <AlertTriangle className="size-3" />}
                          KES {KES(s.current_balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop supplier table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">City</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">KRA PIN</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Terms</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Balance</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSuppliers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={Users}
                        title="No suppliers found"
                        description="Add your first supplier to start purchasing"
                        action={
                          <Button
                            onClick={() => setSupplierFormOpen(true)}
                            size="sm"
                            className="bg-linear-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5"
                          >
                            <Plus className="size-3.5" /> Add supplier
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => {
                    const initial = (s.name?.trim() ?? "?").charAt(0).toUpperCase();
                    const isOwing = s.current_balance > 0;
                    return (
                    <TableRow key={s.id} className="hover:bg-amber-50/20 transition-colors border-b border-slate-100">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 text-white font-bold text-xs shrink-0 shadow-sm">
                            {initial}
                          </div>
                          <span className="font-medium text-slate-900">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        <div className="flex flex-col gap-0.5">
                          {s.email && <span className="flex items-center gap-1"><Mail className="size-3" />{s.email}</span>}
                          {s.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{s.phone}</span>}
                          {!s.email && !s.phone && <span>—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{s.city ?? "—"}</TableCell>
                      <TableCell className="text-slate-500 text-xs tabular-nums">{s.kra_pin ?? "—"}</TableCell>
                      <TableCell className="text-slate-500 tabular-nums">{s.payment_terms}d</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${isOwing ? "text-rose-600" : "text-slate-700"}`}>
                          {isOwing && <AlertTriangle className="size-3.5" />}
                          KES {KES(s.current_balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingSupplier(s); setSupplierFormOpen(true); }}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Remove</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Supplier?</AlertDialogTitle>
                                  <AlertDialogDescription>This will deactivate {s.name}. Cannot be undone if they have orders.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSupplier(s.id)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

          {supplierTotal > limit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Showing {(supplierPage - 1) * limit + 1}–{Math.min(supplierPage * limit, supplierTotal)} of {supplierTotal}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={supplierPage === 1} onClick={() => setSupplierPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={supplierPage * limit >= supplierTotal} onClick={() => setSupplierPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SupplierForm
        open={supplierFormOpen}
        onClose={() => { setSupplierFormOpen(false); setEditingSupplier(null); }}
        onSaved={fetchSuppliers}
        supplier={editingSupplier}
      />
    </div>
  );
}
