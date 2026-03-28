"use client";

import { useEffect, useState } from "react";
import {
  Building2, Save,
  Loader2, Plus, Trash2, CreditCard,
  FileText, Upload,
  CheckCircle, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURRENCIES, TIMEZONES } from "@/config/app";

interface BankDetail {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string;
  swiftCode: string;
  isPrimary: boolean;
}

interface TenantSettings {
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyCity: string;
  companyCountry: string;
  companyLogo: string;
  kraPin: string;
  vatNumber: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  fiscalYearStart: string;
  paymentTerms: string;
  termsAndConditions: string;
  bankDetails: BankDetail[];
  invoicePrefix: string;
  quotePrefix: string;
  lpoPrefix: string;
  grnPrefix: string;
  dnPrefix: string;
  receiptPrefix: string;
  subscription: string;
  trialEndsAt: string;
}

const tabs = [
  { key: "company", label: "Company Info", icon: Building2 },
  { key: "financial", label: "Financial", icon: CreditCard },
  { key: "banking", label: "Bank Details", icon: CreditCard },
  { key: "documents", label: "Document Settings", icon: FileText },
  { key: "terms", label: "Terms & Conditions", icon: FileText },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setLogoPreview(data.data.companyLogo || "");
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settings saved successfully!");
        fetchSettings();
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof TenantSettings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const addBank = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      bankDetails: [
        ...(settings.bankDetails || []),
        {
          bankName: "",
          accountName: "",
          accountNumber: "",
          branchName: "",
          swiftCode: "",
          isPrimary: false,
        },
      ],
    });
  };

  const updateBank = (index: number, field: keyof BankDetail, value: string | boolean) => {
    if (!settings) return;
    const banks = [...(settings.bankDetails || [])];
    banks[index] = { ...banks[index], [field]: value };
    if (field === "isPrimary" && value === true) {
      banks.forEach((b, i) => { if (i !== index) b.isPrimary = false; });
    }
    setSettings({ ...settings, bankDetails: banks });
  };

  const removeBank = (index: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      bankDetails: settings.bankDetails.filter((_, i) => i !== index),
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      if (settings) setSettings({ ...settings, companyLogo: base64 });
    };
    reader.readAsDataURL(file);
    toast.success("Logo ready — click Save to apply");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Company Settings</h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage your company profile, branding and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25 shrink-0"
        >
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />
          }
          Save Changes
        </button>
      </div>

      {/* Subscription Banner */}
      <div className={cn(
        "p-4 rounded-2xl border flex items-center gap-3",
        settings.subscription === "trial"
          ? "bg-yellow-50 border-yellow-200"
          : "bg-green-50 border-green-200"
      )}>
        {settings.subscription === "trial"
          ? <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          : <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        }
        <div>
          <p className={cn(
            "font-semibold text-sm",
            settings.subscription === "trial" ? "text-yellow-800" : "text-green-800"
          )}>
            {settings.subscription === "trial"
              ? `Trial Period — Expires ${settings.trialEndsAt
                  ? new Date(settings.trialEndsAt).toLocaleDateString()
                  : "soon"}`
              : "Active Subscription"
            }
          </p>
          <p className={cn(
            "text-xs",
            settings.subscription === "trial" ? "text-yellow-600" : "text-green-600"
          )}>
            {settings.subscription === "trial"
              ? "Upgrade to continue using the ERP after trial ends"
              : "Your subscription is active and all features are enabled"
            }
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-52 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left",
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6">

          {/* ── COMPANY INFO ── */}
          {activeTab === "company" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-slate-900 text-lg border-b border-slate-100 pb-3">
                Company Information
              </h3>

              {/* Logo */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-3 block">
                  Company Logo
                </label>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-slate-400">No logo</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
                      <Upload className="w-4 h-4" />
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    <p className="text-xs text-slate-400 mt-2">
                      PNG, JPG up to 2MB. Recommended: 200×200px
                    </p>
                    {logoPreview && (
                      <button
                        onClick={() => {
                          setLogoPreview("");
                          setSettings({ ...settings, companyLogo: "" });
                        }}
                        className="text-xs text-red-500 hover:text-red-600 mt-1 block"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Company Name *
                  </label>
                  <input
                    value={settings.companyName}
                    onChange={e => updateField("companyName", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Company Ltd"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Company Email *
                  </label>
                  <input
                    value={settings.companyEmail}
                    onChange={e => updateField("companyEmail", e.target.value)}
                    type="email"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="info@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Phone Number *
                  </label>
                  <input
                    value={settings.companyPhone}
                    onChange={e => updateField("companyPhone", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+254 700 000 000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">City</label>
                  <input
                    value={settings.companyCity || ""}
                    onChange={e => updateField("companyCity", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nairobi"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Physical Address *
                </label>
                <textarea
                  value={settings.companyAddress}
                  onChange={e => updateField("companyAddress", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="P.O Box 1234, Nairobi, Kenya"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">KRA PIN</label>
                  <input
                    value={settings.kraPin || ""}
                    onChange={e => updateField("kraPin", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A123456789Z"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    VAT Number
                  </label>
                  <input
                    value={settings.vatNumber || ""}
                    onChange={e => updateField("vatNumber", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VAT/ABC/2024"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── FINANCIAL ── */}
          {activeTab === "financial" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-slate-900 text-lg border-b border-slate-100 pb-3">
                Financial Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={e => {
                      const cur = CURRENCIES.find(c => c.code === e.target.value);
                      if (cur) setSettings({ ...settings, currency: cur.code, currencySymbol: cur.symbol });
                    }}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Currency Symbol
                  </label>
                  <input
                    value={settings.currencySymbol}
                    onChange={e => updateField("currencySymbol", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="KSh"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={e => updateField("timezone", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIMEZONES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Fiscal Year Start
                  </label>
                  <select
                    value={settings.fiscalYearStart}
                    onChange={e => updateField("fiscalYearStart", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[
                      { value: "01-01", label: "January 1" },
                      { value: "04-01", label: "April 1" },
                      { value: "07-01", label: "July 1" },
                      { value: "10-01", label: "October 1" },
                    ].map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Default Payment Terms
                </label>
                <select
                  value={settings.paymentTerms || "30"}
                  onChange={e => updateField("paymentTerms", e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Due on Receipt</option>
                  <option value="7">Net 7 days</option>
                  <option value="14">Net 14 days</option>
                  <option value="30">Net 30 days</option>
                  <option value="60">Net 60 days</option>
                  <option value="90">Net 90 days</option>
                </select>
              </div>
            </div>
          )}

          {/* ── BANKING ── */}
          {activeTab === "banking" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-900 text-lg">Bank Accounts</h3>
                <button
                  onClick={addBank}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Bank
                </button>
              </div>

              {(!settings.bankDetails || settings.bankDetails.length === 0) ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-900">No bank accounts added</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Add your bank details to appear on invoices and LPOs
                  </p>
                  <button
                    onClick={addBank}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Add Bank Account
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.bankDetails.map((bank, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-2xl overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-700">
                            Bank Account {index + 1}
                          </span>
                          {bank.isPrimary && (
                            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeBank(index)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">
                              Bank Name *
                            </label>
                            <input
                              value={bank.bankName}
                              onChange={e => updateBank(index, "bankName", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g. Equity Bank"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">
                              Account Name *
                            </label>
                            <input
                              value={bank.accountName}
                              onChange={e => updateBank(index, "accountName", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Company Name Ltd"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">
                              Account Number *
                            </label>
                            <input
                              value={bank.accountNumber}
                              onChange={e => updateBank(index, "accountNumber", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0123456789"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">
                              Branch Name
                            </label>
                            <input
                              value={bank.branchName}
                              onChange={e => updateBank(index, "branchName", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nairobi Branch"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">
                              Swift Code
                            </label>
                            <input
                              value={bank.swiftCode}
                              onChange={e => updateBank(index, "swiftCode", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="EQBLKENAXXX"
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors w-full">
                              <input
                                type="checkbox"
                                checked={bank.isPrimary}
                                onChange={e => updateBank(index, "isPrimary", e.target.checked)}
                                className="w-4 h-4 rounded accent-blue-600"
                              />
                              <span className="text-sm font-medium text-slate-700">
                                Set as Primary
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === "documents" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-slate-900 text-lg border-b border-slate-100 pb-3">
                Document Numbering Prefixes
              </h3>
              <p className="text-sm text-slate-500">
                Set the prefix for auto-generated document numbers. Example: INV-00001
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Invoice Prefix", field: "invoicePrefix", example: "INV-00001" },
                  { label: "Quote Prefix", field: "quotePrefix", example: "QTE-00001" },
                  { label: "LPO Prefix", field: "lpoPrefix", example: "LPO-00001" },
                  { label: "GRN Prefix", field: "grnPrefix", example: "GRN-00001" },
                  { label: "Delivery Note Prefix", field: "dnPrefix", example: "DN-00001" },
                  { label: "Receipt Prefix", field: "receiptPrefix", example: "RCP-00001" },
                ].map((item) => (
                  <div key={item.field}>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                      {item.label}
                    </label>
                    <input
                      value={(settings as any)[item.field] || ""}
                      onChange={e => updateField(item.field as keyof TenantSettings, e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={item.example.split("-")[0]}
                    />
                    <p className="text-xs text-slate-400 mt-1">e.g. {item.example}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TERMS ── */}
          {activeTab === "terms" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-slate-900 text-lg border-b border-slate-100 pb-3">
                Terms & Conditions
              </h3>
              <p className="text-sm text-slate-500">
                These will appear at the bottom of all your invoices, LPOs and other documents.
              </p>
              <textarea
                value={settings.termsAndConditions || ""}
                onChange={e => updateField("termsAndConditions", e.target.value)}
                rows={12}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={
                  `1. Payment is due within the agreed payment terms.\n` +
                  `2. Late payments will attract interest at 2% per month.\n` +
                  `3. Goods once sold cannot be returned without prior authorization.\n` +
                  `4. All disputes are subject to Kenyan law and jurisdiction.\n` +
                  `5. Prices are subject to change without notice.`
                }
              />
              <p className="text-xs text-slate-400">
                {(settings.termsAndConditions || "").length} characters
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}