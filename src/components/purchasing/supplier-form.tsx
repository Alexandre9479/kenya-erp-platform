"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";
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
} from "@/components/ui/sheet";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  kra_pin: z.string().optional(),
  payment_terms: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  kra_pin: string | null;
  payment_terms: number;
  notes: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplier?: Supplier | null;
}

export function SupplierForm({ open, onClose, onSaved, supplier }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          email: supplier.email ?? "",
          phone: supplier.phone ?? "",
          address: supplier.address ?? "",
          city: supplier.city ?? "",
          kra_pin: supplier.kra_pin ?? "",
          payment_terms: supplier.payment_terms,
          notes: supplier.notes ?? "",
        }
      : { payment_terms: 30 },
  });

  async function onSubmit(data: FormValues) {
    setIsSaving(true);
    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : "/api/suppliers";
      const method = supplier ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(supplier ? "Supplier updated" : "Supplier created");
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
        <div className="h-1.5 w-full bg-linear-to-r from-amber-500 to-orange-600 shrink-0" />

        <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100">
              <Truck className="size-4 text-amber-600" />
            </div>
            <SheetTitle className="text-slate-900 text-lg font-semibold">
              {supplier ? "Edit Supplier" : "New Supplier"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
            {supplier ? "Update the supplier details below." : "Fill in the details to create a new supplier."}
          </SheetDescription>
        </SheetHeader>

        <Separator className="shrink-0" />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <Label>Supplier Name <span className="text-red-500">*</span></Label>
                <Input {...register("name")} placeholder="Supplier Ltd" className={errors.name ? "border-red-400" : ""} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input {...register("email")} type="email" placeholder="info@supplier.co.ke" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...register("phone")} placeholder="+254 700 000 000" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input {...register("address")} placeholder="123 Industrial Area" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input {...register("city")} placeholder="Nairobi" />
                </div>
                <div className="space-y-1.5">
                  <Label>KRA PIN</Label>
                  <Input {...register("kra_pin")} placeholder="P000000000A" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Terms (days)</Label>
                <Input type="number" min="0" {...register("payment_terms", { valueAsNumber: true })} placeholder="30" />
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea {...register("notes")} rows={3} placeholder="Any notes about this supplier…" className="resize-none" />
              </div>
            </div>
          </div>

          <Separator className="shrink-0" />

          <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white min-w-28">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {supplier ? "Save Changes" : "Create Supplier"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
