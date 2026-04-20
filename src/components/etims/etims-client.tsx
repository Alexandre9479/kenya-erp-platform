"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileCheck, Settings2, Send, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Shield, Sparkles, Clock, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  PremiumHero,
  HeroStatGrid,
  HeroStat,
  EmptyState,
} from "@/components/ui/premium-hero";

type Config = {
  id: string;
  environment: "sandbox" | "production";
  device_type: "OSCU" | "VSCU";
  device_serial: string | null;
  kra_pin: string | null;
  branch_id: string | null;
  endpoint_url: string | null;
  api_key: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
} | null;

type Submission = {
  id: string;
  document_type: string;
  document_number: string;
  status: "pending" | "submitted" | "accepted" | "rejected" | "failed" | "cancelled";
  attempt_count: number;
  submitted_at: string | null;
  kra_invoice_no: string | null;
  kra_signature: string | null;
  kra_qr_code: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total_amount: number;
  status: string;
  customers?: { name: string; kra_pin: string | null } | null;
};

export function EtimsClient({
  initialConfig,
  initialSubmissions,
  recentInvoices,
}: {
  initialConfig: Config;
  initialSubmissions: Submission[];
  recentInvoices: Invoice[];
}) {
  const [tab, setTab] = useState<"config" | "submissions" | "submit">("config");
  const [config, setConfig] = useState<Config>(initialConfig);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [saving, setSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [form, setForm] = useState({
    environment: initialConfig?.environment ?? "sandbox",
    device_type: initialConfig?.device_type ?? "OSCU",
    device_serial: initialConfig?.device_serial ?? "",
    kra_pin: initialConfig?.kra_pin ?? "",
    branch_id: initialConfig?.branch_id ?? "00",
    endpoint_url: initialConfig?.endpoint_url ?? "https://etims-api-sbx.kra.go.ke",
    api_key: initialConfig?.api_key ?? "",
    is_active: initialConfig?.is_active ?? false,
  });

  const saveConfig = async () => {
    setSaving(true);
    setConfigMsg(null);
    try {
      const res = await fetch("/api/etims/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setConfig(json.data);
      setConfigMsg({ type: "ok", text: "eTIMS configuration saved." });
    } catch (e: any) {
      setConfigMsg({ type: "err", text: e.message });
    } finally { setSaving(false); }
  };

  const submitInvoice = async (invoiceId: string) => {
    setSubmitting(invoiceId);
    try {
      const res = await fetch("/api/etims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const json = await res.json();
      if (res.ok) {
        const r = await fetch("/api/etims/submissions");
        const j = await r.json();
        if (j.data) setSubmissions(j.data);
        toast.success("Submitted to eTIMS");
      } else {
        toast.error(json.error ?? "Submission failed");
      }
    } finally { setSubmitting(null); }
  };

  const reloadSubmissions = async () => {
    const res = await fetch("/api/etims/submissions");
    const json = await res.json();
    if (json.data) setSubmissions(json.data);
  };

  const acceptedCount = submissions.filter((s) => s.status === "accepted").length;
  const failedCount = submissions.filter((s) => s.status === "failed" || s.status === "rejected").length;
  const pendingCount = submissions.filter((s) => s.status === "pending" || s.status === "submitted").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PremiumHero
        gradient="emerald"
        icon={FileCheck}
        eyebrow={
          <>
            <Sparkles className="size-3 sm:size-3.5" />
            Tax Compliance · KRA eTIMS
          </>
        }
        title="KRA eTIMS"
        description={
          config?.is_active
            ? `Electronic tax invoice submission active (${config?.environment}). Device: ${config?.device_type}.`
            : "Electronic tax invoice submission — not yet configured."
        }
        actions={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm",
              config?.is_active
                ? "bg-emerald-400/25 text-white border-emerald-200/40"
                : "bg-amber-400/25 text-white border-amber-200/40"
            )}
          >
            <span className={cn("size-1.5 rounded-full", config?.is_active ? "bg-emerald-300 animate-pulse" : "bg-amber-300")} />
            {config?.is_active ? "Live" : "Setup required"}
          </span>
        }
      >
        <HeroStatGrid>
          <HeroStat icon={CheckCircle2} label="Accepted" value={String(acceptedCount)} sub="KRA approved" accent="success" />
          <HeroStat icon={Clock} label="Pending" value={String(pendingCount)} sub="in-flight" accent={pendingCount > 0 ? "warning" : "default"} />
          <HeroStat icon={XCircle} label="Failed" value={String(failedCount)} sub="needs retry" accent={failedCount > 0 ? "danger" : "default"} />
          <HeroStat icon={Activity} label="Total" value={String(submissions.length)} sub="all submissions" accent="info" />
        </HeroStatGrid>
      </PremiumHero>

      {!config?.is_active && (
        <Card className="border-amber-300 bg-linear-to-br from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="p-4 flex gap-3 items-start">
            <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 shadow-md shrink-0">
              <AlertCircle className="size-4 text-white" />
            </div>
            <div className="text-sm text-amber-900">
              <strong className="text-amber-950">eTIMS is mandatory</strong> for VAT-registered businesses in Kenya since 2024. Configure your device (OSCU/VSCU) below to start submitting invoices.
              You&apos;ll need: KRA PIN, device serial, branch ID, and eTIMS endpoint URL from your KRA onboarding.
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-max min-w-full">
            <TabsTrigger value="config" className="gap-1.5"><Settings2 className="size-4" />Configuration</TabsTrigger>
            <TabsTrigger value="submit" className="gap-1.5"><Send className="size-4" />Submit Invoice</TabsTrigger>
            <TabsTrigger value="submissions" className="gap-1.5"><FileCheck className="size-4" />Submissions</TabsTrigger>
          </TabsList>
        </div>

        {/* CONFIG */}
        <TabsContent value="config" className="space-y-4">
          <Card className="relative overflow-hidden border-slate-200 shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <Shield className="size-4 text-white" />
                </div>
                Device Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Environment</Label>
                  <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (testing)</SelectItem>
                      <SelectItem value="production">Production (live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Device type</Label>
                  <Select value={form.device_type} onValueChange={(v) => setForm({ ...form, device_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OSCU">OSCU (Online)</SelectItem>
                      <SelectItem value="VSCU">VSCU (Virtual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>KRA PIN</Label>
                  <Input value={form.kra_pin} onChange={(e) => setForm({ ...form, kra_pin: e.target.value })}
                    placeholder="P051234567X" />
                </div>
                <div className="space-y-1">
                  <Label>Device serial</Label>
                  <Input value={form.device_serial} onChange={(e) => setForm({ ...form, device_serial: e.target.value })}
                    placeholder="KRASCU..." />
                </div>
                <div className="space-y-1">
                  <Label>Branch ID</Label>
                  <Input value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    placeholder="00" />
                </div>
                <div className="space-y-1">
                  <Label>Endpoint URL</Label>
                  <Input value={form.endpoint_url} onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
                    placeholder="https://etims-api-sbx.kra.go.ke" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>API key (if required)</Label>
                  <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    placeholder="Bearer token or device API key" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Enable eTIMS submissions</Label>
              </div>
              {configMsg && (
                <div className={cn("rounded-lg p-3 text-sm flex items-start gap-2",
                  configMsg.type === "ok"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200")}>
                  {configMsg.type === "ok" ? <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="size-4 mt-0.5 shrink-0" />}
                  <span>{configMsg.text}</span>
                </div>
              )}
              <Button
                onClick={saveConfig}
                disabled={saving}
                className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md gap-1.5"
              >
                {saving ? "Saving…" : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBMIT */}
        <TabsContent value="submit" className="space-y-4">
          <Card className="relative overflow-hidden border-slate-200 shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="size-4 text-emerald-600" />
                Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {!config?.is_active ? (
                <EmptyState
                  icon={AlertCircle}
                  title="Configure eTIMS first"
                  description="Enable submissions in the Configuration tab before you can send invoices to KRA."
                />
              ) : recentInvoices.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  title="No finalized invoices"
                  description="Finalize invoices from Sales to queue them up for eTIMS submission."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-y border-slate-200">
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Date</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">KRA PIN</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Amount</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((inv) => {
                      const sub = submissions.find((s) => s.document_number === inv.invoice_number);
                      return (
                        <TableRow key={inv.id} className="hover:bg-emerald-50/30 transition-colors border-b border-slate-100">
                          <TableCell className="font-mono text-xs whitespace-nowrap text-emerald-700 font-medium">{inv.invoice_number}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-slate-500 tabular-nums">{inv.issue_date}</TableCell>
                          <TableCell className="text-sm text-slate-700">{inv.customers?.name ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500 tabular-nums">{inv.customers?.kra_pin ?? "—"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap font-semibold text-slate-900 tabular-nums">
                            KES {Number(inv.total_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {sub?.status === "accepted" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Submitted
                              </span>
                            ) : sub?.status === "failed" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => submitInvoice(inv.id)}
                                disabled={submitting === inv.id}
                                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 gap-1"
                              >
                                <RefreshCw className="size-3.5" />Retry
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => submitInvoice(inv.id)}
                                disabled={submitting === inv.id}
                                className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-1 shadow-sm"
                              >
                                <Send className="size-3.5" />{submitting === inv.id ? "Submitting…" : "Submit"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBMISSIONS */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={reloadSubmissions}
              className="gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
            >
              <RefreshCw className="size-3.5" />Refresh
            </Button>
          </div>
          <Card className="relative overflow-hidden border-slate-200 shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardContent className="p-0 overflow-x-auto pt-1">
              {submissions.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  title="No submissions yet"
                  description="Submit your first invoice from the Submit Invoice tab."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-y border-slate-200">
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Document</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Type</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Attempts</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">KRA Inv #</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Error</TableHead>
                      <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((s) => {
                      const cfg =
                        s.status === "accepted"
                          ? { className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500 animate-pulse", label: "Accepted" }
                          : s.status === "failed"
                            ? { className: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Failed" }
                            : s.status === "rejected"
                              ? { className: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Rejected" }
                              : s.status === "pending"
                                ? { className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Pending" }
                                : s.status === "submitted"
                                  ? { className: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", label: "Submitted" }
                                  : { className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: s.status };
                      return (
                        <TableRow key={s.id} className="hover:bg-emerald-50/30 transition-colors border-b border-slate-100">
                          <TableCell className="font-mono text-xs whitespace-nowrap text-slate-700">{s.document_number}</TableCell>
                          <TableCell className="text-xs capitalize text-slate-500">{s.document_type.replace("_", " ")}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold", cfg.className)}>
                              <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center text-slate-600 tabular-nums">{s.attempt_count}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">
                            {s.kra_invoice_no ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-rose-700 max-w-xs truncate" title={s.error_message ?? ""}>
                            {s.error_code && <span className="font-mono">{s.error_code}: </span>}
                            {s.error_message ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-slate-500 tabular-nums">
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleString("en-KE") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
