"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Package, AlertTriangle, Warehouse, TrendingDown, ArrowUpDown, ClipboardCheck, Boxes, Sparkles, Building2, CalendarDays } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { PremiumHero, HeroStatGrid, HeroStat, EmptyState } from "@/components/ui/premium-hero";

type Tab = "stock" | "movements" | "grns";

type MovementRow = {
  id: string;
  product_id: string;
  warehouse_id: string;
  product_name: string;
  warehouse_name: string;
  type: string;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
};

type GRNRow = {
  id: string;
  grn_number: string;
  po_id: string;
  supplier_id: string;
  warehouse_id: string;
  supplier_name: string;
  warehouse_name: string;
  lpo_number: string;
  status: string;
  received_by: string | null;
  notes: string | null;
  received_at: string;
  created_at: string;
};

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

const AVATAR_PALETTE = [
  "from-violet-500 to-purple-600",
  "from-indigo-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-emerald-600",
];

function productGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function WarehouseClient({ initialStock, totalCount, initialWarehouses }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("stock");
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

  // Movements state
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [movementsCount, setMovementsCount] = useState(0);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsSearch, setMovementsSearch] = useState("");
  const [movementsType, setMovementsType] = useState("all");
  const [movementsLoading, setMovementsLoading] = useState(false);
  const movementsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GRN state
  const [grns, setGrns] = useState<GRNRow[]>([]);
  const [grnsCount, setGrnsCount] = useState(0);
  const [grnsPage, setGrnsPage] = useState(1);
  const [grnsSearch, setGrnsSearch] = useState("");
  const [grnsLoading, setGrnsLoading] = useState(false);
  const grnsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Movements fetch ──
  async function fetchMovements() {
    setMovementsLoading(true);
    try {
      const params = new URLSearchParams({ search: movementsSearch, page: String(movementsPage), limit: "25" });
      if (movementsType !== "all") params.set("type", movementsType);
      const res = await fetch(`/api/stock/movements?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMovements(json.data);
      setMovementsCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load movements");
    } finally {
      setMovementsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "movements") fetchMovements();
  }, [activeTab, movementsPage, movementsType]);

  useEffect(() => {
    if (activeTab !== "movements") return;
    if (movementsTimer.current) clearTimeout(movementsTimer.current);
    movementsTimer.current = setTimeout(fetchMovements, 400);
    return () => { if (movementsTimer.current) clearTimeout(movementsTimer.current); };
  }, [movementsSearch]);

  // ── GRN fetch ──
  async function fetchGrns() {
    setGrnsLoading(true);
    try {
      const params = new URLSearchParams({ search: grnsSearch, page: String(grnsPage), limit: "25" });
      const res = await fetch(`/api/grn?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setGrns(json.data);
      setGrnsCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load GRNs");
    } finally {
      setGrnsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "grns") fetchGrns();
  }, [activeTab, grnsPage]);

  useEffect(() => {
    if (activeTab !== "grns") return;
    if (grnsTimer.current) clearTimeout(grnsTimer.current);
    grnsTimer.current = setTimeout(fetchGrns, 400);
    return () => { if (grnsTimer.current) clearTimeout(grnsTimer.current); };
  }, [grnsSearch]);

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
  const dateTimeStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const movementTypeLabel: Record<string, { label: string; color: string; dot: string }> = {
    stock_in:     { label: "Stock In",     color: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    stock_out:    { label: "Stock Out",    color: "border-rose-200 bg-rose-50 text-rose-700",           dot: "bg-rose-500" },
    opening:      { label: "Opening",      color: "border-blue-200 bg-blue-50 text-blue-700",           dot: "bg-blue-500" },
    adjustment:   { label: "Adjustment",   color: "border-amber-200 bg-amber-50 text-amber-700",        dot: "bg-amber-500" },
    purchase:     { label: "Purchase",     color: "border-emerald-200 bg-emerald-50 text-emerald-700",  dot: "bg-emerald-500" },
    sale:         { label: "Sale",         color: "border-violet-200 bg-violet-50 text-violet-700",     dot: "bg-violet-500" },
    transfer_in:  { label: "Transfer In",  color: "border-cyan-200 bg-cyan-50 text-cyan-700",           dot: "bg-cyan-500" },
    transfer_out: { label: "Transfer Out", color: "border-orange-200 bg-orange-50 text-orange-700",     dot: "bg-orange-500" },
    write_off:    { label: "Write Off",    color: "border-rose-200 bg-rose-50 text-rose-700",           dot: "bg-rose-500" },
    return:       { label: "Return",       color: "border-teal-200 bg-teal-50 text-teal-700",           dot: "bg-teal-500" },
  };

  const grnStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
    received:   { label: "Received",   color: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500 animate-pulse" },
    partial:    { label: "Partial",    color: "border-amber-200 bg-amber-50 text-amber-700",        dot: "bg-amber-500" },
    inspecting: { label: "Inspecting", color: "border-blue-200 bg-blue-50 text-blue-700",           dot: "bg-blue-500 animate-pulse" },
    rejected:   { label: "Rejected",   color: "border-rose-200 bg-rose-50 text-rose-700",           dot: "bg-rose-500" },
  };

  // Derived KPI values
  const lowStockCount = stock.filter((s) => s.quantity <= s.reorder_level && s.reorder_level > 0 && s.quantity > 0).length;
  const outOfStockCount = stock.filter((s) => s.quantity <= 0).length;
  const healthyCount = Math.max(0, stock.length - lowStockCount - outOfStockCount);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Premium Hero ─────────────────────────────────────────────── */}
      <PremiumHero
        gradient="violet"
        icon={Warehouse}
        eyebrow={<><Sparkles className="size-3" /> Inventory Control</>}
        title="Warehouse"
        description="Track stock levels, movements and goods receipts across every warehouse."
        actions={
          <Button
            onClick={() => setAdjustOpen(true)}
            size="sm"
            className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shadow-md shrink-0"
          >
            <Package className="size-4 mr-1.5" />
            Stock Adjustment
          </Button>
        }
      >
        <HeroStatGrid>
          <HeroStat icon={Boxes}          label="Total SKUs"    value={count.toLocaleString()} />
          <HeroStat icon={AlertTriangle}  label="Low Stock"     value={lowStockCount}     accent="warning" />
          <HeroStat icon={TrendingDown}   label="Out of Stock"  value={outOfStockCount}   accent="danger"  />
          <HeroStat icon={Building2}      label="Warehouses"    value={warehouses.length} accent="info"    />
        </HeroStatGrid>
      </PremiumHero>

      {/* ── Tab Bar ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1 overflow-x-auto shadow-sm">
        {([
          { key: "stock" as Tab,      label: "Stock Levels", icon: Package,         badge: count },
          { key: "movements" as Tab,  label: "Movements",    icon: ArrowUpDown,     badge: movementsCount || null },
          { key: "grns" as Tab,       label: "GRN",          icon: ClipboardCheck,  badge: grnsCount || null },
        ]).map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-linear-to-r from-violet-600 to-purple-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {label}
            {badge != null && (
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                activeTab === key ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ STOCK LEVELS TAB ══════════════ */}
      {activeTab === "stock" && (
        <>
          {/* ── Search / Filter Bar ───────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search product or SKU…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 focus-visible:ring-violet-500"
              />
            </div>
            <Select value={warehouseFilter} onValueChange={(v) => { setWarehouseFilter(v); setPage(1); }}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="All warehouses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> {healthyCount} healthy
              </span>
            </div>
          </div>

          {/* ── Mobile: Stock Cards ───────────────────────────────── */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : stock.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No stock records found"
                description="Add opening stock to begin tracking inventory."
                action={
                  <Button
                    onClick={() => setAdjustOpen(true)}
                    className="bg-linear-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                  >
                    <Package className="size-4 mr-1.5" /> Add Opening Stock
                  </Button>
                }
              />
            ) : (
              stock.map((row) => {
                const isLow = row.quantity <= row.reorder_level && row.reorder_level > 0;
                const isOut = row.quantity <= 0;
                const statusCfg = isOut
                  ? { bg: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500", label: "Out of Stock" }
                  : isLow
                    ? { bg: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500", label: "Low Stock" }
                    : { bg: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500 animate-pulse", label: "In Stock" };
                return (
                  <div key={row.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className={`absolute left-0 top-0 h-full w-1 ${isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <div className="flex items-start gap-2.5 pl-1.5">
                      <div className={`size-9 rounded-lg bg-linear-to-br ${productGradient(row.product_name)} flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm`}>
                        {row.product_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900 text-sm truncate">{row.product_name}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusCfg.bg}`}>
                            <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{row.sku} · {row.warehouse_name}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Qty</p>
                        <p className={`font-bold tabular-nums ${isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"}`}>{row.quantity}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Unit</p>
                        <p className="font-semibold text-slate-700 truncate">{row.unit}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Reorder</p>
                        <p className="font-semibold text-slate-700 tabular-nums">{row.reorder_level}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Desktop: Stock Table ──────────────────────────────── */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Product</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">SKU</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Warehouse</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Unit</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : stock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={Package}
                        title="No stock records found"
                        description="Add opening stock to begin tracking inventory."
                        action={
                          <Button
                            onClick={() => setAdjustOpen(true)}
                            className="bg-linear-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                          >
                            <Package className="size-4 mr-1.5" /> Add Opening Stock
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  stock.map((row) => {
                    const isLow = row.quantity <= row.reorder_level && row.reorder_level > 0;
                    const isOut = row.quantity <= 0;
                    return (
                      <TableRow key={row.id} className="hover:bg-violet-50/40 transition-colors border-b border-slate-100">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`size-8 rounded-lg bg-linear-to-br ${productGradient(row.product_name)} flex items-center justify-center shrink-0 text-white font-bold text-[11px] shadow-sm`}>
                              {row.product_name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">{row.product_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs font-mono">{row.sku}</TableCell>
                        <TableCell className="text-slate-600">{row.warehouse_name}</TableCell>
                        <TableCell className={`text-right font-semibold tabular-nums ${isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"}`}>
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-slate-500">{row.unit}</TableCell>
                        <TableCell>
                          {isOut ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              <span className="size-1.5 rounded-full bg-rose-500" />
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <AlertTriangle className="size-3" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              In Stock
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3 text-slate-400" />
                            {dateStr(row.updated_at)}
                          </span>
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
              <span className="tabular-nums">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, count)} of {count}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page * limit >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════ STOCK MOVEMENTS TAB ══════════════ */}
      {activeTab === "movements" && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search notes…"
                value={movementsSearch}
                onChange={(e) => { setMovementsSearch(e.target.value); setMovementsPage(1); }}
                className="pl-9 focus-visible:ring-violet-500"
              />
            </div>
            <Select value={movementsType} onValueChange={(v) => { setMovementsType(v); setMovementsPage(1); }}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="stock_in">Stock In</SelectItem>
                <SelectItem value="stock_out">Stock Out</SelectItem>
                <SelectItem value="opening">Opening</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="transfer_in">Transfer In</SelectItem>
                <SelectItem value="transfer_out">Transfer Out</SelectItem>
                <SelectItem value="write_off">Write Off</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: Movement cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {movementsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : movements.length === 0 ? (
              <EmptyState
                icon={ArrowUpDown}
                title="No stock movements yet"
                description="Movements appear here when stock is adjusted, received from LPOs, or sold."
              />
            ) : (
              movements.map((m) => {
                const typeInfo = movementTypeLabel[m.type] ?? { label: m.type, color: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" };
                const isPositive = m.quantity > 0;
                return (
                  <div key={m.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className={`absolute left-0 top-0 h-full w-1 ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-sm truncate">{m.product_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{m.warehouse_name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${typeInfo.color}`}>
                        <span className={`size-1.5 rounded-full ${typeInfo.dot}`} />
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Qty</p>
                        <p className={`font-bold tabular-nums ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                          {isPositive ? "+" : ""}{m.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Unit Cost</p>
                        <p className="font-semibold text-slate-700 tabular-nums">{m.unit_cost != null ? `KES ${Number(m.unit_cost).toLocaleString()}` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Date</p>
                        <p className="font-semibold text-slate-700">{dateStr(m.created_at)}</p>
                      </div>
                    </div>
                    {m.notes && <p className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 line-clamp-2">{m.notes}</p>}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: Movement table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Product</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Warehouse</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Unit Cost</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={ArrowUpDown}
                        title="No stock movements yet"
                        description="Movements appear here when stock is adjusted, received from LPOs, or sold."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => {
                    const typeInfo = movementTypeLabel[m.type] ?? { label: m.type, color: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" };
                    const isPositive = m.quantity > 0;
                    return (
                      <TableRow key={m.id} className="hover:bg-violet-50/40 transition-colors border-b border-slate-100">
                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">{dateTimeStr(m.created_at)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${typeInfo.color}`}>
                            <span className={`size-1.5 rounded-full ${typeInfo.dot}`} />
                            {typeInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{m.product_name}</TableCell>
                        <TableCell className="text-slate-600">{m.warehouse_name}</TableCell>
                        <TableCell className={`text-right font-semibold tabular-nums ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                          {isPositive ? "+" : ""}{m.quantity}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 tabular-nums">
                          {m.unit_cost != null ? `KES ${Number(m.unit_cost).toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs max-w-50 truncate">{m.notes ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {movementsCount > limit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="tabular-nums">Showing {(movementsPage - 1) * limit + 1}–{Math.min(movementsPage * limit, movementsCount)} of {movementsCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={movementsPage === 1} onClick={() => setMovementsPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={movementsPage * limit >= movementsCount} onClick={() => setMovementsPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════ GRN TAB ══════════════ */}
      {activeTab === "grns" && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search GRN number…"
                value={grnsSearch}
                onChange={(e) => { setGrnsSearch(e.target.value); setGrnsPage(1); }}
                className="pl-9 focus-visible:ring-violet-500"
              />
            </div>
          </div>

          {/* Mobile: GRN cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {grnsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : grns.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No goods received notes yet"
                description="GRNs are created automatically when an LPO is marked as received."
              />
            ) : (
              grns.map((g) => {
                const statusInfo = grnStatusConfig[g.status] ?? { label: g.status, color: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" };
                return (
                  <div key={g.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="absolute left-0 top-0 h-full w-1 bg-linear-to-b from-violet-500 to-purple-600" />
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-violet-700 truncate">{g.grn_number}</p>
                        <p className="text-[11px] text-slate-500 truncate">{g.supplier_name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusInfo.color}`}>
                        <span className={`size-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">LPO</p>
                        <p className="font-mono font-semibold text-slate-700 truncate">{g.lpo_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide">Warehouse</p>
                        <p className="font-semibold text-slate-700 truncate">{g.warehouse_name}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-500">
                      <CalendarDays className="size-3" />
                      {dateTimeStr(g.received_at || g.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: GRN table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">GRN Number</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">LPO Number</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Warehouse</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Received Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grnsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : grns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={ClipboardCheck}
                        title="No goods received notes yet"
                        description="GRNs are created automatically when an LPO is marked as received."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  grns.map((g) => {
                    const statusInfo = grnStatusConfig[g.status] ?? { label: g.status, color: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" };
                    return (
                      <TableRow key={g.id} className="hover:bg-violet-50/40 transition-colors border-b border-slate-100">
                        <TableCell className="font-semibold text-violet-700 font-mono text-sm">{g.grn_number}</TableCell>
                        <TableCell className="text-slate-600 font-mono text-sm">{g.lpo_number}</TableCell>
                        <TableCell className="font-medium text-slate-900">{g.supplier_name}</TableCell>
                        <TableCell className="text-slate-600">{g.warehouse_name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.color}`}>
                            <span className={`size-1.5 rounded-full ${statusInfo.dot}`} />
                            {statusInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3 text-slate-400" />
                            {dateTimeStr(g.received_at || g.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs max-w-50 truncate">{g.notes ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {grnsCount > limit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="tabular-nums">Showing {(grnsPage - 1) * limit + 1}–{Math.min(grnsPage * limit, grnsCount)} of {grnsCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={grnsPage === 1} onClick={() => setGrnsPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={grnsPage * limit >= grnsCount} onClick={() => setGrnsPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Adjustment Sheet */}
      <Sheet open={adjustOpen} onOpenChange={(o) => { if (!o) { setAdjustOpen(false); reset(); } }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-violet-600 to-purple-600 shrink-0" />
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/30">
                <Package className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-slate-900 text-lg font-semibold leading-tight">Stock Adjustment</SheetTitle>
                <SheetDescription className="text-slate-500 text-xs mt-0.5">
                  Record a stock movement or manual adjustment.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <Separator className="shrink-0" />
          <form onSubmit={handleSubmit(onAdjust)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Product <span className="text-rose-500">*</span></Label>
                <Controller
                  control={control}
                  name="product_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.product_id ? "border-rose-400" : ""}>
                        <SelectValue placeholder="Select product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.product_id && <p className="text-xs text-rose-500">{errors.product_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Warehouse <span className="text-rose-500">*</span></Label>
                <Controller
                  control={control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.warehouse_id ? "border-rose-400" : ""}>
                        <SelectValue placeholder="Select warehouse…" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.warehouse_id && <p className="text-xs text-rose-500">{errors.warehouse_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Movement Type <span className="text-rose-500">*</span></Label>
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
                  <Label>Quantity <span className="text-rose-500">*</span> <span className="text-xs text-slate-400">(negative to reduce)</span></Label>
                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field }) => (
                      <Input
                        type="number" step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className={errors.quantity ? "border-rose-400" : ""}
                      />
                    )}
                  />
                  {errors.quantity && <p className="text-xs text-rose-500">{errors.quantity.message}</p>}
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
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white min-w-32 shadow-md shadow-violet-500/20"
              >
                {isSaving ? "Saving…" : "Save Adjustment"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
