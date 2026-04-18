"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Receipt, DoorOpen, DoorClosed, Plus, Minus, Trash2, Search,
  Store, Package, Wallet, Timer, User2, CreditCard, Smartphone,
  Banknote, ShoppingBag, Sparkles, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

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

const TONES = {
  lime:    "from-lime-500 to-green-600 shadow-lime-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  sky:     "from-sky-500 to-indigo-600 shadow-sky-500/30",
  amber:   "from-amber-500 to-orange-600 shadow-amber-500/30",
  rose:    "from-rose-500 to-pink-600 shadow-rose-500/30",
} as const;

type Tone = keyof typeof TONES;

function HeroStat({
  label, value, icon: Icon, tone, hint,
}: {
  label: string; value: string | number; icon: React.ElementType; tone: Tone; hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${TONES[tone]} shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold truncate">{label}</div>
        <div className="text-xl font-bold text-white truncate">{value}</div>
        {hint && <div className="text-[10px] text-white/50 truncate">{hint}</div>}
      </div>
    </div>
  );
}

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);

const METHOD_ICON: Record<string, React.ElementType> = {
  cash: Banknote,
  mpesa: Smartphone,
  card: CreditCard,
};

function useElapsed(iso: string | undefined | null) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return "—";
  const ms = now - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

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

  const elapsed = useElapsed(sess?.opened_at);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 48);
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
    ).slice(0, 48);
  }, [products, search]);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.quantity * i.unit_price, 0), [cart],
  );
  const tax = useMemo(
    () => cart.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_rate / 100), 0), [cart],
  );
  const total = subtotal + tax;
  const itemCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const change = Math.max(0, tendered - total);
  const insufficient = tendered > 0 && tendered < total;

  function addProduct(p: Product) {
    setCart((prev) => {
      const ex = prev.find((c) => c.product_id === p.id);
      if (ex) return prev.map((c) => (c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [
        ...prev,
        {
          product_id: p.id, name: p.name,
          quantity: 1, unit_price: Number(p.unit_price ?? 0),
          tax_rate: Number(p.tax_rate ?? 0),
        },
      ];
    });
  }
  function updateQty(idx: number, delta: number) {
    setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)));
  }

  async function openSession() {
    if (!openForm.warehouse_id) { toast.error("Select a warehouse"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/pos/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(openForm),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to open session"); return; }
      const wh = warehouses.find((w) => w.id === openForm.warehouse_id);
      setSess({ ...json.data, warehouses: wh ? { name: wh.name } : null });
      setOpenOpen(false);
      toast.success("Session opened");
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
      if (!res.ok) { toast.error(json.error ?? "Failed to close session"); return; }
      toast.success(`Closed. Variance: KES ${KES(Number(json.data?.variance ?? 0))}`);
      setSess(null);
      setOpenClose(false);
      setCart([]); setTendered(0); setCustomerId("");
    } finally { setBusy(false); }
  }

  async function pay() {
    if (!sess) { toast.error("Open a session first"); return; }
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (tendered < total) { toast.error("Tendered amount insufficient"); return; }
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
      if (!res.ok) { toast.error(json.error ?? "Payment failed"); return; }
      toast.success(`Sale complete · Change KES ${KES(change)}`);
      setCart([]); setTendered(0); setCustomerId("");
    } finally { setBusy(false); }
  }

  // ─── NO SESSION ─────────────────────────────────────────────────────────────
  if (!sess) {
    return (
      <div className="-m-4 md:-m-6">
        <div
          className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-14"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 45%, #65a30d 100%)" }}
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-lime-500 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-emerald-500 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-lime-100 backdrop-blur">
              <Store className="h-3.5 w-3.5" />
              <span>Point of Sale</span>
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Start a cashier session</h1>
            <p className="mt-2 text-lime-100/80 text-sm md:text-base max-w-2xl">
              Open your till with a register name, warehouse, and opening float. Every sale, tender and variance gets recorded end-to-end.
            </p>
          </div>
        </div>

        <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
          <div className="mx-auto max-w-3xl">
            <Card className="relative overflow-hidden border-slate-200/80 shadow-xl shadow-slate-200/40">
              <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-lime-500 via-emerald-500 to-green-600" />
              <CardContent className="p-8 md:p-10 text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-lime-500 to-green-600 shadow-lg shadow-lime-500/30">
                  <DoorOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">No open session</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    You need an active till to ring up sales. It takes a few seconds.
                  </p>
                </div>
                <Sheet open={openOpen} onOpenChange={setOpenOpen}>
                  <SheetTrigger asChild>
                    <Button size="lg" className="bg-linear-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 text-white shadow-lg shadow-lime-500/20">
                      <DoorOpen className="h-4 w-4 mr-2" /> Open Session
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-lime-500 to-green-600 shadow shadow-lime-500/30">
                          <DoorOpen className="h-4 w-4 text-white" />
                        </div>
                        Open POS Session
                      </SheetTitle>
                      <SheetDescription>Set up the till for this shift.</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4 px-4">
                      <div className="space-y-1.5">
                        <Label>Register Name</Label>
                        <Input
                          value={openForm.register_name}
                          onChange={(e) => setOpenForm({ ...openForm, register_name: e.target.value })}
                          placeholder="Main Till"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Warehouse</Label>
                        <Select value={openForm.warehouse_id} onValueChange={(v) => setOpenForm({ ...openForm, warehouse_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Opening Float (KES)</Label>
                        <Input
                          type="number" min="0"
                          value={openForm.opening_float}
                          onChange={(e) => setOpenForm({ ...openForm, opening_float: Number(e.target.value) })}
                        />
                        <p className="text-[11px] text-slate-500">Cash placed in the drawer at the start of shift.</p>
                      </div>
                      <Separator />
                      <Button
                        onClick={openSession}
                        disabled={busy}
                        className="w-full bg-linear-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 text-white"
                      >
                        {busy ? "Opening…" : "Open Session"}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
                <p className="text-[11px] text-slate-400">
                  Sessions are linked to your user &amp; warehouse — variance is calculated when you close.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE SESSION ─────────────────────────────────────────────────────────
  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-14"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 45%, #65a30d 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-lime-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-emerald-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-lime-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Active Till · {sess.register_name ?? "Main"}</span>
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Point of Sale</h1>
              <p className="mt-2 text-lime-100/80 text-sm md:text-base">
                Session <span className="font-mono text-white">{sess.session_number}</span>
                {sess.warehouses?.name && <> · <span className="text-white">{sess.warehouses.name}</span></>}
                {" · "}Opened {new Date(sess.opened_at).toLocaleTimeString()}
              </p>
            </div>
            <Sheet open={openClose} onOpenChange={setOpenClose}>
              <SheetTrigger asChild>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur">
                  <DoorClosed className="h-4 w-4 mr-2" /> Close Session
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-rose-500 to-pink-600 shadow shadow-rose-500/30">
                      <DoorClosed className="h-4 w-4 text-white" />
                    </div>
                    Close &amp; Reconcile
                  </SheetTitle>
                  <SheetDescription>Enter counted cash to compute variance.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4 px-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Opening Float</div>
                    <div className="text-lg font-bold text-slate-900">KES {KES(Number(sess.opening_float ?? 0))}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Counted Cash (KES)</Label>
                    <Input
                      type="number" min="0"
                      value={closeForm.closing_cash}
                      onChange={(e) => setCloseForm({ ...closeForm, closing_cash: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Input
                      value={closeForm.notes}
                      onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                      placeholder="Anything worth flagging for the next shift"
                    />
                  </div>
                  <Separator />
                  <Button
                    onClick={closeSession}
                    disabled={busy}
                    className="w-full bg-linear-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white"
                  >
                    {busy ? "Closing…" : "Close & Reconcile"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat label="Session" value={elapsed} icon={Timer} tone="lime" hint={sess.register_name ?? "Till"} />
            <HeroStat label="Items in cart" value={itemCount} icon={Package} tone="sky" hint={`${cart.length} lines`} />
            <HeroStat label="Subtotal" value={`KES ${KES(subtotal)}`} icon={ShoppingBag} tone="amber" />
            <HeroStat label="Total due" value={`KES ${KES(total)}`} icon={Wallet} tone="emerald" hint={`Tax KES ${KES(tax)}`} />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-3 gap-5">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search products by name or SKU…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {filtered.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-white/60">
                <CardContent className="p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Package className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">No products match</p>
                  <p className="text-xs text-slate-500">Try a different search term or clear the filter.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((p) => {
                  const price = Number(p.unit_price ?? 0);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-lime-400 hover:shadow-lg hover:shadow-lime-500/10"
                    >
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-lime-500 to-green-600 opacity-0 group-hover:opacity-100 transition" />
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-lime-100 to-green-100 text-green-700 group-hover:from-lime-500 group-hover:to-green-600 group-hover:text-white transition">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="mt-3 text-sm font-semibold text-slate-900 line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                      {p.sku && <div className="mt-1 text-[11px] text-slate-500 font-mono">{p.sku}</div>}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-base font-bold text-slate-900">KES {KES(price)}</div>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-lime-500 group-hover:text-white transition">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <Card className="h-fit lg:sticky lg:top-4 relative overflow-hidden border-slate-200/80 shadow-xl shadow-slate-200/40">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-lime-500 via-emerald-500 to-green-600" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-lime-500 to-green-600 shadow shadow-lime-500/30">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                Cart
                <Badge variant="outline" className="ml-auto bg-lime-50 text-lime-700 border-lime-200">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                  <User2 className="h-3 w-3" /> Customer
                </Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                {cart.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200">
                      <ShoppingBag className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Tap a product to add it</p>
                  </div>
                ) : cart.map((c, idx) => (
                  <div
                    key={c.product_id}
                    className="group rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 line-clamp-1">{c.name}</div>
                      <div className="text-[11px] text-slate-500">
                        KES {KES(c.unit_price)} × {c.quantity}
                        {c.tax_rate > 0 && <span className="ml-1 text-slate-400">· {c.tax_rate}% tax</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 px-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => updateQty(idx, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-xs font-semibold">{c.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => updateQty(idx, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">KES {KES(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT</span>
                  <span className="tabular-nums">KES {KES(tax)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
                  <span className="text-sm font-semibold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">KES {KES(total)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-slate-500">Payment method</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["cash", "mpesa", "card"] as const).map((m) => {
                      const Icon = METHOD_ICON[m];
                      const active = payMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPayMethod(m)}
                          className={[
                            "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium capitalize transition",
                            active
                              ? "border-lime-500 bg-linear-to-br from-lime-50 to-green-50 text-green-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                          {m === "mpesa" ? "M-Pesa" : m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {payMethod !== "cash" && channels.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-slate-500">Channel</Label>
                    <Select value={payChannel} onValueChange={setPayChannel}>
                      <SelectTrigger><SelectValue placeholder="Channel (optional)" /></SelectTrigger>
                      <SelectContent>
                        {channels.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-slate-500">Tendered (KES)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={tendered}
                    onChange={(e) => setTendered(Number(e.target.value))}
                    className="h-11 text-base font-semibold tabular-nums"
                  />
                </div>

                {tendered > 0 && total > 0 && (
                  insufficient ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex items-center justify-between">
                      <span className="font-medium">Short by</span>
                      <span className="font-bold tabular-nums">KES {KES(total - tendered)}</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Change due</span>
                      <span className="font-bold tabular-nums">KES {KES(change)}</span>
                    </div>
                  )
                )}

                <Button
                  className="w-full h-12 text-base bg-linear-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 text-white shadow-lg shadow-lime-500/20 disabled:opacity-50"
                  onClick={pay}
                  disabled={busy || cart.length === 0 || tendered < total}
                >
                  {busy ? "Processing…" : total > 0 ? `Charge KES ${KES(total)}` : "Charge"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
