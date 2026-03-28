"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, Users, Phone,
  Mail, MapPin, Edit, Trash2,
  RefreshCw, Building2, User, Landmark,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CustomerModal from "@/components/crm/CustomerModal";

export interface CustomerData {
  id: string;
  name: string;
  type: "individual" | "company" | "government";
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  kraPin?: string | null;
  creditLimit?: string | number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

const typeConfig = {
  individual: { label: "Individual", icon: User, color: "bg-blue-100 text-blue-700" },
  company: { label: "Company", icon: Building2, color: "bg-purple-100 text-purple-700" },
  government: { label: "Government", icon: Landmark, color: "bg-green-100 text-green-700" },
};

export default function CRMPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<CustomerData | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/crm/customers?${params}`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      const res = await fetch(`/api/crm/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Customer deleted");
        fetchCustomers();
      }
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  const filtered = customers.filter(c =>
    !typeFilter || c.type === typeFilter
  );

  const stats = {
    total: customers.length,
    companies: customers.filter(c => c.type === "company").length,
    individuals: customers.filter(c => c.type === "individual").length,
    government: customers.filter(c => c.type === "government").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">CRM & Customers</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your customer relationships</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCustomers}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setSelected(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Companies", value: stats.companies, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Individuals", value: stats.individuals, icon: User, color: "text-green-600", bg: "bg-green-50" },
          { label: "Government", value: stats.government, icon: Landmark, color: "text-orange-600", bg: "bg-orange-50" },
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

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or phone..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="company">Company</option>
            <option value="individual">Individual</option>
            <option value="government">Government</option>
          </select>
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-900">No customers found</p>
          <p className="text-sm text-slate-500 mt-1">Add your first customer to get started</p>
          <button
            onClick={() => { setSelected(null); setShowModal(true); }}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold mx-auto">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => {
            const typeInfo = typeConfig[customer.type] || typeConfig.company;
            const TypeIcon = typeInfo.icon;
            return (
              <div key={customer.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 leading-tight">{customer.name}</p>
                      <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1", typeInfo.color)}>
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setSelected(customer); setShowModal(true); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{customer.city}, {customer.country}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {customer.kraPin && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">KRA PIN: {customer.kraPin}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CustomerModal
        open={showModal}
        onClose={() => { setShowModal(false); setSelected(null); }}
        onSuccess={fetchCustomers}
        customer={selected}
      />
    </div>
  );
}