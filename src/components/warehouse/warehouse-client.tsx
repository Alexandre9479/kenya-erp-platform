"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Package, AlertTriangle, Warehouse, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type StockRow = {
  id: string;
  product_id: string;
  warehouse_id: string;
  product_name: string;
  sku: string;
  unit: string;
  reorder_level: number;
  warehouse_name: string;
  quantity: number;
  updated_at: string;
};

type Warehouse = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string };

const adjustSchema = z.object({
  product_id: z.string().min(1, "Product required"),
  warehouse_id: z.string().min(1, "Warehouse required"),
  type: z.enum(["opening", "adjustment", "purchase", "sale", "transfer_in", "transfer_out", "write_off", "return"]),
  quantity: z.number().refine((n) => n !== 0, "Cannot be zero"),
  unit_cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type AdjustForm = z.infer<typeof adjustSchema>;

interface Props {
  initialStock: StockRow[];
  totalCount: number;
  initialWarehouses: Warehouse[];
}

export function WarehouseClient({ initialStock, totalCount, initialWarehouses }: Props) {
  const [stock, setStock] = useState(initialStock);
  const [count, setCount] = useState(totalCount);
  const [warehouses] = useState(initialWarehouses);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = useRef(true);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { type: "adjustment", quantity: 0 },
  });

  useEffect(() => {
    fetch("/api/products?limit=200")
      .then((r) => r.json())
      .then((j) => setProducts(j.data ?? []));
  }, []);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchStock, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    if (isFirst.current) return;
    fetchStock();
  }, [warehouseFilter, page]);

  async function fetchStock() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: "25" });
      if (warehouseFilter !== "all") params.set("warehouse_id", warehouseFilter);
      const res = await fetch(`/api/stock?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setStock(json.data);
      setCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function onAdjust(data: AdjustForm) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Stock adjusted successfully");
      reset();
      setAdjustOpen(false);
      fetchStock();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSaving(false);
    }
  }

  const limit = 25;
  const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

  // Derived KPI values
  const lowStockCount = stock.filter((s) => s.quantity <= s.reorder_level && s.reorder_level > 0 && s.quantity > 0).length;
  const outOfStockCount = stock.filter((s) => s.quantity <= 0).length;

  return (
    <div className="space-y-6">
      {/* ── Module Hero Strip ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-violet-100">
        <div className="relative h-24 bg-linear-to-r from-violet-500 to-purple-600 px-6 flex items-center justify-between overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Warehouse</h1>
              <p className="text-sm text-white/70">Track stock levels across all warehouses</p>
            </div>
          </div>
          <Button
            onClick={() => setAdjustOpen(true)}
            className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shadow-sm shrink-0"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Stock Adjustment
          </Button>
        </div>
        <div className="bg-white px-6 py-3 flex flex-wrap gap-4 border-t border-violet-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-sm text-slate-600 font-medium">{count} SKUs Tracked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm text-slate-600 font-medium">{lowStockCount} Low Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm text-slate-600 font-medium">{outOfStockCount} Out of Stock</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-violet-500 to-purple-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 font-medium">Total SKUs</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-violet-500 to-purple-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{lowStockCount}</p>
              <p className="text-xs text-slate-500 font-medium">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-violet-500 to-purple-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{outOfStockCount}</p>
              <p className="text-xs text-slate-500 font-medium">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search / Filter Bar ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search product or SKU…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 focus-visible:ring-violet-500"
          />
        </div>
        <Select value={warehouseFilter} onValueChange={(v) => { setWarehouseFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All warehouses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-y border-slate-200">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <p className="font-bold text-slate-800 text-base">No stock records found</p>
                    <p className="text-sm text-slate-500 mt-1">Add opening stock to begin tracking inventory</p>
                    <Button
                      onClick={() => setAdjustOpen(true)}
                      className="mt-4 bg-linear-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                    >
                      <Package className="h-4 w-4 mr-1.5" />
                      Add Opening Stock
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              stock.map((row) => {
                const isLow = row.quantity <= row.reorder_level && row.reorder_level > 0;
                const isOut = row.quantity <= 0;
                return (
                  <TableRow key={row.id} className="hover:bg-violet-50/20 transition-colors border-b border-slate-100">
                    <TableCell className="font-medium text-slate-900">{row.product_name}</TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono">{row.sku}</TableCell>
                    <TableCell className="text-slate-500">{row.warehouse_name}</TableCell>
                    <TableCell className={`text-right font-semibold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-900"}`}>
                      {row.quantity}
                    </TableCell>
                    <TableCell className="text-slate-500">{row.unit}</TableCell>
                    <TableCell>
                      {isOut ? (
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700">Out of Stock</span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                          <AlertTriangle className="h-3 w-3" />Low Stock
                        </span>
                      ) : (
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">In Stock</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">{dateStr(row.updated_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {count > limit && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, count)} of {count}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * limit >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Adjustment Sheet */}
      <Sheet open={adjustOpen} onOpenChange={(o) => { if (!o) { setAdjustOpen(false); reset(); } }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-violet-500 to-purple-600 shrink-0" />
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100">
                <Package className="size-4 text-violet-600" />
              </div>
              <SheetTitle className="text-slate-900 text-lg font-semibold">Stock Adjustment</SheetTitle>
            </div>
            <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
              Record a stock movement or manual adjustment.
            </SheetDescription>
          </SheetHeader>
          <Separator className="shrink-0" />
          <form onSubmit={handleSubmit(onAdjust)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Product <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="product_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.product_id ? "border-red-400" : ""}>
                        <SelectValue placeholder="Select product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.product_id && <p className="text-xs text-red-500">{errors.product_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Warehouse <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.warehouse_id ? "border-red-400" : ""}>
                        <SelectValue placeholder="Select warehouse…" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.warehouse_id && <p className="text-xs text-red-500">{errors.warehouse_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Movement Type <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening">Opening Stock</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                        <SelectItem value="write_off">Write Off</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity <span className="text-red-500">*</span> <span className="text-xs text-slate-400">(negative to reduce)</span></Label>
                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field }) => (
                      <Input
                        type="number" step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className={errors.quantity ? "border-red-400" : ""}
                      />
                    )}
                  />
                  {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Cost (KES)</Label>
                  <Controller
                    control={control}
                    name="unit_cost"
                    render={({ field }) => (
                      <Input type="number" step="0.01" min="0" value={field.value ?? ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)} />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea {...register("notes")} rows={3} placeholder="Reason for adjustment…" className="resize-none" />
              </div>
            </div>
            <Separator className="shrink-0" />
            <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setAdjustOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white min-w-32">
                {isSaving ? "Saving…" : "Save Adjustment"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
