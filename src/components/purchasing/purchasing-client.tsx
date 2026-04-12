"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Search, FileText, MoreHorizontal, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  approved: { label: "Approved", className: "bg-violet-100 text-violet-700" },
  received: { label: "Received", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-400" },
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
    <div className="space-y-4">
      <Tabs defaultValue="lpos">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="lpos"><FileText className="mr-1.5 h-3.5 w-3.5" />LPOs ({poTotal})</TabsTrigger>
            <TabsTrigger value="suppliers"><Users className="mr-1.5 h-3.5 w-3.5" />Suppliers ({supplierTotal})</TabsTrigger>
          </TabsList>
        </div>

        {/* LPOs Tab */}
        <TabsContent value="lpos" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search LPO number…" value={poSearch} onChange={(e) => { setPOSearch(e.target.value); setPOPage(1); }} className="pl-9" />
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
            <Button asChild>
              <Link href="/purchasing/new"><Plus className="mr-2 h-4 w-4" />New LPO</Link>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LPO #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
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
                      <TableCell colSpan={7} className="py-12 text-center">
                        <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">No LPOs found</p>
                        <Button variant="outline" size="sm" className="mt-3" asChild>
                          <Link href="/purchasing/new">Create your first LPO</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pos.map((po) => {
                      const cfg = statusConfig[po.status] ?? statusConfig.draft;
                      return (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium text-blue-600">{po.lpo_number}</TableCell>
                          <TableCell>{po.supplier_name}</TableCell>
                          <TableCell className="text-slate-500">{dateStr(po.issue_date)}</TableCell>
                          <TableCell className="text-slate-500">{po.expected_date ? dateStr(po.expected_date) : "—"}</TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">KES {KES(po.total_amount)}</TableCell>
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
            </CardContent>
          </Card>

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search suppliers…" value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); setSupplierPage(1); }} className="pl-9" />
            </div>
            <Button onClick={() => { setEditingSupplier(null); setSupplierFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />New Supplier
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>KRA PIN</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
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
                      <TableCell colSpan={7} className="py-12 text-center">
                        <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">No suppliers found</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setSupplierFormOpen(true)}>Add your first supplier</Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
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
            </CardContent>
          </Card>

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
