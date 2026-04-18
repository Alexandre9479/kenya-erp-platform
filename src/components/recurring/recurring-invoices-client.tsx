"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, Repeat, CalendarClock, Play, Sparkles,
  ReceiptText, Users, Clock3, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type Template = {
  id: string;
  name: string;
  customer_id: string;
  customers?: { name: string } | null;
  frequency: string;
  interval_count: number;
  start_date: string;
  next_run_date: string;
  last_run_date: string | null;
  runs_completed: number;
  max_runs: number | null;
  end_date: string | null;
  currency_code: string;
  status: string;
};

type Customer = { id: string; name: string };

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_pct: number;
};

const STATUS_CONFIG: Record<string, { bg: string; dot: string; label: string }> = {
  active:    { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500", label: "Active" },
  paused:    { bg: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500",   label: "Paused" },
  completed: { bg: "bg-slate-100 text-slate-700 border-slate-200",        dot: "bg-slate-400",   label: "Completed" },
  cancelled: { bg: "bg-rose-100 text-rose-800 border-rose-200",           dot: "bg-rose-500",    label: "Cancelled" },
};

const FREQ_LABEL: Record<string, string> = {
  daily: "daily", weekly: "weekly", monthly: "monthly", quarterly: "quarterly", yearly: "yearly",
};

const KES = (v: number, ccy = "KES") =>
  `${ccy} ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v)}`;

export function RecurringInvoicesClient({
  initial, customers,
}: {
  initial: Template[];
  customers: Customer[];
}) {
  const [rows, setRows] = useState<Template[]>(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    customer_id: "",
    frequency: "monthly" as "daily"|"weekly"|"monthly"|"quarterly"|"yearly",
    interval_count: 1,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    max_runs: "",
    currency_code: "KES",
    payment_terms: "Net 30",
    notes: "",
  });
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 16, discount_pct: 0 },
  ]);

  const totals = useMemo(() => {
    let sub = 0, tax = 0;
    items.forEach((i) => {
      const line = i.quantity * i.unit_price * (1 - i.discount_pct / 100);
      sub += line;
      tax += line * (i.tax_rate / 100);
    });
    return { sub, tax, total: sub + tax };
  }, [items]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").length;
    const dueSoon = rows.filter((r) => {
      if (r.status !== "active") return false;
      const daysUntil = (new Date(r.next_run_date).getTime() - Date.now()) / 86400000;
      return daysUntil <= 7;
    }).length;
    const completed = rows.reduce((s, r) => s + (r.runs_completed ?? 0), 0);
    return { total: rows.length, active, dueSoon, completed };
  }, [rows]);

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function save() {
    if (!form.name || !form.customer_id) {
      toast.error("Name and customer are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        end_date: form.end_date || null,
        max_runs: form.max_runs ? Number(form.max_runs) : null,
        items,
      };
      const res = await fetch("/api/recurring-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      const cust = customers.find((c) => c.id === form.customer_id);
      setRows((prev) => [{ ...json.data, customers: cust ? { name: cust.name } : null }, ...prev]);
      setOpen(false);
      toast.success("Template created");
      setForm({ ...form, name: "", customer_id: "", notes: "" });
      setItems([{ description: "", quantity: 1, unit_price: 0, tax_rate: 16, discount_pct: 0 }]);
    } finally { setBusy(false); }
  }

  async function runNow() {
    setBusy(true);
    try {
      toast.loading("Processing due templates…", { id: "run" });
      const res = await fetch("/api/recurring-invoices/run", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed", { id: "run" }); return; }
      toast.success(`Processed ${json.processed} template(s)`, { id: "run" });
      setTimeout(() => window.location.reload(), 1200);
    } finally { setBusy(false); }
  }

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-16"
        style={{ background: "linear-gradient(135deg, #500724 0%, #9f1239 50%, #db2777 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pink-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-rose-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-pink-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Automated billing</span>
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Recurring Invoices</h1>
              <p className="mt-2 text-pink-100/80 text-sm md:text-base max-w-2xl">
                Subscriptions, retainers, monthly rent — set it once and let the system bill on schedule.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={runNow}
                disabled={busy}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              >
                <Play className="h-4 w-4 mr-1.5" /> Run Due Now
              </Button>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button className="bg-white text-rose-700 hover:bg-pink-50 shadow-lg shadow-pink-900/30">
                    <Plus className="h-4 w-4 mr-1.5" /> New Template
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>New Recurring Template</SheetTitle>
                    <SheetDescription>Define schedule + line items. Invoices generate automatically on the next run date.</SheetDescription>
                  </SheetHeader>
                  <div className="p-4 space-y-5">
                    <div className="space-y-1.5">
                      <Label>Template Name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Monthly Cloud Subscription"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Customer</Label>
                      <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Frequency</Label>
                        <Select value={form.frequency} onValueChange={(v: any) => setForm({ ...form, frequency: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Every</Label>
                        <Input type="number" min="1" value={form.interval_count}
                          onChange={(e) => setForm({ ...form, interval_count: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Start Date</Label>
                        <Input type="date" value={form.start_date}
                          onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>End Date (optional)</Label>
                        <Input type="date" value={form.end_date}
                          onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max Runs</Label>
                        <Input type="number" min="0" placeholder="No limit" value={form.max_runs}
                          onChange={(e) => setForm({ ...form, max_runs: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Currency</Label>
                        <Input value={form.currency_code}
                          onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Payment Terms</Label>
                      <Input value={form.payment_terms}
                        onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea rows={2} value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Line Items</Label>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unit_price: 0, tax_rate: 16, discount_pct: 0 }])}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add line
                        </Button>
                      </div>

                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-[1fr_64px_100px_64px_32px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <span>Description</span>
                          <span className="text-right">Qty</span>
                          <span className="text-right">Unit Price</span>
                          <span className="text-right">VAT%</span>
                          <span />
                        </div>
                        <div className="divide-y">
                          {items.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_64px_100px_64px_32px] gap-2 px-3 py-2 items-center">
                              <Input
                                placeholder="Item description"
                                value={it.description}
                                onChange={(e) => updateItem(idx, { description: e.target.value })}
                                className="h-9"
                              />
                              <Input type="number" step="0.01" value={it.quantity}
                                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                className="h-9 text-right" />
                              <Input type="number" step="0.01" value={it.unit_price}
                                onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                                className="h-9 text-right" />
                              <Input type="number" min="0" max="100" value={it.tax_rate}
                                onChange={(e) => updateItem(idx, { tax_rate: Number(e.target.value) })}
                                className="h-9 text-right" />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                                disabled={items.length <= 1}
                                className="h-9 w-9"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-linear-to-br from-rose-50 to-pink-50 border border-rose-100 p-3 text-sm space-y-1">
                        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{KES(totals.sub, form.currency_code)}</span></div>
                        <div className="flex justify-between text-slate-600"><span>VAT</span><span>{KES(totals.tax, form.currency_code)}</span></div>
                        <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-rose-200"><span>Total per run</span><span>{KES(totals.total, form.currency_code)}</span></div>
                      </div>
                    </div>
                  </div>
                  <SheetFooter className="border-t bg-white px-4 py-3 gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={save} disabled={busy} className="bg-linear-to-br from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700">
                      Create Template
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat label="Templates" value={stats.total} icon={ReceiptText} tone="rose" />
            <HeroStat label="Active" value={stats.active} icon={Repeat} tone="emerald" />
            <HeroStat label="Due ≤ 7 days" value={stats.dueSoon} icon={CalendarClock} tone="amber" />
            <HeroStat label="Runs completed" value={stats.completed} icon={TrendingUp} tone="violet" />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl">
          {rows.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/70">
              <CardContent className="p-16 text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-linear-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4">
                  <Repeat className="h-8 w-8 text-rose-500" />
                </div>
                <p className="text-base font-semibold text-slate-700">No recurring templates yet</p>
                <p className="text-sm text-slate-500 mt-1">Create one to automate monthly billing for subscriptions or retainers.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.completed;
                const daysUntil = Math.ceil(
                  (new Date(r.next_run_date).getTime() - Date.now()) / 86400000
                );
                return (
                  <Card key={r.id} className="border-slate-200/80 shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5 group overflow-hidden">
                    <div className={`h-1 ${cfg.dot} bg-current opacity-70`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-rose-500 to-pink-600 shadow-md shadow-rose-500/20">
                            <Repeat className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{r.name}</CardTitle>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {r.customers?.name ?? "—"}
                            </div>
                          </div>
                        </div>
                        <Badge className={`${cfg.bg} border capitalize`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot} mr-1`} />
                          {cfg.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2.5 text-xs">
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                        <div className="flex-1">
                          <div className="text-slate-500">Every {r.interval_count} {FREQ_LABEL[r.frequency]}</div>
                          <div className="font-semibold text-slate-800">Next: {r.next_run_date}</div>
                        </div>
                        {r.status === "active" && daysUntil >= 0 && (
                          <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${
                            daysUntil <= 3 ? "bg-rose-100 text-rose-700" :
                            daysUntil <= 7 ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {daysUntil === 0 ? "today" : `${daysUntil}d`}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Stat label="Runs" value={String(r.runs_completed ?? 0) + (r.max_runs ? `/${r.max_runs}` : "")} />
                        <Stat label="Currency" value={r.currency_code} />
                        {r.last_run_date && <Stat label="Last run" value={r.last_run_date} />}
                        {r.end_date && <Stat label="Ends" value={r.end_date} />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TONES = {
  rose:    "from-rose-500 to-pink-600 shadow-rose-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  amber:   "from-amber-500 to-orange-600 shadow-amber-500/30",
  violet:  "from-violet-500 to-purple-600 shadow-violet-500/30",
} as const;

function HeroStat({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: React.ElementType; tone: keyof typeof TONES }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${TONES[tone]} shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{label}</div>
        <div className="text-xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-100 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      <div className="text-xs font-semibold text-slate-800">{value}</div>
    </div>
  );
}
