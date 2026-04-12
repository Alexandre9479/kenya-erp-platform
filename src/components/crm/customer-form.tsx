"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

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

type CustomerRow = Tables<"customers">;

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  email: z.string().max(255).refine(
    (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Enter a valid email address"
  ),
  phone: z.string().max(50),
  address: z.string().max(500),
  city: z.string().max(100),
  kra_pin: z.string().max(20),
  credit_limit: z.string().refine(
    (v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    "Credit limit must be a positive number"
  ),
  notes: z.string().max(2000),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

function nullify(v: string): string | null {
  return v.trim() !== "" ? v.trim() : null;
}
function parseLimit(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

interface CustomerFormProps {
  customer?: CustomerRow;
  onSuccess: () => void;
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const isEditing = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema, undefined, { raw: true }),
    defaultValues: {
      name: "", email: "", phone: "", address: "",
      city: "", kra_pin: "", credit_limit: "0", notes: "",
    },
  });

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
      reset({ name: "", email: "", phone: "", address: "", city: "", kra_pin: "", credit_limit: "0", notes: "" });
    }
  }, [customer, reset]);

  const onSubmit: SubmitHandler<CustomerFormValues> = async (values) => {
    const url = isEditing ? `/api/customers/${customer!.id}` : "/api/customers";
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
      toast.success(isEditing ? "Customer updated successfully" : "Customer created successfully");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
      {/* gradient accent strip */}
      <div className="h-1.5 w-full bg-linear-to-r from-rose-500 to-pink-600 shrink-0" />

      {/* header */}
      <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-100">
            <Users className="size-4 text-rose-600" />
          </div>
          <SheetTitle className="text-slate-900 text-lg font-semibold">
            {isEditing ? `Edit ${customer!.name}` : "Add Customer"}
          </SheetTitle>
        </div>
        <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
          {isEditing ? "Update the customer details below." : "Fill in the details to create a new customer."}
        </SheetDescription>
      </SheetHeader>

      <Separator className="shrink-0" />

      {/* scrollable body */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden" noValidate>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="e.g. Nairobi Supplies Ltd" aria-invalid={Boolean(errors.name)} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="e.g. info@company.co.ke" aria-invalid={Boolean(errors.email)} {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="e.g. +254 700 000 000" {...register("phone")} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="e.g. 12 Kimathi Street" {...register("address")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="e.g. Nairobi" {...register("city")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kra_pin">KRA PIN</Label>
                <Input id="kra_pin" placeholder="A012345678Z" {...register("kra_pin")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="credit_limit">Credit Limit (KES)</Label>
                <Input id="credit_limit" type="number" min="0" step="1" placeholder="0" aria-invalid={Boolean(errors.credit_limit)} {...register("credit_limit")} />
                {errors.credit_limit && <p className="text-xs text-red-500">{errors.credit_limit.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} placeholder="Any additional information about this customer…" className="resize-none" {...register("notes")} />
              {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
            </div>
          </div>
        </div>

        <Separator className="shrink-0" />

        <SheetFooter className="px-6 py-4 shrink-0 flex flex-row justify-end gap-2 bg-slate-50">
          <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white min-w-28">
            {isSubmitting ? (
              <><Loader2 className="size-4 animate-spin mr-2" />Saving…</>
            ) : isEditing ? "Save Changes" : "Create Customer"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
