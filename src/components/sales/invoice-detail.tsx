"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, CheckCircle2, ReceiptText, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

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
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-600" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  partial:   { label: "Partial",   className: "bg-amber-100 text-amber-700" },
  paid:      { label: "Paid",      className: "bg-emerald-100 text-emerald-700" },
  overdue:   { label: "Overdue",   className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-400" },
};

type TenantInfo = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  kra_pin: string | null;
  logo_url: string | null;
};

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer;
  tenant?: TenantInfo;
}

export function InvoiceDetail({ invoice, items, customer, tenant }: Props) {
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
    <>
      {/* ── Print styles injected inline ─────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-printable, #invoice-printable * { visibility: visible !important; }
          #invoice-printable { position: fixed; inset: 0; padding: 32px; background: white; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* ── Page header (hidden on print) ──────────────────────────── */}
        <div className="flex items-center justify-between no-print">
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
                <CheckCircle2 className="h-4 w-4 mr-2" />Mark as Sent
              </Button>
            )}
            {invoice.status !== "draft" && invoice.status !== "cancelled" && (
              <>
                <Button variant="outline" size="sm" asChild className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Link href={`/sales/delivery-note/new?invoice_id=${invoice.id}`}>
                    <Truck className="h-4 w-4" />Delivery Note
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
                  <Link href={`/sales/credit-note/new?invoice_id=${invoice.id}`}>
                    <ReceiptText className="h-4 w-4" />Credit Note
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button size="sm" onClick={() => window.print()} className="gap-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 text-white">
              <Download className="h-4 w-4" />Export PDF
            </Button>
          </div>
        </div>

        {/* ── Printable invoice document ─────────────────────────────── */}
        <div id="invoice-printable">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">

              {/* Invoice header — shown only in print, with company logo & details */}
              <div className="hidden print:block mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    {tenant?.logo_url && (
                      <div className="relative w-14 h-14 mb-2">
                        <Image src={tenant.logo_url} alt="Logo" fill className="object-contain" />
                      </div>
                    )}
                    <h2 className="text-lg font-bold text-slate-900">{tenant?.name ?? "Company"}</h2>
                    {tenant?.address && <p className="text-xs text-slate-500">{tenant.address}</p>}
                    {tenant?.city && <p className="text-xs text-slate-500">{tenant.city}</p>}
                    {tenant?.phone && <p className="text-xs text-slate-500">Tel: {tenant.phone}</p>}
                    {tenant?.email && <p className="text-xs text-slate-500">{tenant.email}</p>}
                    {tenant?.kra_pin && <p className="text-xs text-slate-500">KRA PIN: {tenant.kra_pin}</p>}
                  </div>
                  <div className="text-right">
                    <h1 className="text-2xl font-extrabold text-indigo-700 uppercase tracking-wide">Invoice</h1>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{invoice.invoice_number}</p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mt-1 ${cfg.className}`}>{cfg.label}</span>
                  </div>
                </div>
                <div className="mt-4 border-t-2 border-indigo-600" />
              </div>

              {/* Invoice Info */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1 font-medium text-xs uppercase tracking-wider">Bill To</p>
                      {customer ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{customer.name}</p>
                          {customer.email && <p className="text-slate-600">{customer.email}</p>}
                          {customer.phone && <p className="text-slate-600">{customer.phone}</p>}
                          {customer.address && <p className="text-slate-600">{customer.address}</p>}
                          {customer.city && <p className="text-slate-600">{customer.city}</p>}
                          {customer.kra_pin && <p className="text-slate-500 text-xs mt-1 font-medium">KRA PIN: {customer.kra_pin}</p>}
                        </div>
                      ) : <p className="text-slate-400">—</p>}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Invoice #</p>
                        <p className="font-bold text-slate-900">{invoice.invoice_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Issue Date</p>
                        <p className="font-medium">{dateStr(invoice.issue_date)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Due Date</p>
                        <p className={`font-medium ${invoice.status === "overdue" ? "text-red-600" : ""}`}>{dateStr(invoice.due_date)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Line Items</CardTitle></CardHeader>
                <CardContent className="p-0 mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Unit Price</th>
                        <th className="px-4 py-2 text-right">VAT %</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">KES {KES(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{item.vat_rate}%</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">KES {KES(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Notes */}
              {(invoice.notes || invoice.terms) && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-4 text-sm space-y-3">
                    {invoice.notes && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Notes</p>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Payment Terms</p>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{invoice.terms}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Sidebar ──────────────────────────────────────────── */}
            <div className="space-y-4">
              {/* Totals */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">KES {KES(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT</span>
                    <span className="font-medium">KES {KES(invoice.tax_amount)}</span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>-KES {KES(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-extrabold text-base">
                    <span>Total</span>
                    <span>KES {KES(invoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paid</span>
                    <span className="text-emerald-600 font-semibold">KES {KES(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due</span>
                    <span className={balance > 0 ? "text-red-600" : "text-emerald-600"}>KES {KES(balance)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Record Payment — hidden on print */}
              {balance > 0 && invoice.status !== "cancelled" && (
                <Card className="border-0 shadow-sm no-print">
                  <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Record Payment</CardTitle></CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount (KES)</Label>
                      <Input
                        type="number" min="0" step="0.01"
                        placeholder={`Max ${KES(balance)}`}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <Button
                      className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 text-white font-semibold"
                      onClick={recordPayment}
                      disabled={isUpdating}
                    >
                      Record Payment
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Print watermark — shown only when printing */}
              {invoice.status === "paid" && (
                <div className="hidden print:flex items-center justify-center">
                  <div className="border-4 border-emerald-500 text-emerald-500 rounded-xl px-6 py-3 rotate-[-15deg] text-2xl font-black tracking-widest opacity-70">
                    PAID
                  </div>
                </div>
              )}
              {/* Print footer */}
              <div className="hidden print:block border-t border-slate-200 pt-3 mt-6 text-center">
                <p className="text-xs text-slate-400">This is a computer-generated invoice and does not require a signature.</p>
                {tenant?.email && <p className="text-xs text-slate-400">For queries, contact {tenant.email}{tenant?.phone ? ` or call ${tenant.phone}` : ""}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
