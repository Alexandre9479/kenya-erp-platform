"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Tag } from "lucide-react";

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

import type { CategoryRow } from "./inventory-client";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryRow;
  onSuccess: () => void;
}

export function CategoryForm({ open, onOpenChange, category, onSuccess }: CategoryFormProps) {
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        reset({ name: category.name, description: category.description ?? "" });
      } else {
        reset({ name: "", description: "" });
      }
    }
  }, [open, category, reset]);

  async function onSubmit(values: CategoryFormValues) {
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
      };
      const url = isEditing ? `/api/categories/${category!.id}` : "/api/categories";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string | Record<string, string[]> };
        throw new Error(typeof body.error === "string" ? body.error : "Validation error");
      }
      toast.success(isEditing ? "Category updated" : "Category created");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
        <div className="h-1.5 w-full bg-linear-to-r from-cyan-500 to-teal-600 shrink-0" />

        <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-100">
              <Tag className="size-4 text-cyan-600" />
            </div>
            <SheetTitle className="text-slate-900 text-lg font-semibold">
              {isEditing ? "Edit Category" : "Add Category"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
            {isEditing ? "Update the category name or description." : "Create a new product category."}
          </SheetDescription>
        </SheetHeader>

        <Separator className="shrink-0" />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-name">Name <span className="text-red-500">*</span></Label>
                <Input id="cat-name" {...register("name")} placeholder="e.g. Electronics" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-description">Description (optional)</Label>
                <Textarea id="cat-description" {...register("description")} placeholder="Brief description of this category" rows={4} className="resize-none" />
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
              {isEditing ? "Save Changes" : "Create Category"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
