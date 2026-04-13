"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowLeft, Truck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type InvoiceOption = { id: string; invoice_number: string; customer_name: string };

const lineSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.number().min(0.01, "Required"),
  unit: z.string().optional(),
});

const formSchema = z.object({
  invoice_id: z.string().min(1, "Select an invoice"),
  delivery_date: z.string().min(1, "Required"),
  delivery_address: z.string().optional(),
  delivery_city: z.string().optional(),
  driver_name: z.string().optional(),
  vehicle_reg: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(lineSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;
const today = () => new Date().toISOString().split("T")[0];

export function DeliveryNoteBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoice = searchParams.get("invoice_id") ?? "";

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoice_id: preselectedInvoice,
      delivery_date: today(),
      items: [{ description: "", quantity: 1, unit: "pcs" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    // Load invoices that are not draft/cancelled
    Promise.all([
      fetch("/api/invoices?limit=200&status=sent").then((r) => r.json()),
      fetch("/api/invoices?limit=200&status=partial").then((r) => r.json()),
      fetch("/api/invoices?limit=200&status=paid").then((r) => r.json()),
      fetch("/api/invoices?limit=200&status=overdue").then((r) => r.json()),
    ]).then(([sent, partial, paid, overdue]) => {
      const all = [
        ...(sent.data ?? []),
        ...(partial.data ?? []),
        ...(paid.data ?? []),
        ...(overdue.data ?? []),
      ].map((i: any) => ({ id: i.id, invoice_number: i.invoice_number, customer_name: i.customer_name ?? "—" }));
      const seen = new Set<string>();
      setInvoices(all.filter((i) => { if (seen.has(i.id)) return false; seen.add(i.id); return true; }));
    });

    // If invoice preselected, load its items
    if (preselectedInvoice) {
      fetch(`/api/invoices/${preselectedInvoice}`)
        .then((r) => r.json())
        .then((json) => {
          // Not all invoice APIs return items — try the detail endpoint
          if (json.data?.items) {
            // Not available from list — we'll just load invoice_items from the detail page
          }
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/delivery-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Delivery note created");
      router.push(`/sales/delivery-note/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create delivery note");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="text-slate-500 hover:text-slate-700">
          <Link href="/sales?tab=delivery_notes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">New Delivery Note</h2>
            <p className="text-xs text-slate-500 leading-tight">Create a delivery note for an invoice</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Invoice & Date */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="p-0">
              <div className="h-1 w-full bg-linear-to-r from-blue-500 to-indigo-500" />
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Invoice &amp; Delivery Info</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Invoice <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="invoice_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.invoice_id ? "border-red-400" : "border-slate-200"}>
                        <SelectValue placeholder="Select invoice…" />
                      </SelectTrigger>
                      <SelectContent>
                        {invoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoice_number} — {inv.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Delivery Date <span className="text-red-500">*</span></Label>
                <Input type="date" {...register("delivery_date")} className="border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Delivery Address</Label>
                  <Input placeholder="Street address" {...register("delivery_address")} className="border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">City</Label>
                  <Input placeholder="City" {...register("delivery_city")} className="border-slate-200" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transport & Notes */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="p-0">
              <div className="h-1 w-full bg-linear-to-r from-blue-500 to-indigo-500" />
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Transport &amp; Notes</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Driver Name</Label>
                  <Input placeholder="Driver name" {...register("driver_name")} className="border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Vehicle Reg</Label>
                  <Input placeholder="KBX 123A" {...register("vehicle_reg")} className="border-slate-200" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Notes</Label>
                <Textarea placeholder="Special delivery instructions…" rows={3} {...register("notes")} className="border-slate-200 resize-none" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="p-0">
            <div className="h-1 w-full bg-linear-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Delivery Items</h3>
              <Button
                type="button"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unit: "pcs" })}
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Description</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 w-24">Qty</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 w-24">Unit</th>
                  <th className="px-2 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field, index) => (
                  <tr key={field.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Input
                        className={`h-8 text-sm border-slate-200 ${errors.items?.[index]?.description ? "border-red-400" : ""}`}
                        placeholder="Item description"
                        {...register(`items.${index}.description`)}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <Controller
                        control={control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <Input className="h-8 text-sm border-slate-200" type="number" step="0.01" min="0" value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                        )}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <Input className="h-8 text-sm border-slate-200" placeholder="pcs" {...register(`items.${index}.unit`)} />
                    </td>
                    <td className="px-2 py-2.5">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50" disabled={fields.length === 1} onClick={() => remove(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-4">
          <Button type="button" variant="outline" asChild className="border-slate-200 text-slate-600 hover:bg-slate-50">
            <Link href="/sales?tab=delivery_notes">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Delivery Note
          </Button>
        </div>
      </form>
    </div>
  );
}
