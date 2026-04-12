"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  kra_pin: string | null;
} | null;

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  notes: string | null;
  terms: string | null;
};

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-400" },
};

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer;
}

export function InvoiceDetail({ invoice, items, customer }: Props) {
  const router = useRouter();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const cfg = statusConfig[invoice.status] ?? statusConfig.draft;
  const balance = invoice.total_amount - invoice.amount_paid;

  async function recordPayment() {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_paid: invoice.amount_paid + amount }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payment recorded");
      router.refresh();
      setPaymentAmount("");
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setIsUpdating(false);
    }
  }

  async function updateStatus(newStatus: string) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{invoice.invoice_number}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button variant="outline" onClick={() => updateStatus("sent")} disabled={isUpdating}>
              Mark as Sent
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Bill To</p>
                  {customer ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold">{customer.name}</p>
                      {customer.email && <p className="text-slate-600">{customer.email}</p>}
                      {customer.phone && <p className="text-slate-600">{customer.phone}</p>}
                      {customer.address && <p className="text-slate-600">{customer.address}</p>}
                      {customer.city && <p className="text-slate-600">{customer.city}</p>}
                      {customer.kra_pin && <p className="text-slate-500 text-xs">KRA: {customer.kra_pin}</p>}
                    </div>
                  ) : <p className="text-slate-400">—</p>}
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-slate-500 text-xs">Issue Date</p>
                    <p className="font-medium">{dateStr(invoice.issue_date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Due Date</p>
                    <p className="font-medium">{dateStr(invoice.due_date)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-slate-500">
                    <th className="px-4 pb-2 pt-0">Description</th>
                    <th className="px-4 pb-2 pt-0 text-right">Qty</th>
                    <th className="px-4 pb-2 pt-0 text-right">Unit Price</th>
                    <th className="px-4 pb-2 pt-0 text-right">VAT</th>
                    <th className="px-4 pb-2 pt-0 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">KES {KES(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{item.vat_rate}%</td>
                      <td className="px-4 py-2 text-right font-medium">KES {KES(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Notes */}
          {(invoice.notes || invoice.terms) && (
            <Card>
              <CardContent className="pt-4 text-sm space-y-3">
                {invoice.notes && (
                  <div>
                    <p className="font-medium text-slate-700 mb-1">Notes</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <p className="font-medium text-slate-700 mb-1">Payment Terms</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{invoice.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Totals */}
          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>KES {KES(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT</span>
                <span>KES {KES(invoice.tax_amount)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-KES {KES(invoice.discount_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>KES {KES(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid</span>
                <span className="text-emerald-600">KES {KES(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Balance</span>
                <span className={balance > 0 ? "text-red-600" : "text-emerald-600"}>KES {KES(balance)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Record Payment */}
          {balance > 0 && invoice.status !== "cancelled" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`Max ${KES(balance)}`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={recordPayment} disabled={isUpdating}>
                  Record Payment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
