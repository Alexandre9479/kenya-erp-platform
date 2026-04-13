"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, Truck, CheckCircle2, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

type DNItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
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

type DeliveryNote = {
  id: string;
  delivery_note_number: string;
  invoice_id: string;
  delivery_date: string;
  status: string;
  delivery_address: string | null;
  delivery_city: string | null;
  driver_name: string | null;
  vehicle_reg: string | null;
  notes: string | null;
  received_by: string | null;
  received_at: string | null;
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

const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending",    className: "bg-amber-100 text-amber-700" },
  dispatched:  { label: "Dispatched", className: "bg-blue-100 text-blue-700" },
  delivered:   { label: "Delivered",  className: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Cancelled",  className: "bg-slate-100 text-slate-400" },
};

interface Props {
  deliveryNote: DeliveryNote;
  items: DNItem[];
  customer: Customer;
  invoiceNumber: string;
  tenant?: TenantInfo;
}

export function DeliveryNoteDetail({ deliveryNote, items, customer, invoiceNumber, tenant }: Props) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [receivedBy, setReceivedBy] = useState("");

  const cfg = statusConfig[deliveryNote.status] ?? statusConfig.pending;

  async function updateStatus(newStatus: string, extra: Record<string, string> = {}) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/delivery-notes/${deliveryNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
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
          #dn-printable, #dn-printable * { visibility: visible !important; }
          #dn-printable { position: fixed; inset: 0; padding: 32px; background: white; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/sales?tab=delivery_notes"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{deliveryNote.delivery_note_number}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {deliveryNote.status === "pending" && (
              <Button variant="outline" onClick={() => updateStatus("dispatched")} disabled={isUpdating}>
                <Truck className="h-4 w-4 mr-2" />Mark Dispatched
              </Button>
            )}
            {deliveryNote.status === "dispatched" && (
              <Button variant="outline" onClick={() => updateStatus("delivered", { received_by: receivedBy || "—" })} disabled={isUpdating} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 mr-2" />Mark Delivered
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
        <div id="dn-printable">
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
                    <h1 className="text-2xl font-extrabold text-blue-700 uppercase tracking-wide">Delivery Note</h1>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{deliveryNote.delivery_note_number}</p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mt-1 ${cfg.className}`}>{cfg.label}</span>
                  </div>
                </div>
                <div className="mt-4 border-t-2 border-blue-600" />
              </div>

              {/* DN Info */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1 font-medium text-xs uppercase tracking-wider">Deliver To</p>
                      {customer ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{customer.name}</p>
                          {(deliveryNote.delivery_address || customer.address) && (
                            <p className="text-slate-600">{deliveryNote.delivery_address || customer.address}</p>
                          )}
                          {(deliveryNote.delivery_city || customer.city) && (
                            <p className="text-slate-600">{deliveryNote.delivery_city || customer.city}</p>
                          )}
                          {customer.phone && <p className="text-slate-600">Tel: {customer.phone}</p>}
                        </div>
                      ) : <p className="text-slate-400">—</p>}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">DN #</p>
                        <p className="font-bold text-slate-900">{deliveryNote.delivery_note_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Invoice Ref</p>
                        <Link href={`/sales/${deliveryNote.invoice_id}`} className="font-medium text-emerald-600 hover:underline print:text-slate-900 print:no-underline">
                          {invoiceNumber}
                        </Link>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Delivery Date</p>
                        <p className="font-medium">{dateStr(deliveryNote.delivery_date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transport details */}
                  {(deliveryNote.driver_name || deliveryNote.vehicle_reg) && (
                    <>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {deliveryNote.driver_name && (
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Driver</p>
                            <p className="font-medium text-slate-900">{deliveryNote.driver_name}</p>
                          </div>
                        )}
                        {deliveryNote.vehicle_reg && (
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-0.5">Vehicle Reg</p>
                            <p className="font-medium text-slate-900">{deliveryNote.vehicle_reg}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Items */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Items for Delivery</CardTitle></CardHeader>
                <CardContent className="p-0 mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2 w-10">#</th>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Notes */}
              {deliveryNote.notes && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-4 text-sm">
                    <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Delivery Notes</p>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{deliveryNote.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Signature block (shown in print) */}
              <div className="hidden print:block mt-12">
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-8">Dispatched By</p>
                    <div className="border-b border-slate-300 mb-1" />
                    <p className="text-xs text-slate-400">Signature &amp; Date</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-8">Received By</p>
                    <div className="border-b border-slate-300 mb-1" />
                    <p className="text-xs text-slate-400">Signature, Name &amp; Date</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Status</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Qty</span>
                    <span className="font-medium">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                  </div>
                  {deliveryNote.received_by && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-slate-500">Received By</span>
                        <span className="font-medium text-emerald-700">{deliveryNote.received_by}</span>
                      </div>
                      {deliveryNote.received_at && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Received At</span>
                          <span className="font-medium">{dateStr(deliveryNote.received_at)}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Received By input — when dispatched */}
              {deliveryNote.status === "dispatched" && (
                <Card className="border-0 shadow-sm no-print">
                  <CardHeader className="pb-0"><CardTitle className="text-base font-bold text-slate-900">Confirm Delivery</CardTitle></CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Received By</Label>
                      <Input
                        placeholder="Name of person who received goods"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <Button
                      className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 text-white font-semibold"
                      onClick={() => updateStatus("delivered", { received_by: receivedBy || "—" })}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />Mark as Delivered
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Print footer */}
              <div className="hidden print:block border-t border-slate-200 pt-3 mt-6 text-center">
                <p className="text-xs text-slate-400">This is a computer-generated delivery note.</p>
                {tenant?.email && <p className="text-xs text-slate-400">For queries, contact {tenant.email}{tenant?.phone ? ` or call ${tenant.phone}` : ""}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
