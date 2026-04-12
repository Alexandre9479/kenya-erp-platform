"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{supplier ? "Edit Supplier" : "New Supplier"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Supplier Name *</Label>
            <Input {...register("name")} placeholder="Supplier Ltd" className={errors.name ? "border-destructive" : ""} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
            <Input
              type="number"
              min="0"
              {...register("payment_terms", { valueAsNumber: true })}
              placeholder="30"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={3} placeholder="Any notes about this supplier…" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {supplier ? "Save Changes" : "Create Supplier"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
