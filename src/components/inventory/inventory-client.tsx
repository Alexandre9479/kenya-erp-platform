"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Package,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Pencil,
  PowerOff,
  Power,
  Trash2,
  AlertTriangle,
  Tag,
  Sparkles,
  Boxes,
  Layers,
} from "lucide-react";
import {
  PremiumHero,
  HeroStatGrid,
  HeroStat,
  EmptyState,
} from "@/components/ui/premium-hero";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

import { ProductForm } from "./product-form";
import { CategoryForm } from "./category-form";

export type ProductRow = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  vat_rate: number;
  reorder_level: number;
  is_active: boolean;
  image_url: string | null;
  barcode: string | null;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  total_stock: number;
};

export type CategoryRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
};

interface InventoryClientProps {
  initialProducts: ProductRow[];
  initialCategories: CategoryRow[];
  totalCount: number;
}

const PAGE_LIMIT = 25;

function formatKES(amount: number): string {
  return (
    "KES " +
    new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(amount)
  );
}

export function InventoryClient({
  initialProducts,
  initialCategories,
  totalCount: initialTotalCount,
}: InventoryClientProps) {
  // Product state
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Categories state
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Sheet / dialog state
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | undefined>(undefined);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | undefined>(undefined);

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => { setCurrentPage(1); }, [selectedCategory]);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategory !== "all") params.set("category_id", selectedCategory);
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_LIMIT));

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load products");
      }
      const json = (await res.json()) as { data: ProductRow[]; count: number };
      setProducts(json.data);
      setTotalCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setIsLoadingProducts(false);
    }
  }, [debouncedSearch, selectedCategory, currentPage]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchProducts();
  }, [fetchProducts]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load categories");
      }
      const json = (await res.json()) as { data: CategoryRow[] };
      setCategories(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  async function handleToggleActive(product: ProductRow) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Update failed");
      }
      toast.success(product.is_active ? "Product deactivated" : "Product activated");
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleDeleteCategory(category: CategoryRow) {
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.success("Category deleted");
      fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // Derived KPIs
  const lowStockCount = products.filter((p) => p.total_stock <= p.reorder_level).length;
  const activeCount = products.filter((p) => p.is_active).length;

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT));
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const showingTo = Math.min(currentPage * PAGE_LIMIT, totalCount);

  const catalogueValue = products.reduce((s, p) => s + (p.total_stock * p.cost_price || 0), 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">

      <PremiumHero
        gradient="cyan"
        icon={Package}
        eyebrow={
          <>
            <Sparkles className="size-3 sm:size-3.5" />
            Inventory
          </>
        }
        title="Product Catalogue"
        description="Manage products, categories, pricing and stock health across your warehouses."
        actions={
          <Button
            onClick={() => { setEditingProduct(undefined); setProductSheetOpen(true); }}
            size="sm"
            className="bg-white text-cyan-700 hover:bg-white/90 font-semibold shadow-md gap-1.5"
          >
            <Plus className="size-3.5" />
            Add Product
          </Button>
        }
      >
        <HeroStatGrid>
          <HeroStat icon={Package} label="Total products" value={String(totalCount)} sub={`${products.length} in view`} />
          <HeroStat icon={Power} label="Active" value={String(activeCount)} sub={`${Math.round((activeCount / Math.max(products.length, 1)) * 100)}% live`} accent="success" />
          <HeroStat icon={AlertTriangle} label="Low stock" value={String(lowStockCount)} sub={lowStockCount > 0 ? "needs reorder" : "all healthy"} accent={lowStockCount > 0 ? "warning" : "default"} />
          <HeroStat icon={Boxes} label="Catalogue value" value={catalogueValue >= 1000 ? `KES ${(catalogueValue / 1000).toFixed(0)}K` : `KES ${catalogueValue.toFixed(0)}`} sub="at cost" accent="info" />
        </HeroStatGrid>
      </PremiumHero>

      <Tabs defaultValue="products">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="products"><Package className="mr-1.5 h-3.5 w-3.5" />Products ({totalCount})</TabsTrigger>
            <TabsTrigger value="categories"><Layers className="mr-1.5 h-3.5 w-3.5" />Categories ({categories.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by name or SKU…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 focus-visible:ring-cyan-500"
              />
            </div>

            <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val)}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile product cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {isLoadingProducts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={Package}
                  title="No products found"
                  description="Try adjusting your search or filters, or add a product to get started."
                  action={
                    <Button
                      size="sm"
                      className="bg-linear-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white gap-1.5"
                      onClick={() => { setEditingProduct(undefined); setProductSheetOpen(true); }}
                    >
                      <Plus className="size-3.5" /> Add Product
                    </Button>
                  }
                />
              </div>
            ) : (
              products.map((product) => {
                const stockWarning = product.total_stock <= product.reorder_level;
                const initial = (product.name?.trim() ?? "?").charAt(0).toUpperCase();
                return (
                  <div
                    key={product.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-cyan-500 via-teal-500 to-cyan-600" />
                    <div className="p-3 pt-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-teal-600 text-white font-bold text-sm shrink-0 shadow-sm">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate text-sm">{product.name}</p>
                          <p className="text-[11px] text-slate-500 truncate font-mono">
                            {product.sku}
                            {product.category_name ? ` · ${product.category_name}` : ""}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 shrink-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingProduct(product); setProductSheetOpen(true); }}>
                              <Pencil className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(product)}
                              className={product.is_active ? "text-amber-600" : "text-emerald-600"}
                            >
                              {product.is_active ? (
                                <><PowerOff className="size-4 mr-2" /> Deactivate</>
                              ) : (
                                <><Power className="size-4 mr-2" /> Activate</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            product.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              product.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            )}
                          />
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatKES(product.selling_price)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <p className="uppercase tracking-wide font-semibold text-slate-400">Stock</p>
                          <p className={cn("font-bold tabular-nums mt-0.5 flex items-center gap-1", stockWarning ? "text-amber-600" : "text-slate-700")}>
                            {stockWarning && <AlertTriangle className="size-3" />}
                            {product.total_stock.toLocaleString()} {product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase tracking-wide font-semibold text-slate-400">VAT</p>
                          <p className="font-bold text-slate-700 tabular-nums mt-0.5">{product.vat_rate}%</p>
                        </div>
                        <div className="text-right">
                          <p className="uppercase tracking-wide font-semibold text-slate-400">Reorder</p>
                          <p className="font-bold text-slate-700 tabular-nums mt-0.5">{product.reorder_level}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop products table */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-linear-to-r from-cyan-500 via-teal-500 to-cyan-600" />
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">SKU</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Name</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Category</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Unit</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs text-right">Selling Price</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs text-right">Stock</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs text-right">VAT</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <EmptyState
                        icon={Package}
                        title="No products found"
                        description="Try adjusting your search or filters, or add a product to get started."
                        action={
                          <Button
                            size="sm"
                            className="bg-linear-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white gap-1.5"
                            onClick={() => { setEditingProduct(undefined); setProductSheetOpen(true); }}
                          >
                            <Plus className="size-3.5" /> Add Product
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const stockWarning = product.total_stock <= product.reorder_level;
                    return (
                      <TableRow key={product.id} className="hover:bg-cyan-50/30 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-600">{product.sku}</TableCell>
                        <TableCell className="font-semibold text-slate-900">{product.name}</TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {product.category_name ?? <span className="italic text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{product.unit}</TableCell>
                        <TableCell className="text-right font-medium text-slate-700 tabular-nums">
                          {formatKES(product.selling_price)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-semibold tabular-nums",
                          stockWarning ? "text-amber-600" : "text-slate-700"
                        )}>
                          <span className="inline-flex items-center gap-1 justify-end">
                            {stockWarning && <AlertTriangle className="size-3.5" />}
                            {product.total_stock.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-sm tabular-nums">{product.vat_rate}%</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              product.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                product.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                              )}
                            />
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingProduct(product); setProductSheetOpen(true); }}>
                                <Pencil className="size-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(product)}
                                className={product.is_active ? "text-amber-600" : "text-emerald-600"}
                              >
                                {product.is_active ? (
                                  <><PowerOff className="size-4 mr-2" /> Deactivate</>
                                ) : (
                                  <><Power className="size-4 mr-2" /> Activate</>
                                )}
                              </DropdownMenuItem>
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

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>Showing {showingFrom}–{showingTo} of {totalCount}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={currentPage <= 1 || isLoadingProducts}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={currentPage >= totalPages || isLoadingProducts}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => { setEditingCategory(undefined); setCategorySheetOpen(true); }}
              className="bg-linear-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white gap-2 shadow-sm"
            >
              <Plus className="size-4" /> Add Category
            </Button>
          </div>

          {/* Mobile category cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {isLoadingCategories ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : categories.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={Tag}
                  title="No categories yet"
                  description="Create a category to organise your products."
                  action={
                    <Button
                      size="sm"
                      className="bg-linear-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white gap-1.5"
                      onClick={() => { setEditingCategory(undefined); setCategorySheetOpen(true); }}
                    >
                      <Plus className="size-3.5" /> Add category
                    </Button>
                  }
                />
              </div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-3 pt-3.5"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-cyan-500 via-teal-500 to-cyan-600" />
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500 to-teal-600 text-white shrink-0 shadow-sm">
                      <Tag className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{cat.name}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {cat.description ?? "No description"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCategory(cat); setCategorySheetOpen(true); }}>
                          <Pencil className="size-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete category?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{cat.name}</strong>. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteCategory(cat)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop categories table */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-linear-to-r from-cyan-500 via-teal-500 to-cyan-600" />
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Name</TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Description</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCategories ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 3 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="p-0">
                      <EmptyState
                        icon={Tag}
                        title="No categories yet"
                        description="Create a category to organise your products."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-cyan-50/30 transition-colors">
                      <TableCell className="font-semibold text-slate-900">{cat.name}</TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {cat.description ?? <span className="italic text-slate-300">—</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingCategory(cat); setCategorySheetOpen(true); }}>
                              <Pencil className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="size-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete category?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete <strong>{cat.name}</strong>. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDeleteCategory(cat)}
                                  >
                                    Delete
                                  </AlertDialogAction>
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
        </TabsContent>
      </Tabs>

      {/* Product Sheet */}
      <ProductForm
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        product={editingProduct}
        categories={categories}
        onSuccess={() => { setProductSheetOpen(false); fetchProducts(); }}
      />

      {/* Category Sheet */}
      <CategoryForm
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        category={editingCategory}
        onSuccess={() => { setCategorySheetOpen(false); fetchCategories(); }}
      />
    </div>
  );
}
