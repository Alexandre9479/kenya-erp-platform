"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Supplier { id: string; name: string; email?: string; phone?: string; address?: string; }
interface Product { id: string; name: string; buyingPrice: string; unit: string; }
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export default function NewLPOPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [lpoNumber, setLpoNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0, total: 0 }
  ]);

  useEffect(() => {
    fetch("/api/sales/sequence?type=lpo")
      .then(r => r.json())
      .then(d => { if (d.success) setLpoNumber(d.data.number); });

    fetch("/api/purchasing/suppliers")
      .then(r => r.json())
      .then(d => { if (d.success) setSuppliers(d.data); });

    fetch("/api/inventory/products")
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data); });

    const del = new Date();
    del.setDate(del.getDate() + 14);
    setDeliveryDate(del.toISOString().split("T")[0]);
  }, []);

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    const item = newItems[index];
    const subtotal = Number(item.quantity) * Number(item.unitPrice);
    const taxAmt = (subtotal * Number(item.taxRate)) / 100;
    newItems[index].total = subtotal + taxAmt;
    setItems(newItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      description: product.name,
      unitPrice: Number(product.buyingPrice),
    };
    newItems[index].total = newItems[index].quantity * Number(product.buyingPrice);
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);
  const totalTax = items.reduce((sum, i) => {
    const s = Number(i.quantity) * Number(i.unitPrice);
    return sum + (s * Number(i.taxRate)) / 100;
  }, 0);
  const total = subtotal + totalTax;

  const handleSubmit = async (status: "draft" | "sent") => {
    if (!selectedSupplier) { toast.error("Please select a supplier"); return; }
    if (items.some(i => !i.description)) { toast.error("All items need a description"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/purchasing/lpos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          lpoNumber,
          issueDate,
          deliveryDate: deliveryDate || undefined,
          items: items.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
          subtotal,
          taxAmount: totalTax,
          discount: 0,
          total,
          notes,
          terms,
          status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`LPO ${status === "draft" ? "saved as draft" : "created"}!`);
        router.push("/purchasing");
      } else {
        toast.error(data.error || "Failed to create LPO");
      }
    } catch {
      toast.error("Failed to create LPO");
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
            <h2 className="text-2xl font-bold text-slate-900">New Purchase Order</h2>
            <p className="text-slate-500 text-sm">{lpoNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleSubmit("draft")} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSubmit("sent")} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-500/25">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create LPO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* LPO Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">LPO Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">LPO Number</label>
                <input value={lpoNumber} onChange={e => setLpoNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Issue Date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Delivery Date</label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Items to Order</h3>
              <button onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, total: 0 }])}
                className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Product</div>
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
                    <input value={item.description} onChange={e => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500" />
                  </div>
                  <div className="col-span-2">
                    <select onChange={e => selectProduct(index, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                      <option value="">Pick...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <input type="number" min="0.01" step="0.01" value={item.quantity}
                      onChange={e => updateItem(index, "quantity", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-center" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" value={item.unitPrice}
                      onChange={e => updateItem(index, "unitPrice", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-right" />
                  </div>
                  <div className="col-span-1">
                    <input type="number" min="0" max="100" value={item.taxRate}
                      onChange={e => updateItem(index, "taxRate", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-center" />
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.total.toLocaleString("en-KE", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Special instructions..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Terms</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
                  placeholder="Delivery terms and conditions..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Supplier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Supplier</h3>
            <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Select supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSupplier && (() => {
              const s = suppliers.find(s => s.id === selectedSupplier);
              return s ? (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  {s.phone && <p className="text-slate-500 text-xs">{s.phone}</p>}
                  {s.email && <p className="text-slate-500 text-xs">{s.email}</p>}
                </div>
              ) : null;
            })()}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">KSh {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax (VAT)</span>
                <span className="font-medium">KSh {totalTax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-bold text-green-600 text-lg">
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