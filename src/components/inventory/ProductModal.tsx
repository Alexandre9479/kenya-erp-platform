"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  buyingPrice: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(0, "Must be 0 or more")),
  sellingPrice: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(0, "Must be 0 or more")),
  taxRate: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(0).max(100)),
  currentStock: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(0)),
  reorderLevel: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(0)),
  maxStockLevel: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(0))
    .optional(),
  warehouseLocation: z.string().optional(),
});

type ProductForm = z.infer<typeof schema>;

export interface ProductData {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  unit: string;
  buyingPrice: string | number;
  sellingPrice: string | number;
  taxRate: string | number;
  currentStock: string | number;
  reorderLevel: string | number;
  maxStockLevel?: string | number | null;
  warehouseLocation?: string | null;
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ProductData | null;
}

const UNITS = ["pcs", "kgs", "ltrs", "mtrs", "boxes", "cartons", "dozens", "pairs", "sets", "bags"];

interface Category { id: string; name: string; }

export default function ProductModal({ open, onClose, onSuccess, product }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ProductForm>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      taxRate: 16,
      currentStock: 0,
      reorderLevel: 0,
      unit: "pcs",
      buyingPrice: 0,
      sellingPrice: 0,
    },
  });

  useEffect(() => {
    fetch("/api/inventory/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); });
  }, []);

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        barcode: product.barcode || "",
        categoryId: product.categoryId || "",
        unit: product.unit,
        buyingPrice: Number(product.buyingPrice),
        sellingPrice: Number(product.sellingPrice),
        taxRate: Number(product.taxRate),
        currentStock: Number(product.currentStock),
        reorderLevel: Number(product.reorderLevel),
        maxStockLevel: product.maxStockLevel ? Number(product.maxStockLevel) : undefined,
        warehouseLocation: product.warehouseLocation || "",
      });
    } else {
      reset({
        name: "",
        description: "",
        sku: "",
        barcode: "",
        categoryId: "",
        unit: "pcs",
        buyingPrice: 0,
        sellingPrice: 0,
        taxRate: 16,
        currentStock: 0,
        reorderLevel: 0,
        maxStockLevel: undefined,
        warehouseLocation: "",
      });
    }
  }, [product, reset, open]);

  const onSubmit = async (data: ProductForm) => {
    setLoading(true);
    try {
      const url = product
        ? `/api/inventory/products/${product.id}`
        : "/api/inventory/products";
      const method = product ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(product ? "Product updated!" : "Product created!");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {product ? "Edit Product" : "Add New Product"}
              </h2>
              <p className="text-sm text-slate-500">
                {product ? "Update product details" : "Fill in the product information"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-5">

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Product Name *
              </label>
              <input
                {...register("name")}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Office Chair - Executive"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* SKU & Barcode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">SKU *</label>
                <input
                  {...register("sku")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. CHR-001"
                />
                {errors.sku && (
                  <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Barcode</label>
                <input
                  {...register("barcode")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Category</label>
                <select
                  {...register("categoryId")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Unit of Measure *
                </label>
                <select
                  {...register("unit")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Buying Price *
                </label>
                <input
                  {...register("buyingPrice")}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {errors.buyingPrice && (
                  <p className="text-red-500 text-xs mt-1">{errors.buyingPrice.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Selling Price *
                </label>
                <input
                  {...register("sellingPrice")}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {errors.sellingPrice && (
                  <p className="text-red-500 text-xs mt-1">{errors.sellingPrice.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Tax Rate (%)
                </label>
                <input
                  {...register("taxRate")}
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="16"
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Opening Stock
                </label>
                <input
                  {...register("currentStock")}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Reorder Level
                </label>
                <input
                  {...register("reorderLevel")}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Max Stock Level
                </label>
                <input
                  {...register("maxStockLevel")}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Warehouse Location
              </label>
              <input
                {...register("warehouseLocation")}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Shelf A3, Rack 2"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional product description"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {product ? "Update Product" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}