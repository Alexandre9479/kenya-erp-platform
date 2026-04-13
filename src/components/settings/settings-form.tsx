"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2, Building2, FileText, Landmark, Globe,
  Camera, CheckCircle2, AlertTriangle, CreditCard,
  Upload, Save, Settings2, Plus, Trash2, Star,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type TenantRow = {
  id: string; name: string; slug: string; email: string;
  phone: string | null; address: string | null; city: string | null;
  country: string; kra_pin: string | null; logo_url: string | null;
  primary_color: string; currency: string; timezone: string;
  subscription_plan: string; subscription_status: string;
  trial_ends_at: string | null; is_active: boolean;
  bank_name: string | null; bank_account: string | null; bank_branch: string | null;
  invoice_prefix: string; quote_prefix: string; lpo_prefix: string;
  terms_and_conditions: string | null; created_at: string; updated_at: string;
};

const settingsSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().min(1, "Country is required"),
  kra_pin: z.string().optional().nullable(),
  invoice_prefix: z.string().min(1).max(10),
  quote_prefix: z.string().min(1).max(10),
  lpo_prefix: z.string().min(1).max(10),
  terms_and_conditions: z.string().optional().nullable(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;

type BankAccount = {
  id: string;
  bank_name: string;
  account_name: string | null;
  account_number: string;
  branch: string | null;
  swift_code: string | null;
  is_default: boolean;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function trialDaysLeft(endsAt: string | null) {
  if (!endsAt) return null;
  const diff = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

function SectionCard({
  icon: Icon, title, description, gradient, children,
}: {
  icon: React.ElementType; title: string; description: string;
  gradient: string; children: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={`h-1 w-full bg-linear-to-r ${gradient}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br ${gradient} shadow-sm`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="mx-6 mb-0 opacity-60" />
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</p>}
    </div>
  );
}

export function SettingsForm({ tenant }: { tenant: TenantRow }) {
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant.logo_url);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo_url);

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankAdding, setBankAdding] = useState(false);
  const [newBank, setNewBank] = useState({ bank_name: "", account_name: "", account_number: "", branch: "", swift_code: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const daysLeft = trialDaysLeft(tenant.trial_ends_at);
  const isTrialing = tenant.subscription_status === "trial";

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: tenant.name, email: tenant.email,
      phone: tenant.phone ?? "", address: tenant.address ?? "",
      city: tenant.city ?? "", country: tenant.country,
      kra_pin: tenant.kra_pin ?? "",
      invoice_prefix: tenant.invoice_prefix, quote_prefix: tenant.quote_prefix, lpo_prefix: tenant.lpo_prefix,
      terms_and_conditions: tenant.terms_and_conditions ?? "",
      currency: tenant.currency, timezone: tenant.timezone,
    },
  });

  const currency = watch("currency");
  const timezone = watch("timezone");

  // Fetch bank accounts
  useEffect(() => {
    fetchBanks();
  }, []);

  async function fetchBanks() {
    setBankLoading(true);
    try {
      const res = await fetch("/api/bank-accounts");
      const json = await res.json();
      setBankAccounts(json.data ?? []);
    } catch { /* ignore */ } finally {
      setBankLoading(false);
    }
  }

  async function addBankAccount() {
    if (!newBank.bank_name || !newBank.account_number) {
      toast.error("Bank name and account number are required");
      return;
    }
    setBankAdding(true);
    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBank),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
      toast.success("Bank account added");
      setNewBank({ bank_name: "", account_name: "", account_number: "", branch: "", swift_code: "" });
      fetchBanks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add bank account");
    } finally {
      setBankAdding(false);
    }
  }

  async function removeBankAccount(id: string) {
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Bank account removed");
      fetchBanks();
    } catch {
      toast.error("Failed to remove bank account");
    }
  }

  async function setDefaultBank(id: string) {
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Default bank updated");
      fetchBanks();
    } catch {
      toast.error("Failed to update default bank");
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    // Instant preview
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      const json = await res.json() as { logo_url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setLogoUrl(json.logo_url!);
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
      setLogoPreview(logoUrl);
    } finally {
      setLogoUploading(false);
    }
  }

  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { toast.error(json.error ?? "Failed to save settings."); return; }
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">

      {/* ── Hero profile banner ──────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Background gradient */}
        <div className="h-28 bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600" />
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-violet-400/20 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />

        <div className="bg-white px-6 pb-5">
          <div className="flex flex-wrap items-end gap-4 -mt-10 relative z-10">
            {/* Logo upload zone */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Company logo" fill className="object-cover" />
                ) : (
                  <span className="text-2xl font-black text-white">{getInitials(tenant.name)}</span>
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
                title="Upload logo"
              >
                <Camera className="h-3.5 w-3.5 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            <div className="flex-1 min-w-0 pt-2">
              <h1 className="text-xl font-extrabold text-slate-900 truncate">{tenant.name}</h1>
              <p className="text-sm text-slate-400 truncate">{tenant.email}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0 pb-1">
              {isTrialing && daysLeft !== null ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border ${daysLeft > 7 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${daysLeft > 7 ? "bg-emerald-500" : "bg-amber-500"}`} />
                  Trial · {daysLeft}d left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <CheckCircle2 className="h-3 w-3" />
                  {tenant.subscription_plan.charAt(0).toUpperCase() + tenant.subscription_plan.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Logo upload hint */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={logoUploading}
            className="mt-3 flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-600 transition-colors group"
          >
            <Upload className="h-3.5 w-3.5 group-hover:text-indigo-600" />
            Click the camera icon or here to upload your company logo · PNG, JPG, SVG · Max 2MB
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Company Information ──────────────────────────────────────── */}
        <SectionCard icon={Building2} title="Company Information" description="Your business details shown on all documents and invoices." gradient="from-indigo-500 to-violet-600">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Company Name" error={errors.name?.message}>
                <Input {...register("name")} placeholder="Acme Corporation Ltd"
                  className={`h-10 bg-slate-50 border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 ${errors.name ? "border-red-400" : ""}`} />
              </Field>
            </div>
            <Field label="Email Address" error={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="info@company.co.ke"
                className={`h-10 bg-slate-50 border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 ${errors.email ? "border-red-400" : ""}`} />
            </Field>
            <Field label="Phone Number">
              <Input {...register("phone")} placeholder="+254 700 000 000"
                className="h-10 bg-slate-50 border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Street Address">
                <Input {...register("address")} placeholder="123 Kimathi Street, CBD"
                  className="h-10 bg-slate-50 border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" />
              </Field>
            </div>
            <Field label="City">
              <Input {...register("city")} placeholder="Nairobi"
                className="h-10 bg-slate-50 border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" />
            </Field>
            <Field label="Country">
              <Input {...register("country")} placeholder="Kenya"
                className="h-10 bg-slate-50 border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" />
            </Field>
            <Field label="KRA PIN" hint="Used for tax compliance and printed on invoices">
              <Input {...register("kra_pin")} placeholder="P000000000A"
                className="h-10 bg-slate-50 border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 font-mono" />
            </Field>
          </div>
        </SectionCard>

        {/* ── Banking Details (multiple accounts) ────────────────────── */}
        <SectionCard icon={Landmark} title="Banking Details" description="Bank accounts printed on invoices. Add multiple accounts for different payment methods." gradient="from-emerald-500 to-teal-600">
          {/* Existing bank accounts */}
          {bankLoading ? (
            <div className="text-sm text-slate-400 py-4 text-center">Loading bank accounts…</div>
          ) : bankAccounts.length === 0 ? (
            <div className="text-sm text-slate-400 py-4 text-center">No bank accounts added yet</div>
          ) : (
            <div className="space-y-3 mb-5">
              {bankAccounts.map((bank) => (
                <div key={bank.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 group">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Landmark className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{bank.bank_name}</p>
                      {bank.is_default && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{bank.account_number}</p>
                    {bank.account_name && <p className="text-xs text-slate-400">{bank.account_name}</p>}
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      {bank.branch && <span>{bank.branch}</span>}
                      {bank.swift_code && <span>SWIFT: {bank.swift_code}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!bank.is_default && (
                      <button type="button" onClick={() => setDefaultBank(bank.id)} title="Set as default"
                        className="w-7 h-7 rounded-lg hover:bg-emerald-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors">
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeBankAccount(bank.id)} title="Remove"
                      className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new bank account form */}
          <Separator className="mb-4" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add New Bank Account</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Bank Name *</Label>
              <Input placeholder="Equity Bank Kenya" value={newBank.bank_name}
                onChange={(e) => setNewBank((p) => ({ ...p, bank_name: e.target.value }))}
                className="h-9 bg-slate-50 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Account Number *</Label>
              <Input placeholder="0123456789" value={newBank.account_number}
                onChange={(e) => setNewBank((p) => ({ ...p, account_number: e.target.value }))}
                className="h-9 bg-slate-50 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Account Name</Label>
              <Input placeholder="Company Trading Account" value={newBank.account_name}
                onChange={(e) => setNewBank((p) => ({ ...p, account_name: e.target.value }))}
                className="h-9 bg-slate-50 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Branch</Label>
              <Input placeholder="Nairobi Branch" value={newBank.branch}
                onChange={(e) => setNewBank((p) => ({ ...p, branch: e.target.value }))}
                className="h-9 bg-slate-50 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">SWIFT Code</Label>
              <Input placeholder="EABORBI" value={newBank.swift_code}
                onChange={(e) => setNewBank((p) => ({ ...p, swift_code: e.target.value }))}
                className="h-9 bg-slate-50 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 font-mono text-sm" />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={addBankAccount} disabled={bankAdding}
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm w-full">
                {bankAdding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                Add Account
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* ── Document Settings ────────────────────────────────────────── */}
        <SectionCard icon={FileText} title="Document Settings" description="Number prefixes and default terms applied to all outgoing documents." gradient="from-amber-500 to-orange-500">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Invoice Prefix" error={errors.invoice_prefix?.message} hint="e.g. INV → INV-000001">
              <Input {...register("invoice_prefix")} placeholder="INV"
                className={`h-10 bg-slate-50 border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 font-mono ${errors.invoice_prefix ? "border-red-400" : ""}`} />
            </Field>
            <Field label="Quote Prefix" error={errors.quote_prefix?.message} hint="e.g. QT → QT-000001">
              <Input {...register("quote_prefix")} placeholder="QT"
                className={`h-10 bg-slate-50 border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 font-mono ${errors.quote_prefix ? "border-red-400" : ""}`} />
            </Field>
            <Field label="LPO Prefix" error={errors.lpo_prefix?.message} hint="e.g. LPO → LPO-000001">
              <Input {...register("lpo_prefix")} placeholder="LPO"
                className={`h-10 bg-slate-50 border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 font-mono ${errors.lpo_prefix ? "border-red-400" : ""}`} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Default Terms & Conditions" hint="Printed at the bottom of every invoice and quote">
              <Textarea {...register("terms_and_conditions")}
                placeholder="e.g. Payment is due within 30 days of invoice date. Late payments attract a 2% monthly interest charge. Goods remain the property of the seller until full payment is received."
                rows={5}
                className="bg-slate-50 border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 text-sm leading-relaxed resize-none" />
            </Field>
          </div>
        </SectionCard>

        {/* ── Regional Settings ────────────────────────────────────────── */}
        <SectionCard icon={Globe} title="Regional Settings" description="Currency, timezone and locale used across the entire platform." gradient="from-rose-500 to-pink-600">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Currency" error={errors.currency?.message}>
              <Select value={currency} onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}>
                <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:ring-rose-500/20 focus:border-rose-500">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["KES", "KES — Kenyan Shilling"],
                    ["USD", "USD — US Dollar"],
                    ["EUR", "EUR — Euro"],
                    ["GBP", "GBP — British Pound"],
                    ["TZS", "TZS — Tanzanian Shilling"],
                    ["UGX", "UGX — Ugandan Shilling"],
                    ["RWF", "RWF — Rwandan Franc"],
                    ["ETB", "ETB — Ethiopian Birr"],
                  ].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Timezone" error={errors.timezone?.message}>
              <Select value={timezone} onValueChange={(v) => setValue("timezone", v, { shouldValidate: true })}>
                <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:ring-rose-500/20 focus:border-rose-500">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["Africa/Nairobi", "Africa/Nairobi (EAT, UTC+3)"],
                    ["Africa/Kampala", "Africa/Kampala (EAT, UTC+3)"],
                    ["Africa/Dar_es_Salaam", "Africa/Dar_es_Salaam (EAT, UTC+3)"],
                    ["Africa/Kigali", "Africa/Kigali (CAT, UTC+2)"],
                    ["Africa/Lagos", "Africa/Lagos (WAT, UTC+1)"],
                    ["Africa/Johannesburg", "Africa/Johannesburg (SAST, UTC+2)"],
                    ["Africa/Addis_Ababa", "Africa/Addis_Ababa (EAT, UTC+3)"],
                    ["UTC", "UTC"],
                    ["Europe/London", "Europe/London (GMT/BST)"],
                  ].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionCard>

        {/* ── Subscription ─────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-linear-to-r from-slate-400 to-slate-600" />
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Subscription Plan</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isTrialing
                      ? `Free trial · ${daysLeft !== null ? `${daysLeft} days remaining` : "expires soon"}`
                      : `${tenant.subscription_plan} · Active`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${isTrialing ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {isTrialing ? "Trial" : "Active"}
                </span>
                <Button variant="outline" size="sm" type="button" className="text-xs h-8">
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Save bar ─────────────────────────────────────────────────── */}
        <div className={`sticky bottom-4 z-20 transition-all duration-300 ${isDirty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Settings2 className="h-4 w-4 text-amber-500" />
              <span>You have unsaved changes</span>
            </div>
            <Button
              type="submit"
              disabled={isSaving}
              className="gap-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 text-white font-semibold shadow-lg shadow-indigo-500/25 px-6"
            >
              {isSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                : <><Save className="h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
