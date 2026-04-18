"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileCheck, Settings2, Send, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Copy, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-green-700 via-emerald-700 to-teal-800 p-4 sm:p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
            <FileCheck className="size-5 sm:size-7 text-white" />
          </div>
          <div>
            <p className="text-emerald-100 text-xs sm:text-sm font-medium tracking-wide uppercase">Tax Compliance</p>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">KRA eTIMS</h1>
            <p className="text-emerald-100 text-sm mt-0.5 hidden sm:block">
              Electronic tax invoice submission — {config?.is_active ? (
                <span className="inline-flex items-center gap-1 bg-emerald-500/30 rounded px-1.5 py-0.5 text-xs">Active</span>
              ) : <span className="text-amber-200">Not configured</span>}
            </p>
          </div>
        </div>
      </div>

      {!config?.is_active && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertCircle className="size-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>eTIMS is mandatory</strong> for VAT-registered businesses in Kenya since 2024. Configure your device (OSCU/VSCU) below to start submitting invoices.
              You'll need: KRA PIN, device serial, branch ID, and eTIMS endpoint URL from your KRA onboarding.
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
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="size-4" />Device Credentials</CardTitle></CardHeader>
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
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? "Saving…" : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBMIT */}
        <TabsContent value="submit" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {!config?.is_active ? (
                <div className="text-center py-10 px-4">
                  <AlertCircle className="size-10 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Configure eTIMS first.</p>
                </div>
              ) : recentInvoices.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <FileCheck className="size-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No finalized invoices to submit.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Invoice</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Customer</TableHead>
                      <TableHead className="whitespace-nowrap">KRA PIN</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((inv) => {
                      const sub = submissions.find((s) => s.document_number === inv.invoice_number);
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{inv.invoice_number}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{inv.issue_date}</TableCell>
                          <TableCell className="text-sm">{inv.customers?.name ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{inv.customers?.kra_pin ?? "—"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            KES {Number(inv.total_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {sub?.status === "accepted" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                <CheckCircle2 className="size-3" />Submitted
                              </Badge>
                            ) : sub?.status === "failed" ? (
                              <Button size="sm" variant="outline" onClick={() => submitInvoice(inv.id)}
                                disabled={submitting === inv.id}>
                                <RefreshCw className="size-3.5 mr-1" />Retry
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => submitInvoice(inv.id)} disabled={submitting === inv.id}>
                                <Send className="size-3.5 mr-1" />{submitting === inv.id ? "Submitting…" : "Submit"}
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
            <Button size="sm" variant="outline" onClick={reloadSubmissions}>
              <RefreshCw className="size-3.5 mr-1" />Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {submissions.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <FileCheck className="size-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No submissions yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Document</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Attempts</TableHead>
                      <TableHead className="whitespace-nowrap">KRA Invoice No.</TableHead>
                      <TableHead className="whitespace-nowrap">Error</TableHead>
                      <TableHead className="whitespace-nowrap">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{s.document_number}</TableCell>
                        <TableCell className="text-xs capitalize">{s.document_type.replace("_", " ")}</TableCell>
                        <TableCell>
                          {s.status === "accepted" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"><CheckCircle2 className="size-3" />Accepted</Badge>}
                          {s.status === "failed" && <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><XCircle className="size-3" />Failed</Badge>}
                          {s.status === "pending" && <Badge variant="outline">Pending</Badge>}
                          {s.status === "rejected" && <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-center">{s.attempt_count}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.kra_invoice_no ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-red-700 max-w-xs truncate" title={s.error_message ?? ""}>
                          {s.error_code && <span className="font-mono">{s.error_code}: </span>}
                          {s.error_message ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {s.submitted_at ? new Date(s.submitted_at).toLocaleString("en-KE") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
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
