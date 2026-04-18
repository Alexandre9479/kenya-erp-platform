"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Minus, Trash2, Receipt, DoorOpen, DoorClosed } from "lucide-react";

type Product = { id: string; name: string; sku: string | null; unit_price: number | null; tax_rate: number | null };
type Warehouse = { id: string; name: string };
type Customer = { id: string; name: string };
type Channel = { id: string; name: string; channel_type: string };
type SessionT = {
  id: string; session_number: string; register_name: string | null;
  opening_float: number; opened_at: string;
  warehouses?: { name: string } | null;
};
type CartItem = { product_id: string; name: string; quantity: number; unit_price: number; tax_rate: number };

export function PosClient({
  activeSession, products, warehouses, customers, channels,
}: {
  activeSession: SessionT | null;
  products: Product[];
  warehouses: Warehouse[];
  customers: Customer[];
  channels: Channel[];
}) {
  const [sess, setSess] = useState<SessionT | null>(activeSession);
  const [openOpen, setOpenOpen] = useState(false);
  const [openClose, setOpenClose] = useState(false);
  const [busy, setBusy] = useState(false);

  const [openForm, setOpenForm] = useState({
    warehouse_id: warehouses[0]?.id ?? "",
    opening_float: 0,
    register_name: "Main Till",
  });
  const [closeForm, setCloseForm] = useState({ closing_cash: 0, notes: "" });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [payChannel, setPayChannel] = useState<string>("");
  const [tendered, setTendered] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 48);
    return products.filter((p) =>
      (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    ).slice(0, 48);
  }, [products, search]);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.quantity * i.unit_price, 0), [cart]
  );
  const tax = useMemo(
    () => cart.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_rate / 100), 0), [cart]
  );
  const total = subtotal + tax;
  const change = Math.max(0, tendered - total);

  function addProduct(p: Product) {
    setCart((prev) => {
      const ex = prev.find((c) => c.product_id === p.id);
      if (ex) return prev.map((c) => c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        product_id: p.id, name: p.name,
        quantity: 1, unit_price: Number(p.unit_price ?? 0),
        tax_rate: Number(p.tax_rate ?? 0),
      }];
    });
  }
  function updateQty(idx: number, delta: number) {
    setCart((prev) => prev.map((c, i) => i === idx ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  }

  async function openSession() {
    setBusy(true);
    try {
      const res = await fetch("/api/pos/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(openForm),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      const wh = warehouses.find((w) => w.id === openForm.warehouse_id);
      setSess({ ...json.data, warehouses: wh ? { name: wh.name } : null });
      setOpenOpen(false);
    } finally { setBusy(false); }
  }

  async function closeSession() {
    if (!sess) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pos/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sess.id, ...closeForm }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      alert(`Session closed. Variance: ${Number(json.data?.variance ?? 0).toFixed(2)}`);
      setSess(null);
      setOpenClose(false);
    } finally { setBusy(false); }
  }

  async function pay() {
    if (!sess) { alert("Open a session first"); return; }
    if (cart.length === 0) { alert("Empty cart"); return; }
    if (tendered < total) { alert("Tendered amount insufficient"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sess.id,
          customer_id: customerId || null,
          items: cart.map((c) => ({
            product_id: c.product_id,
            description: c.name,
            quantity: c.quantity,
            unit_price: c.unit_price,
            tax_rate: c.tax_rate,
          })),
          payments: [{
            payment_method: payMethod,
            payment_channel_id: payChannel || null,
            amount: tendered,
          }],
        }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      alert(`Order complete. Change due: ${change.toFixed(2)}`);
      setCart([]); setTendered(0); setCustomerId("");
    } finally { setBusy(false); }
  }

  if (!sess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Point of Sale</h1>
          <p className="text-sm text-slate-500 mt-1">Open a cashier session to start selling</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-slate-500">No open session. Start a new till.</p>
            <Dialog open={openOpen} onOpenChange={setOpenOpen}>
              <DialogTrigger asChild><Button><DoorOpen className="h-4 w-4 mr-1" /> Open Session</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Open POS Session</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Register Name</Label>
                    <Input value={openForm.register_name} onChange={(e) => setOpenForm({ ...openForm, register_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Warehouse</Label>
                    <Select value={openForm.warehouse_id} onValueChange={(v) => setOpenForm({ ...openForm, warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Opening Float</Label>
                    <Input type="number" min="0" value={openForm.opening_float} onChange={(e) => setOpenForm({ ...openForm, opening_float: Number(e.target.value) })} />
                  </div>
                  <Button onClick={openSession} disabled={busy} className="w-full">Open</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Point of Sale</h1>
          <p className="text-sm text-slate-500">
            Session <span className="font-mono">{sess.session_number}</span>
            {sess.warehouses?.name && <> · {sess.warehouses.name}</>}
            {" · "}Opened {new Date(sess.opened_at).toLocaleTimeString()}
          </p>
        </div>
        <Dialog open={openClose} onOpenChange={setOpenClose}>
          <DialogTrigger asChild>
            <Button variant="outline"><DoorClosed className="h-4 w-4 mr-1" /> Close Session</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Close POS Session</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Counted Cash</Label>
                <Input type="number" min="0" value={closeForm.closing_cash} onChange={(e) => setCloseForm({ ...closeForm, closing_cash: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} />
              </div>
              <Button onClick={closeSession} disabled={busy} className="w-full">Close &amp; Reconcile</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Input placeholder="Search products by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addProduct(p)}
                className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-indigo-400 hover:shadow-md transition">
                <div className="text-sm font-medium line-clamp-2">{p.name}</div>
                <div className="text-xs text-slate-500 mt-1">{p.sku ?? ""}</div>
                <div className="text-sm font-semibold mt-1">KES {Number(p.unit_price ?? 0).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        <Card className="h-fit sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No items</p>
              ) : cart.map((c, idx) => (
                <div key={c.product_id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="font-medium line-clamp-1">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.unit_price.toLocaleString()} × {c.quantity}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => updateQty(idx, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center">{c.quantity}</span>
                  <Button size="icon" variant="ghost" onClick={() => updateQty(idx, 1)}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-sm pt-2 border-t">
              <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>VAT</span><span>{tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{total.toFixed(2)}</span></div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>

              {payMethod !== "cash" && channels.length > 0 && (
                <Select value={payChannel} onValueChange={setPayChannel}>
                  <SelectTrigger><SelectValue placeholder="Channel (optional)" /></SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <div>
                <Label>Tendered</Label>
                <Input type="number" min="0" value={tendered} onChange={(e) => setTendered(Number(e.target.value))} />
              </div>
              {tendered >= total && total > 0 && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border">
                  Change: KES {change.toFixed(2)}
                </Badge>
              )}
              <Button className="w-full" onClick={pay} disabled={busy || cart.length === 0}>
                Charge {total > 0 ? total.toFixed(2) : ""}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
