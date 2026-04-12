"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Printer, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type POItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
};

type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  kra_pin: string | null;
} | null;

type PurchaseOrder = {
  id: string;
  lpo_number: string;
  issue_date: string;
  expected_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  terms: string | null;
};

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

const statusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-600" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  received:  { label: "Received",  className: "bg-emerald-100 text-emerald-700" },
  partial:   { label: "Partial",   className: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-400" },
};

interface Props {
  po: PurchaseOrder;
  items: POItem[];
  supplier: Supplier;
  tenantName?: string;
}

export function LPODetail({ po, items, supplier, tenantName }: Props) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const cfg = statusConfig[po.status] ?? statusConfig.draft;

  async function updateStatus(newStatus: string) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
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
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #lpo-printable, #lpo-printable * { visibility: visible !important; }
          #lpo-printable { position: fixed; inset: 0; padding: 32px; background: white; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/purchasing"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{po.lpo_number}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {po.status === "draft" && (
              <Button variant="outline" onClick={() => updateStatus("sent")} disabled={isUpdating}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Approve & Send
              </Button>
            )}
            {po.status === "sent" && (
              <Button variant="outline" onClick={() => updateStatus("received")} disabled={isUpdating}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Mark Received
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

        {/* Printable document */}
        <div id="lpo-printable">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">

              {/* Print header */}
              <div className="hidden print:block mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">LOCAL PURCHASE ORDER</h1>
                    <p className="text-slate-500 text-sm mt-1">{tenantName ?? "Kenya ERP"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{po.lpo_number}</p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mt-1 ${cfg.className}`}>{cfg.label}</span>
                  </div>
                </div>
                <div className="mt-4 border-t-2 border-emerald-600" />
              </div>

              {/* PO Info */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1 font-medium text-xs uppercase tracking-wider">Supplier</p>
                      {supplier ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{supplier.name}</p>
                          {supplier.email && <p className="text-slate-600">{supplier.email}</p>}
                          {supplier.phone && <p className="text-slate-600">{supplier.phone}</p>}
                          {supplier.address && <p className="text-slate-600">{supplier.address}</p>}
                          {supplier.city && <p className="text-slate-600">{supplier.city}</p>}
                          {supplier.kra_pin && <p className="text-slate-500 text-xs mt-1 font-medium">KRA PIN: {supplier.kra_pin}</p>}
                        </div>
                      ) : <p className="text-slate-400">—</p>}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">LPO #</p>
                        <p className="font-bold text-slate-900">{po.lpo_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Issue Date</p>
                        <p className="font-medium">{dateStr(po.issue_date)}</p>
                      </div>
                      {po.expected_date && (
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Expected Delivery</p>
                          <p className="font-medium">{dateStr(po.expected_date)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Items Ordered</CardTitle></CardHeader>
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
              {(po.notes || po.terms) && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-4 text-sm space-y-3">
                    {po.notes && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Notes</p>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{po.notes}</p>
                      </div>
                    )}
                    {po.terms && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Terms & Conditions</p>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{po.terms}</p>
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
                    <span className="font-medium">KES {KES(po.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT</span>
                    <span className="font-medium">KES {KES(po.tax_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-extrabold text-base">
                    <span>Total</span>
                    <span>KES {KES(po.total_amount)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Authorisation block (print only) */}
              <div className="hidden print:block border border-slate-300 rounded-lg p-4 text-sm">
                <p className="font-semibold text-slate-700 mb-4">Authorisation</p>
                <div className="space-y-4">
                  <div>
                    <div className="h-px bg-slate-300 mb-1" />
                    <p className="text-xs text-slate-500">Prepared by</p>
                  </div>
                  <div>
                    <div className="h-px bg-slate-300 mb-1" />
                    <p className="text-xs text-slate-500">Approved by</p>
                  </div>
                  <div>
                    <div className="h-px bg-slate-300 mb-1" />
                    <p className="text-xs text-slate-500">Supplier acknowledgement</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
