"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, Smartphone, Landmark, Wallet, CreditCard, FileText, Coins, MoreHorizontal, Star, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type ChannelType =
  | "cash"
  | "mpesa_till"
  | "mpesa_paybill"
  | "mpesa_send"
  | "bank"
  | "cheque"
  | "card"
  | "other";

type BankAccount = { id: string; bank_name: string; account_number: string };

type PaymentChannel = {
  id: string;
  name: string;
  channel_type: ChannelType;
  mpesa_shortcode: string | null;
  mpesa_account_template: string | null;
  mpesa_phone: string | null;
  bank_account_id: string | null;
  provider: string | null;
  account_ref: string | null;
  is_active: boolean;
  is_default: boolean;
  notes: string | null;
};

const TYPE_META: Record<ChannelType, { label: string; icon: React.ElementType; accent: string }> = {
  cash:           { label: "Cash",               icon: Coins,        accent: "from-emerald-500 to-teal-600" },
  mpesa_till:     { label: "M-Pesa Till (Buy Goods)", icon: Smartphone, accent: "from-green-500 to-emerald-700" },
  mpesa_paybill:  { label: "M-Pesa Paybill",     icon: Smartphone,   accent: "from-green-600 to-teal-700" },
  mpesa_send:     { label: "M-Pesa Send Money",  icon: Smartphone,   accent: "from-lime-500 to-green-600" },
  bank:           { label: "Bank Transfer",      icon: Landmark,     accent: "from-blue-500 to-indigo-700" },
  cheque:         { label: "Cheque",             icon: FileText,     accent: "from-slate-500 to-slate-700" },
  card:           { label: "Card / POS",         icon: CreditCard,   accent: "from-violet-500 to-purple-700" },
  other:          { label: "Other",              icon: MoreHorizontal, accent: "from-amber-500 to-orange-600" },
};

type NewChannel = {
  name: string;
  channel_type: ChannelType;
  mpesa_shortcode: string;
  mpesa_account_template: string;
  mpesa_phone: string;
  bank_account_id: string;
  provider: string;
  account_ref: string;
  is_default: boolean;
};

const emptyDraft: NewChannel = {
  name: "",
  channel_type: "mpesa_till",
  mpesa_shortcode: "",
  mpesa_account_template: "",
  mpesa_phone: "",
  bank_account_id: "",
  provider: "",
  account_ref: "",
  is_default: false,
};

export function PaymentChannelsSection() {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<NewChannel>(emptyDraft);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [chRes, bankRes] = await Promise.all([
        fetch("/api/payment-channels").then((r) => r.json()),
        fetch("/api/bank-accounts").then((r) => r.json()),
      ]);
      setChannels(chRes.data ?? []);
      setBanks(bankRes.data ?? []);
    } catch {
      toast.error("Failed to load payment channels");
    } finally {
      setLoading(false);
    }
  }

  async function addChannel() {
    if (!draft.name.trim()) {
      toast.error("Give the channel a name");
      return;
    }
    if ((draft.channel_type === "mpesa_till" || draft.channel_type === "mpesa_paybill") && !draft.mpesa_shortcode.trim()) {
      toast.error("Enter the shortcode (till or paybill number)");
      return;
    }
    if (draft.channel_type === "mpesa_send" && !draft.mpesa_phone.trim()) {
      toast.error("Enter the M-Pesa phone number");
      return;
    }
    if (draft.channel_type === "bank" && !draft.bank_account_id) {
      toast.error("Pick the underlying bank account");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/payment-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          channel_type: draft.channel_type,
          mpesa_shortcode: draft.mpesa_shortcode.trim() || null,
          mpesa_account_template: draft.mpesa_account_template.trim() || null,
          mpesa_phone: draft.mpesa_phone.trim() || null,
          bank_account_id: draft.bank_account_id || null,
          provider: draft.provider.trim() || null,
          account_ref: draft.account_ref.trim() || null,
          is_default: draft.is_default,
          is_active: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed");
      }
      toast.success("Payment channel added");
      setDraft(emptyDraft);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setAdding(false);
    }
  }

  async function setDefault(id: string) {
    try {
      const res = await fetch(`/api/payment-channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Default channel updated");
      load();
    } catch {
      toast.error("Failed to update default");
    }
  }

  async function toggleActive(ch: PaymentChannel) {
    try {
      const res = await fetch(`/api/payment-channels/${ch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !ch.is_active }),
      });
      if (!res.ok) throw new Error("Failed");
      load();
    } catch {
      toast.error("Failed to toggle");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this payment channel? Historical records keep their reference.")) return;
    try {
      const res = await fetch(`/api/payment-channels/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Channel removed");
      load();
    } catch {
      toast.error("Failed to remove");
    }
  }

  function subtitle(ch: PaymentChannel): string {
    switch (ch.channel_type) {
      case "mpesa_till":    return `Till · ${ch.mpesa_shortcode ?? "—"}`;
      case "mpesa_paybill": return `Paybill · ${ch.mpesa_shortcode ?? "—"}${ch.mpesa_account_template ? ` · acc ${ch.mpesa_account_template}` : ""}`;
      case "mpesa_send":    return `Phone · ${ch.mpesa_phone ?? "—"}`;
      case "bank":          return ch.account_ref ?? "Bank transfer";
      case "cheque":        return ch.provider ?? "Cheque";
      case "card":          return ch.provider ?? "Card / POS";
      case "cash":          return "Cash on hand";
      default:              return ch.account_ref ?? "—";
    }
  }

  return (
    <div className="space-y-5">
      {/* Channel list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading channels…
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
          <Wallet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-medium">No payment channels yet</p>
          <p className="text-xs text-slate-400 mt-1">Add M-Pesa tills, paybills, bank transfers, cash registers and more.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {channels.map((ch) => {
            const meta = TYPE_META[ch.channel_type];
            const Icon = meta.icon;
            return (
              <div
                key={ch.id}
                className={`group relative overflow-hidden rounded-xl border p-4 transition ${
                  ch.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/60 opacity-75"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${meta.accent} shadow-md`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{ch.name}</h4>
                      {ch.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                          <Star className="h-2.5 w-2.5" /> Default
                        </span>
                      )}
                      {!ch.is_active && (
                        <span className="rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-bold">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{meta.label}</p>
                    <p className="text-xs font-mono text-slate-700 mt-1 truncate">{subtitle(ch)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  {!ch.is_default && ch.is_active && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDefault(ch.id)}
                      className="h-7 text-xs text-amber-600 hover:bg-amber-50">
                      <Star className="h-3 w-3 mr-1" /> Set default
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => toggleActive(ch)}
                    className="h-7 text-xs text-slate-600 hover:bg-slate-100">
                    {ch.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(ch.id)}
                    className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Separator className="opacity-60" />

      {/* Add form toggle */}
      {!showForm ? (
        <Button type="button" onClick={() => setShowForm(true)}
          variant="outline" className="w-full border-dashed h-10 text-slate-600">
          <Plus className="h-4 w-4 mr-2" /> Add payment channel
        </Button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Channel Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Main Till, Sales Paybill" className="h-9 bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</Label>
              <Select value={draft.channel_type} onValueChange={(v) => setDraft((d) => ({ ...d, channel_type: v as ChannelType }))}>
                <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([v, m]) => (
                    <SelectItem key={v} value={v}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type-specific fields */}
          {(draft.channel_type === "mpesa_till" || draft.channel_type === "mpesa_paybill") && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {draft.channel_type === "mpesa_till" ? "Till Number" : "Paybill Number"}
                </Label>
                <Input value={draft.mpesa_shortcode} onChange={(e) => setDraft((d) => ({ ...d, mpesa_shortcode: e.target.value }))}
                  placeholder={draft.channel_type === "mpesa_till" ? "e.g. 123456" : "e.g. 522522"}
                  className="h-9 bg-white font-mono" />
              </div>
              {draft.channel_type === "mpesa_paybill" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Account Number Template</Label>
                  <Input value={draft.mpesa_account_template} onChange={(e) => setDraft((d) => ({ ...d, mpesa_account_template: e.target.value }))}
                    placeholder="{invoice_number} or {customer_phone}"
                    className="h-9 bg-white font-mono text-sm" />
                </div>
              )}
            </div>
          )}

          {draft.channel_type === "mpesa_send" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">M-Pesa Phone Number</Label>
              <Input value={draft.mpesa_phone} onChange={(e) => setDraft((d) => ({ ...d, mpesa_phone: e.target.value }))}
                placeholder="+254 7xx xxx xxx" className="h-9 bg-white font-mono" />
            </div>
          )}

          {draft.channel_type === "bank" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Linked Bank Account</Label>
              <Select value={draft.bank_account_id} onValueChange={(v) => setDraft((d) => ({ ...d, bank_account_id: v }))}>
                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Pick a bank account" /></SelectTrigger>
                <SelectContent>
                  {banks.length === 0 && <SelectItem value="_none" disabled>Add a bank account first</SelectItem>}
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.bank_name} — {b.account_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(draft.channel_type === "card" || draft.channel_type === "cheque" || draft.channel_type === "other") && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Provider</Label>
                <Input value={draft.provider} onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value }))}
                  placeholder={draft.channel_type === "card" ? "e.g. Pesapal, DPO, Equity" : "e.g. Equity Bank"}
                  className="h-9 bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Reference</Label>
                <Input value={draft.account_ref} onChange={(e) => setDraft((d) => ({ ...d, account_ref: e.target.value }))}
                  placeholder="Merchant ID, cheque series…" className="h-9 bg-white font-mono text-sm" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={draft.is_default} onCheckedChange={(v) => setDraft((d) => ({ ...d, is_default: v }))} />
              <Label className="text-xs text-slate-600">Set as default payment channel</Label>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setDraft(emptyDraft); }}
                className="h-8 text-xs">Cancel</Button>
              <Button type="button" size="sm" onClick={addChannel} disabled={adding}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                {adding ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Plus className="h-3 w-3 mr-1.5" />}
                Save channel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
