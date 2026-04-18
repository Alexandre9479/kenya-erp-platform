"use client";

import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Repeat } from "lucide-react";

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

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paused: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
};

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

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, tax_rate: 16, discount_pct: 0 }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
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
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      const cust = customers.find((c) => c.id === form.customer_id);
      setRows((prev) => [{ ...json.data, customers: cust ? { name: cust.name } : null }, ...prev]);
      setOpen(false);
      setForm({ ...form, name: "", customer_id: "", notes: "" });
      setItems([{ description: "", quantity: 1, unit_price: 0, tax_rate: 16, discount_pct: 0 }]);
    } finally { setBusy(false); }
  }

  async function runNow() {
    setBusy(true);
    try {
      const res = await fetch("/api/recurring-invoices/run", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      alert(`Processed ${json.processed} template(s)`);
      window.location.reload();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Subscriptions, retainers, monthly rent — automate the billing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runNow} disabled={busy}>
            <Repeat className="h-4 w-4 mr-2" /> Run Due Now
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Recurring Template</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Customer</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
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
                  <div>
                    <Label>Every</Label>
                    <Input type="number" min="1" value={form.interval_count}
                      onChange={(e) => setForm({ ...form, interval_count: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Date (optional)</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Max runs (optional)</Label>
                    <Input type="number" min="0" value={form.max_runs} onChange={(e) => setForm({ ...form, max_runs: e.target.value })} />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Line Items</Label>
                    <Button size="sm" variant="outline" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_110px_80px_32px] gap-2 items-end">
                      <Input placeholder="Description" value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })} />
                      <Input type="number" min="0" step="0.01" placeholder="Qty" value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                      <Input type="number" min="0" step="0.01" placeholder="Price" value={it.unit_price}
                        onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
                      <Input type="number" min="0" max="100" placeholder="VAT%" value={it.tax_rate}
                        onChange={(e) => updateItem(idx, { tax_rate: Number(e.target.value) })} />
                      <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={save} disabled={busy || !form.name || !form.customer_id}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-500">No recurring templates yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{r.name}</CardTitle>
                  <div className="text-xs text-slate-500 mt-1">
                    {r.customers?.name ?? "—"} · Every {r.interval_count} {r.frequency}
                    {" · "} Next run: <strong>{r.next_run_date}</strong>
                  </div>
                </div>
                <Badge className={`${STATUS_COLOR[r.status] ?? ""} border capitalize`}>{r.status}</Badge>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 pt-0">
                Completed runs: {r.runs_completed}
                {r.max_runs && <> / {r.max_runs}</>}
                {r.last_run_date && <> · Last: {r.last_run_date}</>}
                {r.end_date && <> · Ends: {r.end_date}</>}
                {" · "}Currency: {r.currency_code}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
