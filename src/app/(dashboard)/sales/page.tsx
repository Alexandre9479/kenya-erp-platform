"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, FileText, Eye,
  Printer, Trash2, RefreshCw,
  CheckCircle, Clock, AlertCircle,
  DollarSign, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDate } from "@/lib/utils/helpers";
import PaymentModal from "@/components/sales/PaymentModal";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate?: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  partial: { label: "Partial", color: "bg-yellow-100 text-yellow-700", icon: DollarSign },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600", icon: Trash2 },
};

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stats, setStats] = useState({
    total: 0, paid: 0, pending: 0, overdue: 0,
    totalRevenue: 0, totalPending: 0,
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/invoices");
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
        const total = data.data.length;
        const paid = data.data.filter((i: Invoice) => i.status === "paid").length;
        const pending = data.data.filter((i: Invoice) =>
          ["draft", "sent", "partial"].includes(i.status)
        ).length;
        const overdue = data.data.filter((i: Invoice) => i.status === "overdue").length;
        const totalRevenue = data.data
          .filter((i: Invoice) => i.status === "paid")
          .reduce((sum: number, i: Invoice) => sum + Number(i.total), 0);
        const totalPending = data.data
          .filter((i: Invoice) => ["sent", "partial", "overdue"].includes(i.status))
          .reduce((sum: number, i: Invoice) => sum + Number(i.amountDue), 0);
        setStats({ total, paid, pending, overdue, totalRevenue, totalPending });
      }
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    const matchSearch = !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this invoice?")) return;
    try {
      const res = await fetch(`/api/sales/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Invoice cancelled");
        fetchInvoices();
      }
    } catch {
      toast.error("Failed to cancel invoice");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales & Invoicing</h2>
          <p className="text-slate-500 text-sm mt-1">Manage invoices, quotes and payments</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchInvoices}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/sales/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: stats.total, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Paid", value: stats.paid, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-linear-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="font-medium opacity-90">Total Revenue Collected</p>
          </div>
          <p className="text-3xl font-bold">
            KSh {stats.totalRevenue.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <p className="font-medium opacity-90">Outstanding Balance</p>
          </div>
          <p className="text-3xl font-bold">
            KSh {stats.totalPending.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number or customer..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">No invoices found</p>
                        <p className="text-sm text-slate-500">Create your first invoice to get started</p>
                      </div>
                      <Link href="/sales/new"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
                        <Plus className="w-4 h-4" /> New Invoice
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((invoice) => {
                  const status = statusConfig[invoice.status] || statusConfig.draft;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-mono font-semibold text-slate-900 text-sm">
                            {invoice.invoiceNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{invoice.customerName}</p>
                          {invoice.customerEmail && (
                            <p className="text-xs text-slate-400">{invoice.customerEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-slate-900 text-sm">
                          KSh {Number(invoice.total).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "font-semibold text-sm",
                          Number(invoice.amountDue) > 0 ? "text-red-600" : "text-green-600"
                        )}>
                          KSh {Number(invoice.amountDue).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", status.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Payment Button Add-in */}
                          {["sent", "partial", "overdue"].includes(invoice.status) && (
                            <button
                              onClick={() => {
                                setPaymentInvoice(invoice);
                                setShowPaymentModal(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
                              title="Record Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <Link href={`/sales/${invoice.id}`}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/sales/${invoice.id}/print`}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors">
                            <Printer className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(invoice.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
       <PaymentModal
        open={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setPaymentInvoice(null); }}
        onSuccess={fetchInvoices}
        invoice={paymentInvoice}
      />
    </div>
  );
}