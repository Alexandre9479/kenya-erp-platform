"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  Plus, Trash2, ArrowLeft,
  Loader2, Save, Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Customer { id: string; name: string; email?: string; phone?: string; address?: string; }
interface Product { id: string; name: string; sellingPrice: string; taxRate: string; unit: string; }
interface LineItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0 }
  ]);

  useEffect(() => {
    // Get invoice number
    fetch("/api/sales/sequence?type=invoice")
      .then(r => r.json())
      .then(d => { if (d.success) setInvoiceNumber(d.data.number); });

    // Get products
    fetch("/api/inventory/products")
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data); });

    // Set default due date (30 days)
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (customerSearch.length < 1) return;
    const timer = setTimeout(() => {
      fetch(`/api/crm/customers?search=${customerSearch}`)
        .then(r => r.json())
        .then(d => { if (d.success) setCustomers(d.data); });
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate total
    const item = newItems[index];
    const subtotal = Number(item.quantity) * Number(item.unitPrice);
    const discountAmt = (subtotal * Number(item.discount)) / 100;
    const taxAmt = ((subtotal - discountAmt) * Number(item.taxRate)) / 100;
    newItems[index].total = subtotal - discountAmt + taxAmt;

    setItems(newItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      description: product.name,
      unitPrice: Number(product.sellingPrice),
      taxRate: Number(product.taxRate),
    };
    const subtotal = newItems[index].quantity * Number(product.sellingPrice);
    const taxAmt = (subtotal * Number(product.taxRate)) / 100;
    newItems[index].total = subtotal + taxAmt;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + (Number(item.quantity) * Number(item.unitPrice));
  }, 0);

  const totalDiscount = items.reduce((sum, item) => {
    const s = Number(item.quantity) * Number(item.unitPrice);
    return sum + (s * Number(item.discount)) / 100;
  }, 0);

  const totalTax = items.reduce((sum, item) => {
    const s = Number(item.quantity) * Number(item.unitPrice);
    const d = (s * Number(item.discount)) / 100;
    return sum + ((s - d) * Number(item.taxRate)) / 100;
  }, 0);

  const total = subtotal - totalDiscount + totalTax;

  const handleSubmit = async (status: "draft" | "sent") => {
    if (!selectedCustomer) { toast.error("Please select a customer"); return; }
    if (!invoiceNumber) { toast.error("Invoice number is required"); return; }
    if (items.some(i => !i.description)) { toast.error("All items need a description"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/sales/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          invoiceNumber,
          issueDate,
          dueDate: dueDate || undefined,
          items: items.map(item => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
          subtotal,
          taxAmount: totalTax,
          discount: totalDiscount,
          total,
          notes,
          terms,
          status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice ${status === "draft" ? "saved as draft" : "created and sent"}!`);
        router.push("/sales");
      } else {
        toast.error(data.error || "Failed to create invoice");
      }
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">New Invoice</h2>
            <p className="text-slate-500 text-sm">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleSubmit("draft")} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button onClick={() => handleSubmit("sent")} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invoice Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Invoice Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Invoice Number</label>
                <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Issue Date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Line Items</h3>
              <button onClick={addItem}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
              <div className="col-span-4">Description</div>
              <div className="col-span-2 text-center">Product</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1 text-center">Tax%</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded-xl">
                  <div className="col-span-4">
                    <input
                      value={item.description}
                      onChange={e => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      onChange={e => selectProduct(index, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Pick...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number" min="0.01" step="0.01"
                      value={item.quantity}
                      onChange={e => updateItem(index, "quantity", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateItem(index, "unitPrice", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number" min="0" max="100" step="0.1"
                      value={item.taxRate}
                      onChange={e => updateItem(index, "taxRate", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.total.toLocaleString("en-KE", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeItem(index)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Additional notes for the customer..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Terms & Conditions</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
                  placeholder="Payment terms and conditions..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Customer Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Customer</h3>
            {selectedCustomer ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{selectedCustomer.name}</p>
                    {selectedCustomer.email && <p className="text-xs text-slate-500">{selectedCustomer.email}</p>}
                    {selectedCustomer.phone && <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>}
                  </div>
                  <button onClick={() => setSelectedCustomer(null)}
                    className="text-slate-400 hover:text-red-500 text-xs">✕</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                  placeholder="Search customer..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showCustomerSearch && customers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                    {customers.map(c => (
                      <button key={c.id}
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); setShowCustomerSearch(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                        <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                        {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">KSh {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-medium text-red-600">- KSh {totalDiscount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax (VAT)</span>
                <span className="font-medium">KSh {totalTax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-bold text-blue-600 text-lg">
                  KSh {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}