"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, ClipboardList, Eye,
  Printer, Trash2, RefreshCw,
  CheckCircle, Clock, X,
  Truck, Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDate } from "@/lib/utils/helpers";

interface LPO {
  id: string;
  lpoNumber: string;
  status: string;
  issueDate: string;
  deliveryDate?: string;
  total: string;
  supplierName?: string;
  supplierEmail?: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600", icon: ClipboardList },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: X },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600", icon: X },
};

export default function PurchasingPage() {
  const [lpos, setLpos] = useState<LPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"lpos" | "suppliers">("lpos");
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const fetchLpos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchasing/lpos");
      const data = await res.json();
      if (data.success) setLpos(data.data);
    } catch {
      toast.error("Failed to load LPOs");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/purchasing/suppliers");
      const data = await res.json();
      if (data.success) setSuppliers(data.data);
    } catch {
      toast.error("Failed to load suppliers");
    }
  }, []);

  useEffect(() => {
    fetchLpos();
    fetchSuppliers();
  }, [fetchLpos, fetchSuppliers]);

  const handleDeleteLpo = async (id: string) => {
    if (!confirm("Cancel this LPO?")) return;
    try {
      const res = await fetch(`/api/purchasing/lpos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("LPO cancelled"); fetchLpos(); }
    } catch { toast.error("Failed to cancel LPO"); }
  };

  const filtered = lpos.filter(l => {
    const matchSearch = !search ||
      l.lpoNumber.toLowerCase().includes(search.toLowerCase()) ||
      l.supplierName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: lpos.length,
    approved: lpos.filter(l => l.status === "approved").length,
    pending: lpos.filter(l => ["draft", "sent"].includes(l.status)).length,
    totalValue: lpos.reduce((sum, l) => sum + Number(l.total), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchasing & Procurement</h2>
          <p className="text-slate-500 text-sm mt-1">Manage LPOs, GRNs and suppliers</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => { fetchLpos(); fetchSuppliers(); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/purchasing/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-500/25">
            <Plus className="w-4 h-4" />
            New LPO
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total LPOs", value: stats.total, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Total Suppliers", value: suppliers.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
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

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "lpos", label: "LPOs", icon: ClipboardList },
          { key: "suppliers", label: "Suppliers", icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "lpos" | "suppliers")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "lpos" ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by LPO number or supplier..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* LPOs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["LPO Number", "Supplier", "Issue Date", "Delivery Date", "Total", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <ClipboardList className="w-8 h-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">No LPOs found</p>
                            <p className="text-sm text-slate-500">Create your first purchase order</p>
                          </div>
                          <Link href="/purchasing/new"
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold">
                            <Plus className="w-4 h-4" /> New LPO
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((lpo) => {
                      const status = statusConfig[lpo.status] || statusConfig.draft;
                      const StatusIcon = status.icon;
                      return (
                        <tr key={lpo.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                <ClipboardList className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="font-mono font-semibold text-slate-900 text-sm">{lpo.lpoNumber}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 text-sm">{lpo.supplierName}</p>
                            {lpo.supplierEmail && <p className="text-xs text-slate-400">{lpo.supplierEmail}</p>}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(lpo.issueDate)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {lpo.deliveryDate ? formatDate(lpo.deliveryDate) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 text-sm">
                              KSh {Number(lpo.total).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", status.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Link href={`/purchasing/${lpo.id}/print`}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors">
                                <Printer className="w-4 h-4" />
                              </Link>
                              <button onClick={() => handleDeleteLpo(lpo.id)}
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
        </>
      ) : (
        /* Suppliers Tab */
        <SuppliersList suppliers={suppliers} onRefresh={fetchSuppliers} />
      )}
    </div>
  );
}

function SuppliersList({ suppliers, onRefresh }: { suppliers: any[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await fetch(`/api/purchasing/suppliers/${id}`, { method: "DELETE" });
      toast.success("Supplier deleted");
      onRefresh();
    } catch { toast.error("Failed to delete supplier"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search suppliers..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button onClick={() => { setSelected(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((supplier) => (
          <div key={supplier.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {supplier.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{supplier.name}</p>
                  <p className="text-xs text-slate-500">{supplier.city || supplier.country || "Kenya"}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSelected(supplier); setShowModal(true); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                  <Truck className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(supplier.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-slate-600">
              {supplier.phone && <p>📞 {supplier.phone}</p>}
              {supplier.email && <p>✉️ {supplier.email}</p>}
              {supplier.kraPin && <p className="text-xs text-slate-400">KRA: {supplier.kraPin}</p>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">No suppliers yet</p>
            <p className="text-sm text-slate-500">Add your first supplier</p>
          </div>
        )}
      </div>

      {showModal && (
        <SupplierModal
          open={showModal}
          supplier={selected}
          onClose={() => setShowModal(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

function SupplierModal({ open, supplier, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: supplier?.name || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    city: supplier?.city || "",
    country: supplier?.country || "Kenya",
    kraPin: supplier?.kraPin || "",
    paymentTerms: supplier?.paymentTerms || "30",
    notes: supplier?.notes || "",
  });

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Supplier name is required"); return; }
    setLoading(true);
    try {
      const url = supplier ? `/api/purchasing/suppliers/${supplier.id}` : "/api/purchasing/suppliers";
      const method = supplier ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(supplier ? "Supplier updated!" : "Supplier added!");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to save supplier");
      }
    } catch { toast.error("Failed to save supplier"); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{supplier ? "Edit Supplier" : "Add Supplier"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          {[
            { label: "Supplier Name *", key: "name", placeholder: "e.g. Bidco Industries Ltd" },
            { label: "Email", key: "email", placeholder: "supplier@company.com" },
            { label: "Phone", key: "phone", placeholder: "+254 700 000 000" },
            { label: "Address", key: "address", placeholder: "Street address" },
            { label: "City", key: "city", placeholder: "Nairobi" },
            { label: "KRA PIN", key: "kraPin", placeholder: "A123456789Z" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{field.label}</label>
              <input
                value={(form as any)[field.key]}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Payment Terms</label>
            <select
              value={form.paymentTerms}
              onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="0">Due on Receipt</option>
              <option value="7">Net 7 days</option>
              <option value="14">Net 14 days</option>
              <option value="30">Net 30 days</option>
              <option value="60">Net 60 days</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-xl transition-colors flex items-center gap-2">
            {loading && <Clock className="w-4 h-4 animate-spin" />}
            {supplier ? "Update" : "Add Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}