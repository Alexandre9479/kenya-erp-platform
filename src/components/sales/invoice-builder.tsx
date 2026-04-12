"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Calculated totals
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sales"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h2 className="text-lg font-semibold text-slate-900">New Invoice</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer & Dates</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Controller
                  control={control}
                  name="customer_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.customer_id ? "border-destructive" : ""}>
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
                {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Issue Date *</Label>
                  <Input type="date" {...register("issue_date")} className={errors.issue_date ? "border-destructive" : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date *</Label>
                  <Input type="date" {...register("due_date")} className={errors.due_date ? "border-destructive" : ""} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Notes & Terms</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Thank you for your business…" rows={2} {...register("notes")} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Terms</Label>
                <Textarea placeholder="Payment due within 30 days…" rows={2} {...register("terms")} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unit_price: 0, vat_rate: 16 })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-slate-500">
                    <th className="pb-2 pr-3 w-48">Product</th>
                    <th className="pb-2 pr-3">Description *</th>
                    <th className="pb-2 pr-3 w-20">Qty *</th>
                    <th className="pb-2 pr-3 w-28">Unit Price *</th>
                    <th className="pb-2 pr-3 w-24">VAT %</th>
                    <th className="pb-2 pr-3 w-28 text-right">Total</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fields.map((field, index) => {
                    const qty = watchedItems[index]?.quantity || 0;
                    const price = watchedItems[index]?.unit_price || 0;
                    const vat = watchedItems[index]?.vat_rate || 0;
                    const lineTotal = qty * price * (1 + vat / 100);
                    return (
                      <tr key={field.id} className="py-2">
                        <td className="py-2 pr-3">
                          <Select onValueChange={(v) => selectProduct(index, v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            className={`h-8 text-sm ${errors.items?.[index]?.description ? "border-destructive" : ""}`}
                            placeholder="Description"
                            {...register(`items.${index}.description`)}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Controller
                            control={control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Controller
                            control={control}
                            name={`items.${index}.unit_price`}
                            render={({ field }) => (
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Controller
                            control={control}
                            name={`items.${index}.vat_rate`}
                            render={({ field }) => (
                              <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseFloat(v))}>
                                <SelectTrigger className="h-8 text-xs">
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
                        <td className="py-2 pr-3 text-right font-medium">
                          KES {KES(lineTotal)}
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-500"
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
              <p className="mt-2 text-xs text-destructive">{errors.items.root.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <div className="flex flex-col items-end gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full lg:max-w-xs space-y-3">
            <div className="space-y-1.5">
              <Label>Discount (KES)</Label>
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
                  />
                )}
              />
            </div>
          </div>

          <Card className="w-full lg:w-72">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>KES {KES(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT</span>
                <span>KES {KES(taxAmount)}</span>
              </div>
              {(watchedDiscount || 0) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-KES {KES(watchedDiscount || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>KES {KES(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
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
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => field.onChange("sent")}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create & Send
                </Button>
              </>
            )}
          />
        </div>
      </form>
    </div>
  );
}
