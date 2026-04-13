"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, CheckCircle2, ArrowRightLeft, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

type QuoteItem = {
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

type Quote = {
  id: string;
  quote_number: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  terms: string | null;
  converted_invoice_id: string | null;
};

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

const statusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-600" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  accepted:  { label: "Accepted",  className: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700" },
  expired:   { label: "Expired",   className: "bg-slate-100 text-slate-400" },
  converted: { label: "Converted", className: "bg-indigo-100 text-indigo-700" },
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
  quote: Quote;
  items: QuoteItem[];
  customer: Customer;
  tenant?: TenantInfo;
}

export function QuoteDetail({ quote, items, customer, tenant }: Props) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const cfg = statusConfig[quote.status] ?? statusConfig.draft;

  async function updateStatus(newStatus: string) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
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

  async function convertToInvoice() {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(json.message ?? "Converted to invoice");
      router.push(`/sales/${json.data.invoice_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #quote-printable, #quote-printable * { visibility: visible !important; }
          #quote-printable { position: fixed; inset: 0; padding: 32px; background: white; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Page header (hidden on print) */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/sales?tab=quotes"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{quote.quote_number}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {quote.status === "draft" && (
              <Button variant="outline" onClick={() => updateStatus("sent")} disabled={isUpdating}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Mark as Sent
              </Button>
            )}
            {(quote.status === "sent" || quote.status === "draft") && (
              <Button variant="outline" onClick={() => updateStatus("accepted")} disabled={isUpdating} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 mr-2" />Accept
              </Button>
            )}
            {(quote.status === "sent" || quote.status === "draft") && (
              <Button variant="outline" onClick={() => updateStatus("rejected")} disabled={isUpdating} className="border-red-200 text-red-600 hover:bg-red-50">
                <X className="h-4 w-4 mr-2" />Reject
              </Button>
            )}
            {quote.status !== "converted" && quote.status !== "rejected" && quote.status !== "expired" && (
              <Button onClick={convertToInvoice} disabled={isUpdating} className="gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 text-white">
                <ArrowRightLeft className="h-4 w-4" />Convert to Invoice
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button size="sm" onClick={() => window.print()} className="gap-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 text-white">
              <Download className="h-4 w-4" />Export PDF
            </Button>
          </div>
        </div>

        {/* Converted banner */}
        {quote.status === "converted" && quote.converted_invoice_id && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 flex items-center justify-between no-print">
            <p className="text-sm text-indigo-700 font-medium">This quote has been converted to an invoice.</p>
            <Button asChild variant="outline" size="sm" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
              <Link href={`/sales/${quote.converted_invoice_id}`}>View Invoice</Link>
            </Button>
          </div>
        )}

        {/* Printable quotation document */}
        <div id="quote-printable">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">

              {/* Print header */}
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
                    <h1 className="text-2xl font-extrabold text-emerald-700 uppercase tracking-wide">Quotation</h1>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{quote.quote_number}</p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mt-1 ${cfg.className}`}>{cfg.label}</span>
                  </div>
                </div>
                <div className="mt-4 border-t-2 border-emerald-600" />
              </div>

              {/* Quote Info */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1 font-medium text-xs uppercase tracking-wider">Prepared For</p>
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
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Quote #</p>
                        <p className="font-bold text-slate-900">{quote.quote_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Issue Date</p>
                        <p className="font-medium">{dateStr(quote.issue_date)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Valid Until</p>
                        <p className={`font-medium ${new Date(quote.expiry_date) < new Date() ? "text-red-600" : ""}`}>{dateStr(quote.expiry_date)}</p>
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
              {(quote.notes || quote.terms) && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-4 text-sm space-y-3">
                    {quote.notes && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Notes</p>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
                      </div>
                    )}
                    {quote.terms && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Terms &amp; Conditions</p>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{quote.terms}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">KES {KES(quote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT</span>
                    <span className="font-medium">KES {KES(quote.tax_amount)}</span>
                  </div>
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>-KES {KES(quote.discount_amount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-extrabold text-base">
                    <span>Total</span>
                    <span>KES {KES(quote.total_amount)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Print footer */}
              <div className="hidden print:block border-t border-slate-200 pt-3 mt-6 text-center">
                <p className="text-xs text-slate-400">This is a computer-generated quotation and does not require a signature.</p>
                {tenant?.email && <p className="text-xs text-slate-400">For queries, contact {tenant.email}{tenant?.phone ? ` or call ${tenant.phone}` : ""}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
