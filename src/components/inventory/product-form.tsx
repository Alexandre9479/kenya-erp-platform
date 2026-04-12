"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ProductRow, CategoryRow } from "./inventory-client";

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  category_id: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  cost_price: z.number().min(0, "Must be 0 or more"),
  selling_price: z.number().min(0, "Must be 0 or more"),
  vat_rate: z.number(),
  reorder_level: z.number().int().min(0, "Must be 0 or more"),
  barcode: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const VAT_OPTIONS = [
  { label: "0% (Exempt)", value: 0 },
  { label: "8% (Special)", value: 8 },
  { label: "16% (Standard)", value: 16 },
];

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductRow;
  categories: CategoryRow[];
  onSuccess: () => void;
}

export function ProductForm({ open, onOpenChange, product, categories, onSuccess }: ProductFormProps) {
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "", name: "", category_id: undefined, description: "",
      unit: "", cost_price: 0, selling_price: 0, vat_rate: 16,
      reorder_level: 0, barcode: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (product) {
        reset({
          sku: product.sku, name: product.name,
          category_id: product.category_id ?? undefined,
          description: product.description ?? "",
          unit: product.unit, cost_price: product.cost_price,
          selling_price: product.selling_price, vat_rate: product.vat_rate,
          reorder_level: product.reorder_level, barcode: product.barcode ?? "",
        });
      } else {
        reset({
          sku: "", name: "", category_id: undefined, description: "",
          unit: "", cost_price: 0, selling_price: 0, vat_rate: 16,
          reorder_level: 0, barcode: "",
        });
      }
    }
  }, [open, product, reset]);

  function generateSku() {
    setValue("sku", `PRD-${Date.now().toString().slice(-6)}`);
  }

  async function onSubmit(values: ProductFormValues) {
    try {
      const payload = {
        sku: values.sku.trim(),
        name: values.name.trim(),
        category_id: values.category_id && values.category_id !== "none" ? values.category_id : null,
        description: values.description?.trim() || null,
        unit: values.unit.trim(),
        cost_price: values.cost_price,
        selling_price: values.selling_price,
        vat_rate: values.vat_rate,
        reorder_level: values.reorder_level,
        barcode: values.barcode?.trim() || null,
      };
      const url = isEditing ? `/api/products/${product!.id}` : "/api/products";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string | Record<string, string[]> };
        throw new Error(typeof body.error === "string" ? body.error : "Validation error — check the form");
      }
      toast.success(isEditing ? "Product updated" : "Product created");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
        {/* gradient accent strip */}
        <div className="h-1.5 w-full bg-linear-to-r from-cyan-500 to-teal-600 shrink-0" />

        {/* header */}
        <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-100">
              <Package className="size-4 text-cyan-600" />
            </div>
            <SheetTitle className="text-slate-900 text-lg font-semibold">
              {isEditing ? "Edit Product" : "Add Product"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
            {isEditing ? "Update the product details below." : "Fill in the details to create a new product."}
          </SheetDescription>
        </SheetHeader>

        <Separator className="shrink-0" />

        {/* scrollable body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">
              {/* SKU */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku">SKU <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input id="sku" {...register("sku")} placeholder="e.g. PRD-123456" className="flex-1" />
                  <Button type="button" variant="outline" onClick={generateSku} className="shrink-0 text-cyan-700 border-cyan-200 hover:bg-cyan-50">
                    Generate
                  </Button>
                </div>
                {errors.sku && <p className="text-xs text-red-500">{errors.sku.message}</p>}
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" {...register("name")} placeholder="Product name" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Controller
                  control={control}
                  name="category_id"
                  render={({ field }) => (
                    <Select value={field.value ?? "none"} onValueChange={(val) => field.onChange(val === "none" ? undefined : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="No category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} placeholder="Optional product description" rows={3} className="resize-none" />
              </div>

              {/* Unit */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unit">Unit <span className="text-red-500">*</span></Label>
                <Input id="unit" {...register("unit")} placeholder="pcs / kg / litres / boxes" />
                {errors.unit && <p className="text-xs text-red-500">{errors.unit.message}</p>}
              </div>

              {/* Cost & Selling Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cost_price">Cost Price (KES)</Label>
                  <Input id="cost_price" type="number" step="0.01" min="0" {...register("cost_price", { valueAsNumber: true })} />
                  {errors.cost_price && <p className="text-xs text-red-500">{errors.cost_price.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="selling_price">Selling Price (KES)</Label>
                  <Input id="selling_price" type="number" step="0.01" min="0" {...register("selling_price", { valueAsNumber: true })} />
                  {errors.selling_price && <p className="text-xs text-red-500">{errors.selling_price.message}</p>}
                </div>
              </div>

              {/* VAT Rate */}
              <div className="flex flex-col gap-1.5">
                <Label>VAT Rate</Label>
                <Controller
                  control={control}
                  name="vat_rate"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={(val) => field.onChange(Number(val))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select VAT rate" />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Reorder Level */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input id="reorder_level" type="number" min="0" step="1" {...register("reorder_level", { valueAsNumber: true })} />
                {errors.reorder_level && <p className="text-xs text-red-500">{errors.reorder_level.message}</p>}
              </div>

              {/* Barcode */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="barcode">Barcode (optional)</Label>
                <Input id="barcode" {...register("barcode")} placeholder="e.g. 5901234123457" />
              </div>
            </div>
          </div>

          <Separator className="shrink-0" />

          <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-28">
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
