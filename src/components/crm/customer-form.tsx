"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import type { Tables } from "@/lib/types/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CustomerRow = Tables<"customers">;

// ---------------------------------------------------------------------------
// Zod schema — NO transforms so input === output (avoids resolver type clash)
// All fields are strings; nullification happens in onSubmit before fetch.
// ---------------------------------------------------------------------------
const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  email: z
    .string()
    .max(255, "Email is too long")
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email address"
    ),
  phone: z.string().max(50, "Phone number is too long"),
  address: z.string().max(500, "Address is too long"),
  city: z.string().max(100, "City name is too long"),
  kra_pin: z.string().max(20, "KRA PIN is too long"),
  credit_limit: z.string().refine(
    (v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    "Credit limit must be a positive number"
  ),
  notes: z.string().max(2000, "Notes are too long"),
});

// input === output (no transforms), so one type covers both
type CustomerFormValues = z.infer<typeof customerFormSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nullify(v: string): string | null {
  return v.trim() !== "" ? v.trim() : null;
}

function parseLimit(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CustomerFormProps {
  customer?: CustomerRow;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const isEditing = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    // raw: true → resolver returns Input shape, which equals Output here
    resolver: zodResolver(customerFormSchema, undefined, { raw: true }),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      kra_pin: "",
      credit_limit: "0",
      notes: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        kra_pin: customer.kra_pin ?? "",
        credit_limit: String(customer.credit_limit),
        notes: customer.notes ?? "",
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        kra_pin: "",
        credit_limit: "0",
        notes: "",
      });
    }
  }, [customer, reset]);

  const onSubmit: SubmitHandler<CustomerFormValues> = async (values) => {
    const url = isEditing
      ? `/api/customers/${customer!.id}`
      : "/api/customers";
    const method = isEditing ? "PATCH" : "POST";

    const payload = {
      name: values.name,
      email: nullify(values.email),
      phone: nullify(values.phone),
      address: nullify(values.address),
      city: nullify(values.city),
      kra_pin: nullify(values.kra_pin),
      credit_limit: parseLimit(values.credit_limit),
      notes: nullify(values.notes),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Request failed");
      }

      toast.success(
        isEditing
          ? "Customer updated successfully"
          : "Customer created successfully"
      );
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    }
  };

  return (
    <SheetContent
      side="right"
      className="w-full sm:max-w-xl flex flex-col overflow-y-auto"
    >
      <SheetHeader className="px-6 pt-6 pb-0">
        <SheetTitle>
          {isEditing ? `Edit ${customer!.name}` : "Add Customer"}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? "Update the customer details below."
            : "Fill in the details to create a new customer."}
        </SheetDescription>
      </SheetHeader>

      <Separator />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col flex-1 gap-0"
        noValidate
      >
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-5">
            {/* Name — full width */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Nairobi Supplies Ltd"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Email + Phone — 2-column grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. info@company.co.ke"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +254 700 000 000"
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address — full width */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="e.g. 12 Kimathi Street"
                aria-invalid={Boolean(errors.address)}
                {...register("address")}
              />
              {errors.address && (
                <p className="text-xs text-red-500">
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* City + KRA PIN — 2-column grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g. Nairobi"
                  aria-invalid={Boolean(errors.city)}
                  {...register("city")}
                />
                {errors.city && (
                  <p className="text-xs text-red-500">
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kra_pin">KRA PIN</Label>
                <Input
                  id="kra_pin"
                  placeholder="A012345678Z"
                  aria-invalid={Boolean(errors.kra_pin)}
                  {...register("kra_pin")}
                />
                {errors.kra_pin && (
                  <p className="text-xs text-red-500">
                    {errors.kra_pin.message}
                  </p>
                )}
              </div>
            </div>

            {/* Credit Limit — half-width */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="credit_limit">Credit Limit (KES)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  aria-invalid={Boolean(errors.credit_limit)}
                  {...register("credit_limit")}
                />
                {errors.credit_limit && (
                  <p className="text-xs text-red-500">
                    {errors.credit_limit.message}
                  </p>
                )}
              </div>
            </div>

            {/* Notes — full width */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Any additional information about this customer…"
                aria-invalid={Boolean(errors.notes)}
                className="resize-none"
                {...register("notes")}
              />
              {errors.notes && (
                <p className="text-xs text-red-500">{errors.notes.message}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <SheetFooter className="px-6 py-4 flex flex-row justify-end gap-2">
          <Button type="submit" disabled={isSubmitting} className="min-w-24">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Customer"
            )}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
