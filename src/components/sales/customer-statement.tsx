"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  notes: string | null;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  kra_pin: string | null;
  current_balance: number;
};

type Tenant = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  kra_pin: string | null;
  logo_url: string | null;
};

type Summary = {
  totalInvoiced: number;
  totalPaid: number;
  totalBalance: number;
  invoiceCount: number;
};

const KES = (v: number) =>
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const dateStr = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

const thisYear = new Date().getFullYear();

export function CustomerStatement({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(`${thisYear}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchStatement() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`/api/customers/${customerId}/statement?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCustomer(json.customer);
      setTenant(json.tenant);
      setInvoices(json.invoices);
      setSummary(json.summary);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load statement");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchStatement();
  }, []);

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    sent: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
  };

  // Running balance calculation
  let runningBalance = 0;
  const rows = invoices.map((inv) => {
    const balance = inv.total_amount - inv.amount_paid;
    runningBalance += balance;
    return { ...inv, balance, runningBalance };
  });

  return (
    <div className="space-y-4">
      {/* ── Toolbar (no-print) ─────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #statement-printable, #statement-printable * { visibility: visible !important; }
          #statement-printable { position: fixed; inset: 0; padding: 24px; background: white; overflow: auto; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-slate-600">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />Print
          </Button>
        </div>
      </div>

      {/* ── Date range filter (no-print) ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 items-end no-print">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
        </div>
        <Button onClick={fetchStatement} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <Calendar className="h-4 w-4" />
          Generate
        </Button>
      </div>

      {/* ── Statement Document ─────────────────────────────────────────── */}
      <div id="statement-printable" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : !customer ? (
          <div className="p-8 text-center text-slate-500">Customer not found</div>
        ) : (
          <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                {tenant?.logo_url && (
                  <div className="relative w-16 h-16 mb-3">
                    <Image src={tenant.logo_url} alt="Logo" fill className="object-contain" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-slate-900">{tenant?.name ?? "Company"}</h2>
                {tenant?.address && <p className="text-sm text-slate-500">{tenant.address}</p>}
                {tenant?.city && <p className="text-sm text-slate-500">{tenant.city}</p>}
                {tenant?.phone && <p className="text-sm text-slate-500">Tel: {tenant.phone}</p>}
                {tenant?.email && <p className="text-sm text-slate-500">{tenant.email}</p>}
                {tenant?.kra_pin && <p className="text-sm text-slate-500">KRA PIN: {tenant.kra_pin}</p>}
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-emerald-700 uppercase tracking-wide">Statement</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {dateStr(fromDate)} — {dateStr(toDate)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Generated: {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Statement To</p>
              <p className="font-bold text-slate-900">{customer.name}</p>
              {customer.address && <p className="text-sm text-slate-600">{customer.address}</p>}
              {customer.city && <p className="text-sm text-slate-600">{customer.city}</p>}
              {customer.phone && <p className="text-sm text-slate-600">Tel: {customer.phone}</p>}
              {customer.email && <p className="text-sm text-slate-600">{customer.email}</p>}
              {customer.kra_pin && <p className="text-sm text-slate-600">KRA PIN: {customer.kra_pin}</p>}
            </div>

            {/* Invoice table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left py-2 font-semibold text-slate-700">Date</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Invoice #</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Due Date</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Status</th>
                    <th className="text-right py-2 font-semibold text-slate-700">Invoiced</th>
                    <th className="text-right py-2 font-semibold text-slate-700">Paid</th>
                    <th className="text-right py-2 font-semibold text-slate-700">Balance</th>
                    <th className="text-right py-2 font-semibold text-slate-700">Running Bal.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No invoices found for this period
                      </td>
                    </tr>
                  ) : (
                    rows.map((inv, idx) => (
                      <tr key={inv.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                        <td className="py-2 text-slate-600">{dateStr(inv.issue_date)}</td>
                        <td className="py-2 font-medium text-slate-900">{inv.invoice_number}</td>
                        <td className="py-2 text-slate-600">{dateStr(inv.due_date)}</td>
                        <td className="py-2">
                          <span className={`text-xs font-semibold ${
                            inv.status === "paid" ? "text-emerald-700" :
                            inv.status === "overdue" ? "text-red-600" :
                            inv.status === "partial" ? "text-amber-600" :
                            "text-slate-600"
                          }`}>
                            {statusLabel[inv.status] ?? inv.status}
                          </span>
                        </td>
                        <td className="py-2 text-right text-slate-900">{KES(inv.total_amount)}</td>
                        <td className="py-2 text-right text-emerald-600">{KES(inv.amount_paid)}</td>
                        <td className={`py-2 text-right font-medium ${inv.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {KES(inv.balance)}
                        </td>
                        <td className={`py-2 text-right font-semibold ${inv.runningBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {KES(inv.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {summary && rows.length > 0 && (
              <div className="flex justify-end">
                <div className="w-80 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Total Invoiced</span>
                    <span className="text-sm font-semibold text-slate-900">KES {KES(summary.totalInvoiced)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Total Paid</span>
                    <span className="text-sm font-semibold text-emerald-600">KES {KES(summary.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-slate-900">
                    <span className="text-sm font-semibold text-white">Balance Due</span>
                    <span className="text-sm font-bold text-white">KES {KES(summary.totalBalance)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 text-xs text-slate-400 text-center space-y-1">
              <p>This is a computer-generated statement and does not require a signature.</p>
              <p>For queries, contact {tenant?.email ?? "us"} or call {tenant?.phone ?? ""}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
