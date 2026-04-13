"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowLeft, ReceiptText, Receipt } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type InvoiceOption = { id: string; invoice_number: string; customer_name: string; total_amount: number };

const lineSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.number().min(0.01, "Required"),
  unit_price: z.number().min(0, "Required"),
  vat_rate: z.number().min(0).max(100),
});

const formSchema = z.object({
  invoice_id: z.string().min(1, "Select an invoice"),
  issue_date: z.string().min(1, "Required"),
  reason: z.string().min(1, "Reason required"),
  notes: z.string().optional(),
  items: z.array(lineSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const today = () => new Date().toISOString().split("T")[0];

export function CreditNoteBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoice = searchParams.get("invoice_id") ?? "";

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoice_id: preselectedInvoice,
      issue_date: today(),
      reason: "",
      items: [{ description: "", quantity: 1, unit_price: 0, vat_rate: 16 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const subtotal = watchedItems.reduce((s, item) => s + (item.quantity || 0) * (item.unit_price || 0), 0);
  const taxAmount = watchedItems.reduce((s, item) => {
    const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0);
    return s + lineSubtotal * ((item.vat_rate || 0) / 100);
  }, 0);
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetch("/api/invoices?limit=200&status=sent")
      .then((r) => r.json())
      .then((j) => {
        const inv1 = (j.data ?? []).map((i: any) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          customer_name: i.customer_name ?? "—",
          total_amount: i.total_amount,
        }));
        // Also fetch partial and paid invoices
        Promise.all([
          fetch("/api/invoices?limit=200&status=partial").then((r) => r.json()),
          fetch("/api/invoices?limit=200&status=paid").then((r) => r.json()),
          fetch("/api/invoices?limit=200&status=overdue").then((r) => r.json()),
        ]).then(([partial, paid, overdue]) => {
          const all = [
            ...inv1,
            ...(partial.data ?? []).map((i: any) => ({ id: i.id, invoice_number: i.invoice_number, customer_name: i.customer_name ?? "—", total_amount: i.total_amount })),
            ...(paid.data ?? []).map((i: any) => ({ id: i.id, invoice_number: i.invoice_number, customer_name: i.customer_name ?? "—", total_amount: i.total_amount })),
            ...(overdue.data ?? []).map((i: any) => ({ id: i.id, invoice_number: i.invoice_number, customer_name: i.customer_name ?? "—", total_amount: i.total_amount })),
          ];
          // Deduplicate
          const seen = new Set<string>();
          const unique = all.filter((i: InvoiceOption) => {
            if (seen.has(i.id)) return false;
            seen.add(i.id);
            return true;
          });
          setInvoices(unique);
        });
      });
  }, []);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Credit note created");
      router.push("/sales?tab=credit_notes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create credit note");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="text-slate-500 hover:text-slate-700">
          <Link href="/sales?tab=credit_notes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/25">
            <ReceiptText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">New Credit Note</h2>
            <p className="text-xs text-slate-500 leading-tight">Issue a credit note against an existing invoice</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Invoice & Reason */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="p-0">
              <div className="h-1 w-full bg-linear-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Invoice &amp; Reason</h3>
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
                            {inv.invoice_number} — {inv.customer_name} (KES {KES(inv.total_amount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.invoice_id && <p className="text-xs text-red-500">{errors.invoice_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Issue Date <span className="text-red-500">*</span></Label>
                <Input type="date" {...register("issue_date")} className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Reason <span className="text-red-500">*</span></Label>
                <Textarea placeholder="Goods returned, pricing error, etc." rows={2} {...register("reason")} className="border-slate-200 resize-none" />
                {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Notes + Summary */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="p-0">
              <div className="h-1 w-full bg-linear-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Notes &amp; Summary</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Additional Notes</Label>
                <Textarea placeholder="Optional notes…" rows={2} {...register("notes")} className="border-slate-200 resize-none" />
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">KES {KES(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT</span>
                  <span className="font-medium">KES {KES(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Credit Total</span>
                  <span className="text-amber-700">KES {KES(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="p-0">
            <div className="h-1 w-full bg-linear-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Receipt className="h-3.5 w-3.5 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-800">Credit Items</h3>
                <span className="text-xs text-slate-400">({fields.length} {fields.length === 1 ? "item" : "items"})</span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unit_price: 0, vat_rate: 16 })}
                className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Description</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 w-20">Qty</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 w-28">Unit Price</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 w-24">VAT %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 w-28">Total</th>
                    <th className="px-2 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => {
                    const qty = watchedItems[index]?.quantity || 0;
                    const price = watchedItems[index]?.unit_price || 0;
                    const vat = watchedItems[index]?.vat_rate || 0;
                    const lineTotal = qty * price * (1 + vat / 100);
                    return (
                      <tr key={field.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <Input
                            className={`h-8 text-sm border-slate-200 ${errors.items?.[index]?.description ? "border-red-400" : ""}`}
                            placeholder="Item being credited"
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
                          <Controller
                            control={control}
                            name={`items.${index}.unit_price`}
                            render={({ field }) => (
                              <Input className="h-8 text-sm border-slate-200" type="number" step="0.01" min="0" value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                            )}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <Controller
                            control={control}
                            name={`items.${index}.vat_rate`}
                            render={({ field }) => (
                              <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseFloat(v))}>
                                <SelectTrigger className="h-8 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="8">8%</SelectItem>
                                  <SelectItem value="16">16%</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">KES {KES(lineTotal)}</td>
                        <td className="px-2 py-2.5">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50" disabled={fields.length === 1} onClick={() => remove(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-4">
          <Button type="button" variant="outline" asChild className="border-slate-200 text-slate-600 hover:bg-slate-50">
            <Link href="/sales?tab=credit_notes">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Credit Note
          </Button>
        </div>
      </form>
    </div>
  );
}
