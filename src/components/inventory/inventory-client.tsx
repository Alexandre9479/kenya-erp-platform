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
} from "lucide-react";
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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Reset page on category change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Fetch products whenever filters / page change
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

  // Skip the very first render — we have initial data from SSR
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchProducts();
  }, [fetchProducts]);

  // Fetch categories (used after create/update/delete)
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

  // Toggle product active status
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
      toast.success(
        product.is_active ? "Product deactivated" : "Product activated"
      );
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  // Delete category
  async function handleDeleteCategory(category: CategoryRow) {
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });
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

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT));
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const showingTo = Math.min(currentPage * PAGE_LIMIT, totalCount);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage products, categories, and stock levels
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* ─── PRODUCTS TAB ─────────────────────────────────── */}
        <TabsContent value="products" className="mt-4">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by name or SKU…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={(val) => setSelectedCategory(val)}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => {
                setEditingProduct(undefined);
                setProductSheetOpen(true);
              }}
              className="shrink-0"
            >
              <Plus className="size-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Unit</TableHead>
                  <TableHead className="font-semibold text-right">
                    Selling Price
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Stock
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    VAT
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Package className="size-10 mb-3 opacity-40" />
                        <p className="text-sm font-medium">No products found</p>
                        <p className="text-xs mt-1">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const stockWarning =
                      product.total_stock <= product.reorder_level;
                    return (
                      <TableRow key={product.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs text-slate-600">
                          {product.sku}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {product.category_name ?? (
                            <span className="italic text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {product.unit}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatKES(product.selling_price)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold tabular-nums",
                            stockWarning ? "text-amber-600" : "text-slate-700"
                          )}
                        >
                          {product.total_stock.toLocaleString()}
                          {stockWarning && (
                            <span className="ml-1 text-xs font-normal">
                              ⚠
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-sm">
                          {product.vat_rate}%
                        </TableCell>
                        <TableCell>
                          {product.is_active ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-500"
                            >
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingProduct(product);
                                  setProductSheetOpen(true);
                                }}
                              >
                                <Pencil className="size-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(product)}
                                className={
                                  product.is_active
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }
                              >
                                {product.is_active ? (
                                  <>
                                    <PowerOff className="size-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="size-4 mr-2" />
                                    Activate
                                  </>
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
              <span>
                Showing {showingFrom}–{showingTo} of {totalCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isLoadingProducts}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isLoadingProducts}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── CATEGORIES TAB ───────────────────────────────── */}
        <TabsContent value="categories" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                setEditingCategory(undefined);
                setCategorySheetOpen(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCategories ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 3 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <p className="text-sm font-medium">No categories yet</p>
                        <p className="text-xs mt-1">
                          Create a category to organise your products
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {cat.description ?? (
                          <span className="italic text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategorySheetOpen(true);
                              }}
                            >
                              <Pencil className="size-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete category?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete{" "}
                                    <strong>{cat.name}</strong>. This action
                                    cannot be undone.
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
        onSuccess={() => {
          setProductSheetOpen(false);
          fetchProducts();
        }}
      />

      {/* Category Sheet */}
      <CategoryForm
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        category={editingCategory}
        onSuccess={() => {
          setCategorySheetOpen(false);
          fetchCategories();
        }}
      />
    </div>
  );
}
