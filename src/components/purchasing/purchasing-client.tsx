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
  TrendingDown,
  Building2,
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

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  received: { label: "Received", className: "bg-violet-100 text-violet-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-600" },
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

  return (
    <div className="space-y-6">
      {/* ── Module Hero Strip ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-amber-100">
        <div className="relative h-24 bg-linear-to-r from-amber-500 to-orange-500 px-6 flex items-center justify-between overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Purchasing</h1>
              <p className="text-sm text-white/70">Manage LPOs and supplier relationships</p>
            </div>
          </div>
          <Button
            asChild
            className="bg-white text-amber-700 hover:bg-amber-50 font-semibold shadow-sm shrink-0"
          >
            <Link href="/purchasing/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New LPO
            </Link>
          </Button>
        </div>
        <div className="bg-white px-6 py-3 flex flex-wrap gap-4 border-t border-amber-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm text-slate-600 font-medium">{poTotal} Total LPOs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-sm text-slate-600 font-medium">{supplierTotal} Suppliers</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-amber-500 to-orange-500" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{poTotal}</p>
              <p className="text-xs text-slate-500 font-medium">Total LPOs</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-amber-500 to-orange-500" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{supplierTotal}</p>
              <p className="text-xs text-slate-500 font-medium">Suppliers</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-amber-500 to-orange-500" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {pos.filter((p) => p.status === "approved").length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Approved LPOs</p>
            </div>
          </div>
        </div>
      </div>

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
            <div className="relative flex-1 max-w-xs">
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

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LPO #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</TableHead>
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
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                          <FileText className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No LPOs found</p>
                        <p className="text-sm text-slate-500 mt-1">Create your first local purchase order</p>
                        <Button
                          asChild
                          className="mt-4 bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                        >
                          <Link href="/purchasing/new">
                            <Plus className="h-4 w-4 mr-1.5" />
                            New LPO
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pos.map((po) => {
                    const cfg = statusConfig[po.status] ?? statusConfig.draft;
                    return (
                      <TableRow key={po.id} className="hover:bg-amber-50/20 transition-colors border-b border-slate-100">
                        <TableCell className="font-medium text-amber-600">{po.lpo_number}</TableCell>
                        <TableCell className="text-slate-700">{po.supplier_name}</TableCell>
                        <TableCell className="text-slate-500">{dateStr(po.issue_date)}</TableCell>
                        <TableCell className="text-slate-500">{po.expected_date ? dateStr(po.expected_date) : "—"}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-800">KES {KES(po.total_amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {po.status === "draft" && (
                                <DropdownMenuItem onClick={() => updatePOStatus(po.id, "sent")}>Mark as Sent</DropdownMenuItem>
                              )}
                              {po.status === "sent" && (
                                <DropdownMenuItem onClick={() => updatePOStatus(po.id, "approved")}>Approve</DropdownMenuItem>
                              )}
                              {po.status === "approved" && (
                                <DropdownMenuItem onClick={() => updatePOStatus(po.id, "received")}>Mark Received</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {po.status === "draft" && (
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

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">City</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">KRA PIN</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terms</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Balance</TableHead>
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
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No suppliers found</p>
                        <p className="text-sm text-slate-500 mt-1">Add your first supplier to start purchasing</p>
                        <Button
                          onClick={() => setSupplierFormOpen(true)}
                          className="mt-4 bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Add Supplier
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id} className="hover:bg-amber-50/20 transition-colors border-b border-slate-100">
                      <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{s.email ?? s.phone ?? "—"}</TableCell>
                      <TableCell className="text-slate-500">{s.city ?? "—"}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{s.kra_pin ?? "—"}</TableCell>
                      <TableCell className="text-slate-500">{s.payment_terms}d</TableCell>
                      <TableCell className={`text-right font-medium ${s.current_balance > 0 ? "text-red-600" : "text-slate-700"}`}>
                        KES {KES(s.current_balance)}
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
                  ))
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
