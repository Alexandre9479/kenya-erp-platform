"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function CategoryForm({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormProps) {
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          description: category.description ?? "",
        });
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

      const url = isEditing
        ? `/api/categories/${category!.id}`
        : "/api/categories";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string | Record<string, string[]> };
        const msg =
          typeof body.error === "string"
            ? body.error
            : "Validation error — check the form";
        throw new Error(msg);
      }

      toast.success(isEditing ? "Category updated" : "Category created");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>
            {isEditing ? "Edit Category" : "Add Category"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the category name or description."
              : "Create a new product category."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              {...register("name")}
              placeholder="e.g. Electronics"
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-description">Description (optional)</Label>
            <Textarea
              id="cat-description"
              {...register("description")}
              placeholder="Brief description of this category"
              rows={4}
            />
          </div>

          <SheetFooter className="mt-2 flex gap-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              {isEditing ? "Save Changes" : "Create Category"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
