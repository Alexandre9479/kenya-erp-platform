"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, Filter, Package,
  AlertTriangle, Edit, Trash2,
  RefreshCw, Download, TrendingDown, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ProductModal, { ProductData } from "@/components/inventory/ProductModal";
import CategoryModal from "@/components/inventory/CategoryModal";

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (lowStockOnly) params.set("lowStock", "true");

      const res = await fetch(`/api/inventory/products?${params}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.data);
        const total = data.data.length;
        const lowStock = data.data.filter((p: ProductData) =>
          Number(p.currentStock) < Number(p.reorderLevel) &&
          Number(p.currentStock) > 0
        ).length;
        const outOfStock = data.data.filter(
          (p: ProductData) => Number(p.currentStock) === 0
        ).length;
        const totalValue = data.data.reduce(
          (sum: number, p: ProductData) =>
            sum + Number(p.currentStock) * Number(p.buyingPrice),
          0
        );
        setStats({ total, lowStock, outOfStock, totalValue });
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/inventory/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Product deleted");
        fetchProducts();
      }
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const getStockStatus = (product: ProductData) => {
    const stock = Number(product.currentStock);
    const reorder = Number(product.reorderLevel);
    if (stock === 0)
      return { label: "Out of Stock", color: "bg-red-100 text-red-700" };
    if (stock < reorder)
      return { label: "Low Stock", color: "bg-orange-100 text-orange-700" };
    return { label: "In Stock", color: "bg-green-100 text-green-700" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory</h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage your products and stock levels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            <Tag className="w-4 h-4" />
            Categories
          </button>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Products",
            value: stats.total,
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Low Stock",
            value: stats.lowStock,
            icon: TrendingDown,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Out of Stock",
            value: stats.outOfStock,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Stock Value",
            value: `KSh ${new Intl.NumberFormat("en-KE").format(stats.totalValue)}`,
            icon: Package,
            color: "text-green-600",
            bg: "bg-green-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-4 border border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  stat.bg
                )}
              >
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border",
              lowStockOnly
                ? "bg-orange-50 border-orange-200 text-orange-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter className="w-4 h-4" />
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Category
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Buying
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Selling
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Stock
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          No products found
                        </p>
                        <p className="text-sm text-slate-500">
                          Add your first product to get started
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                      >
                        <Plus className="w-4 h-4" /> Add Product
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const status = getStockStatus(product);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {product.name}
                            </p>
                            {product.warehouseLocation && (
                              <p className="text-xs text-slate-400">
                                {product.warehouseLocation}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {product.categoryName || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-slate-600">
                          KSh {Number(product.buyingPrice).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          KSh {Number(product.sellingPrice).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <span
                            className={cn(
                              "text-sm font-bold",
                              Number(product.currentStock) === 0
                                ? "text-red-600"
                                : Number(product.currentStock) ,
                                 Number(product.reorderLevel)
                                ? "text-orange-600"
                                : "text-slate-900"
                            )}
                          >
                            {Number(product.currentStock).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            {product.unit}
                          </span>
                        </div>
                        {Number(product.reorderLevel) > 0 && (
                          <p className="text-xs text-slate-400">
                            Reorder at{" "}
                            {Number(product.reorderLevel).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full",
                            status.color
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowModal(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={fetchProducts}
        product={selectedProduct}
      />
      <CategoryModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}