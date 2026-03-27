"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Tag, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

type CategoryForm = z.infer<typeof schema>;

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryModal({ open, onClose, onSuccess }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
  });

  // Load categories when modal opens
  useState(() => {
    if (open) fetchCategories();
  });

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/inventory/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  const onSubmit = async (data: CategoryForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Category created!");
        reset();
        fetchCategories();
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create category");
      }
    } catch {
      toast.error("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`/api/inventory/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Category deleted");
        fetchCategories();
        onSuccess();
      }
    } catch {
      toast.error("Failed to delete category");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manage Categories</h2>
              <p className="text-sm text-slate-500">Add and manage product categories</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Add Category Form */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Add New Category</h3>
            <div>
              <input
                {...register("name")}
                placeholder="Category name e.g. Office Furniture"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <input
                {...register("description")}
                placeholder="Description (optional)"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Plus className="w-4 h-4" />
              }
              Add Category
            </button>
          </div>

          {/* Existing Categories */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Existing Categories ({categories.length})
            </h3>
            {loadingCategories ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No categories yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat.id}
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <button onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}