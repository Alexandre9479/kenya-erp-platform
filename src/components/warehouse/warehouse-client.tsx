"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search product or SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={warehouseFilter} onValueChange={(v) => { setWarehouseFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All warehouses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAdjustOpen(true)}>
          <Package className="mr-2 h-4 w-4" />Stock Adjustment
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : stock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">No stock records found</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setAdjustOpen(true)}>Add opening stock</Button>
                  </TableCell>
                </TableRow>
              ) : (
                stock.map((row) => {
                  const isLow = row.quantity <= row.reorder_level && row.reorder_level > 0;
                  const isOut = row.quantity <= 0;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.product_name}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{row.sku}</TableCell>
                      <TableCell className="text-slate-500">{row.warehouse_name}</TableCell>
                      <TableCell className={`text-right font-semibold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-900"}`}>
                        {row.quantity}
                      </TableCell>
                      <TableCell className="text-slate-500">{row.unit}</TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                        ) : isLow ? (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" />Low Stock
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600">In Stock</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">{dateStr(row.updated_at)}</TableCell>
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
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, count)} of {count}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * limit >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Adjustment Sheet */}
      <Sheet open={adjustOpen} onOpenChange={(o) => { if (!o) { setAdjustOpen(false); reset(); } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Stock Adjustment</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onAdjust)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Controller
                control={control}
                name="product_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.product_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select product…" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.product_id && <p className="text-xs text-destructive">{errors.product_id.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Warehouse *</Label>
              <Controller
                control={control}
                name="warehouse_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.warehouse_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select warehouse…" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouse_id && <p className="text-xs text-destructive">{errors.warehouse_id.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Movement Type *</Label>
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
                <Label>Quantity * <span className="text-xs text-slate-500">(negative to reduce)</span></Label>
                <Controller
                  control={control}
                  name="quantity"
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className={errors.quantity ? "border-destructive" : ""}
                    />
                  )}
                />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
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
              <Textarea {...register("notes")} rows={3} placeholder="Reason for adjustment…" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setAdjustOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? "Saving…" : "Save Adjustment"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
