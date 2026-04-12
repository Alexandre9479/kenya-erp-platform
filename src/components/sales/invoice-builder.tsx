"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowLeft, FileText, User, CalendarDays, StickyNote, Receipt } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type CustomerOption = { id: string; name: string };
type ProductOption = { id: string; name: string; selling_price: number; vat_rate: number; unit: string; description: string | null };

const lineSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1, "Required"),
  quantity: z.number().min(0.01, "Required"),
  unit_price: z.number().min(0, "Required"),
  vat_rate: z.number().min(0).max(100),
});

const formSchema = z.object({
  customer_id: z.string().min(1, "Select a customer"),
  issue_date: z.string().min(1, "Required"),
  due_date: z.string().min(1, "Required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discount_amount: z.number().min(0).optional(),
  status: z.enum(["draft", "sent"]),
  items: z.array(lineSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const today = () => new Date().toISOString().split("T")[0];
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

export function InvoiceBuilder() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      issue_date: today(),
      due_date: addDays(30),
      status: "draft",
      discount_amount: 0,
      items: [{ description: "", quantity: 1, unit_price: 0, vat_rate: 16 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const watchedDiscount = watch("discount_amount") ?? 0;

  const subtotal = watchedItems.reduce((s, item) => s + (item.quantity || 0) * (item.unit_price || 0), 0);
  const taxAmount = watchedItems.reduce((s, item) => {
    const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0);
    return s + lineSubtotal * ((item.vat_rate || 0) / 100);
  }, 0);
  const total = subtotal + taxAmount - (watchedDiscount || 0);

  useEffect(() => {
    fetch("/api/customers?limit=200")
      .then((r) => r.json())
      .then((j) => setCustomers((j.data ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))));
    fetch("/api/products?limit=200")
      .then((r) => r.json())
      .then((j) => setProducts(j.data ?? []));
  }, []);

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setValue(`items.${index}.product_id`, product.id);
    setValue(`items.${index}.description`, product.name);
    setValue(`items.${index}.unit_price`, product.selling_price);
    setValue(`items.${index}.vat_rate`, product.vat_rate);
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Invoice created successfully");
      router.push("/sales");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="text-slate-500 hover:text-slate-700">
          <Link href="/sales"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-500/25">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">New Invoice</h2>
            <p className="text-xs text-slate-500 leading-tight">Fill in the details below and add line items</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Top cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Customer & Dates */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="p-0">
              <div className="h-1 w-full bg-linear-to-r from-emerald-500 to-green-600" />
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Customer &amp; Dates</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Customer <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="customer_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.customer_id ? "border-red-400" : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-400"}>
                        <SelectValue placeholder="Select customer…" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.customer_id && <p className="text-xs text-red-500">{errors.customer_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Issue Date <span className="text-red-500">*</span></Label>
                  <Input type="date" {...register("issue_date")} className={errors.issue_date ? "border-red-400" : "border-slate-200"} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Due Date <span className="text-red-500">*</span></Label>
                  <Input type="date" {...register("due_date")} className={errors.due_date ? "border-red-400" : "border-slate-200"} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="p-0">
              <div className="h-1 w-full bg-linear-to-r from-emerald-500 to-green-600" />
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50">
                  <StickyNote className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Notes &amp; Terms</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Notes</Label>
                <Textarea placeholder="Thank you for your business…" rows={2} {...register("notes")} className="border-slate-200 resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Payment Terms</Label>
                <Textarea placeholder="Payment due within 30 days…" rows={2} {...register("terms")} className="border-slate-200 resize-none" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="p-0">
            <div className="h-1 w-full bg-linear-to-r from-emerald-500 to-green-600" />
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
                <span className="text-xs text-slate-400">({fields.length} {fields.length === 1 ? "item" : "items"})</span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unit_price: 0, vat_rate: 16 })}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-44">Product</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500">Description</th>
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
                      <tr key={field.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <Select onValueChange={(v) => selectProduct(index, v)}>
                            <SelectTrigger className="h-8 text-xs border-slate-200">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2.5">
                          <Input
                            className={`h-8 text-sm border-slate-200 ${errors.items?.[index]?.description ? "border-red-400" : ""}`}
                            placeholder="Description"
                            {...register(`items.${index}.description`)}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <Controller
                            control={control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <Input
                                className="h-8 text-sm border-slate-200"
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <Controller
                            control={control}
                            name={`items.${index}.unit_price`}
                            render={({ field }) => (
                              <Input
                                className="h-8 text-sm border-slate-200"
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <Controller
                            control={control}
                            name={`items.${index}.vat_rate`}
                            render={({ field }) => (
                              <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseFloat(v))}>
                                <SelectTrigger className="h-8 text-xs border-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="8">8%</SelectItem>
                                  <SelectItem value="16">16%</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          KES {KES(lineTotal)}
                        </td>
                        <td className="px-2 py-2.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {errors.items?.root && (
              <p className="px-5 py-2 text-xs text-red-500">{errors.items.root.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Totals row */}
        <div className="flex flex-col items-end gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full lg:max-w-xs space-y-1.5">
            <Label className="text-slate-700">Discount (KES)</Label>
            <Controller
              control={control}
              name="discount_amount"
              render={({ field }) => (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  className="border-slate-200"
                />
              )}
            />
          </div>

          {/* Totals card */}
          <Card className="w-full lg:w-80 overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <div className="h-1 w-full bg-linear-to-r from-emerald-500 to-green-600" />
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-100">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50">
                <Receipt className="h-3 w-3 text-emerald-600" />
              </div>
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Summary</h3>
            </div>
            <CardContent className="px-5 py-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">KES {KES(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT</span>
                <span className="font-medium">KES {KES(taxAmount)}</span>
              </div>
              {(watchedDiscount || 0) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span className="font-medium">-KES {KES(watchedDiscount || 0)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base text-slate-900">
                <span>Total</span>
                <span className="text-emerald-700">KES {KES(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-4">
          <Button type="button" variant="outline" asChild className="border-slate-200 text-slate-600 hover:bg-slate-50">
            <Link href="/sales">Cancel</Link>
          </Button>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => field.onChange("draft")}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => field.onChange("sent")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create &amp; Send
                </Button>
              </>
            )}
          />
        </div>
      </form>
    </div>
  );
}
