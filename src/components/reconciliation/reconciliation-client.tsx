"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Banknote, Upload, Sparkles, CheckCircle2, AlertCircle, FileText,
  Link2, Unlink, XCircle, Smartphone, Trash2, Calendar, Wallet,
  TrendingUp, TrendingDown, Receipt, Inbox, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type BankAccount = { id: string; bank_name: string; account_number: string; branch: string | null; is_default: boolean };
type PaymentChannel = {
  id: string;
  name: string;
  channel_type: "cash" | "mpesa_till" | "mpesa_paybill" | "mpesa_send" | "bank" | "cheque" | "card" | "other";
  mpesa_shortcode: string | null;
  is_default: boolean;
  is_active: boolean;
  bank_account_id: string | null;
};
type Statement = {
  id: string;
  statement_date: string;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number;
  closing_balance: number;
  source: string;
  filename: string | null;
  line_count: number;
  bank_account_id: string | null;
  payment_channel_id?: string | null;
  bank_accounts?: { bank_name: string; account_number: string } | null;
  payment_channels?: { name: string; channel_type: string; mpesa_shortcode: string | null } | null;
};
type Line = {
  id: string;
  line_date: string;
  description: string;
  reference: string | null;
  amount: number;
  running_balance: number | null;
  payer_name: string | null;
  payer_phone: string | null;
  status: "unmatched" | "matched" | "ignored" | "pending";
  match_type: string | null;
  match_confidence: number;
  matched_receipt_id: string | null;
  matched_expense_id: string | null;
  receipts?: { receipt_number: string; amount: number | string } | null;
  expenses?: { expense_number: string; category: string } | null;
};
type AvailReceipt = {
  id: string; receipt_number: string; amount: number | string;
  payment_date: string; reference: string | null;
  customers?: { name: string } | null;
};
type AvailExpense = {
  id: string; expense_number: string; amount: number | string;
  expense_date: string; category: string; description: string;
};

const TONES = {
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  sky:     "from-sky-500 to-indigo-600 shadow-sky-500/30",
  amber:   "from-amber-500 to-orange-600 shadow-amber-500/30",
  rose:    "from-rose-500 to-pink-600 shadow-rose-500/30",
  violet:  "from-violet-500 to-purple-600 shadow-violet-500/30",
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
        <div className="text-lg font-bold text-white truncate">{value}</div>
        {hint && <div className="text-[10px] text-white/50 truncate">{hint}</div>}
      </div>
    </div>
  );
}

const sourceLabel = (s: Pick<Statement, "bank_accounts" | "payment_channels">) => {
  if (s.bank_accounts) return `${s.bank_accounts.bank_name} — ${s.bank_accounts.account_number}`;
  if (s.payment_channels) {
    return `${s.payment_channels.name}${s.payment_channels.mpesa_shortcode ? ` (${s.payment_channels.mpesa_shortcode})` : ""}`;
  }
  return "—";
};

const money = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CHANNEL_TYPE_LABEL: Record<PaymentChannel["channel_type"], string> = {
  cash: "Cash",
  mpesa_till: "M-Pesa Till",
  mpesa_paybill: "M-Pesa Paybill",
  mpesa_send: "M-Pesa Send Money",
  bank: "Bank",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export function ReconciliationClient({
  initialBankAccounts, initialStatements, initialPaymentChannels = [],
}: {
  initialBankAccounts: BankAccount[];
  initialStatements: Statement[];
  initialPaymentChannels?: PaymentChannel[];
}) {
  const [tab, setTab] = useState<"import" | "workbench" | "history">("import");
  const [bankAccounts] = useState(initialBankAccounts);
  const [statements, setStatements] = useState(initialStatements);
  const [paymentChannels] = useState(initialPaymentChannels);

  const nonBankChannels = paymentChannels.filter((c) => c.channel_type !== "bank");

  const defaultSource =
    initialBankAccounts.find((b) => b.is_default)?.id
      ? `bank:${initialBankAccounts.find((b) => b.is_default)!.id}`
      : initialBankAccounts[0]
        ? `bank:${initialBankAccounts[0].id}`
        : nonBankChannels[0]
          ? `channel:${nonBankChannels[0].id}`
          : "";
  const [importSourceKey, setImportSourceKey] = useState(defaultSource);
  const [importSource, setImportSource] = useState<"csv" | "mpesa">("csv");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<{
    statement: Statement | null;
    lines: Line[];
    availableReceipts: AvailReceipt[];
    availableExpenses: AvailExpense[];
  } | null>(null);
  const [loadingWorkbench, setLoadingWorkbench] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [matchSheet, setMatchSheet] = useState<Line | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadStatements = async () => {
    const res = await fetch("/api/reconciliation/statements");
    const json = await res.json();
    if (json.data) setStatements(json.data);
  };

  const openWorkbench = async (id: string) => {
    setSelectedStatementId(id);
    setTab("workbench");
    setLoadingWorkbench(true);
    try {
      const res = await fetch(`/api/reconciliation/statements?statement_id=${id}`);
      const json = await res.json();
      if (json.data) {
        setWorkbench({
          statement: json.data.statement,
          lines: json.data.lines,
          availableReceipts: json.data.available_receipts,
          availableExpenses: json.data.available_expenses,
        });
      }
    } finally {
      setLoadingWorkbench(false);
    }
  };

  const handleImport = async () => {
    if (!importSourceKey || !importFile) {
      toast.error("Select a payment source and a CSV file.");
      return;
    }
    const [kind, sourceId] = importSourceKey.split(":");
    setImporting(true);
    try {
      const csv_text = await importFile.text();
      const res = await fetch("/api/reconciliation/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: kind === "bank" ? sourceId : null,
          payment_channel_id: kind === "channel" ? sourceId : null,
          source: importSource,
          filename: importFile.name,
          csv_text,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Import failed"); return; }
      toast.success(`Imported ${json.data.line_count} transactions`);
      await loadStatements();
      await openWorkbench(json.data.statement.id);
      setImportFile(null);
    } finally {
      setImporting(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!selectedStatementId) return;
    setAutoMatching(true);
    try {
      const res = await fetch("/api/reconciliation/auto-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement_id: selectedStatementId }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Matched ${json.data?.matched ?? 0} lines`);
        await openWorkbench(selectedStatementId);
      } else {
        toast.error(json.error ?? "Auto-match failed");
      }
    } finally {
      setAutoMatching(false);
    }
  };

  const patchLine = async (lineId: string, action: string, target?: { id: string; type: "receipt" | "expense" }) => {
    const res = await fetch(`/api/reconciliation/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target_id: target?.id, target_type: target?.type }),
    });
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Action failed"); return; }
    if (selectedStatementId) await openWorkbench(selectedStatementId);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/reconciliation/statements?id=${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    await loadStatements();
    if (selectedStatementId === deleteId) {
      setSelectedStatementId(null);
      setWorkbench(null);
      setTab("history");
    }
    toast.success("Statement deleted");
  };

  const summary = useMemo(() => {
    if (!workbench) return null;
    const matched = workbench.lines.filter((l) => l.status === "matched");
    const unmatched = workbench.lines.filter((l) => l.status === "unmatched");
    const ignored = workbench.lines.filter((l) => l.status === "ignored");
    const credits = workbench.lines.reduce((s, l) => s + (l.amount > 0 ? l.amount : 0), 0);
    const debits = workbench.lines.reduce((s, l) => s + (l.amount < 0 ? l.amount : 0), 0);
    return { matched: matched.length, unmatched: unmatched.length, ignored: ignored.length, credits, debits };
  }, [workbench]);

  const heroSummary = useMemo(() => {
    const total = statements.reduce((s, st) => s + st.line_count, 0);
    const last = statements[0];
    return { statements: statements.length, lines: total, last: last?.statement_date ?? "—" };
  }, [statements]);

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-14"
        style={{ background: "linear-gradient(135deg, #042f2e 0%, #115e59 45%, #0891b2 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-cyan-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-100 backdrop-blur">
            <Banknote className="h-3.5 w-3.5" />
            <span>Finance · Reconciliation</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Bank &amp; M-Pesa Reconciliation</h1>
          <p className="mt-2 text-emerald-100/80 text-sm md:text-base max-w-2xl">
            Import statements, auto-match against receipts and expenses, and resolve the rest line by line — no spreadsheets required.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat label="Statements" value={heroSummary.statements} icon={FileText} tone="emerald" hint={`Last ${heroSummary.last}`} />
            <HeroStat label="Total lines" value={heroSummary.lines.toLocaleString()} icon={Layers} tone="sky" />
            <HeroStat label="Matched" value={summary?.matched ?? 0} icon={CheckCircle2} tone="violet" hint={workbench ? `Active workbench` : "Open a statement"} />
            <HeroStat label="Unmatched" value={summary?.unmatched ?? 0} icon={AlertCircle} tone="amber" hint={workbench ? "Needs attention" : "—"} />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl space-y-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
              <CardContent className="p-4 md:p-5">
                <TabsList className="h-10 bg-slate-100">
                  <TabsTrigger value="import" className="data-[state=active]:bg-white gap-1.5"><Upload className="h-3.5 w-3.5" /> Import</TabsTrigger>
                  <TabsTrigger value="workbench" className="data-[state=active]:bg-white gap-1.5" disabled={!selectedStatementId}>
                    <Link2 className="h-3.5 w-3.5" /> Workbench
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-white gap-1.5"><FileText className="h-3.5 w-3.5" /> History</TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            {/* ── IMPORT TAB ──────────────────────────── */}
            <TabsContent value="import" className="space-y-4 mt-5">
              <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 shadow shadow-emerald-500/30">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                    Import Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {bankAccounts.length === 0 && nonBankChannels.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                      </div>
                      <p className="mt-3 text-sm text-amber-900">
                        No payment sources yet. Add a bank account or M-Pesa till in <strong>Settings → Payment Methods</strong> first.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Payment source</Label>
                          <Select value={importSourceKey} onValueChange={setImportSourceKey}>
                            <SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger>
                            <SelectContent>
                              {bankAccounts.length > 0 && (
                                <>
                                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bank Accounts</div>
                                  {bankAccounts.map((b) => (
                                    <SelectItem key={`bank:${b.id}`} value={`bank:${b.id}`}>
                                      {b.bank_name} — {b.account_number}{b.is_default && " (default)"}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {nonBankChannels.length > 0 && (
                                <>
                                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">M-Pesa &amp; Other Channels</div>
                                  {nonBankChannels.map((c) => (
                                    <SelectItem key={`channel:${c.id}`} value={`channel:${c.id}`}>
                                      {c.name}{c.mpesa_shortcode ? ` (${c.mpesa_shortcode})` : ""} — {CHANNEL_TYPE_LABEL[c.channel_type]}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Statement format</Label>
                          <Select value={importSource} onValueChange={(v) => setImportSource(v as typeof importSource)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="csv">
                                <div className="flex items-center gap-2"><Banknote className="h-4 w-4" />Bank CSV (generic)</div>
                              </SelectItem>
                              <SelectItem value="mpesa">
                                <div className="flex items-center gap-2"><Smartphone className="h-4 w-4" />M-Pesa Statement</div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>CSV file</Label>
                        <Input type="file" accept=".csv,.txt" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
                        <p className="text-xs text-slate-500">
                          {importSource === "mpesa"
                            ? "Export your M-Pesa statement from the Safaricom portal as CSV."
                            : "Expected columns: date, description, reference, debit/credit (or amount), balance."}
                        </p>
                      </div>

                      <Separator />

                      <Button onClick={handleImport} disabled={importing || !importFile}
                        className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                        {importing ? "Importing…" : "Import & Parse"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── WORKBENCH TAB ──────────────────────────── */}
            <TabsContent value="workbench" className="space-y-4 mt-5">
              {loadingWorkbench && (
                <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
                  <CardContent className="p-12 text-center text-sm text-slate-500">Loading workbench…</CardContent>
                </Card>
              )}
              {!loadingWorkbench && workbench && (
                <>
                  <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <Card className="relative overflow-hidden border-slate-200/80">
                      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 to-teal-500" />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><CheckCircle2 className="h-3 w-3" /> Matched</div>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">{summary?.matched ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden border-slate-200/80">
                      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-500 to-orange-500" />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><AlertCircle className="h-3 w-3" /> Unmatched</div>
                        <p className="mt-1 text-2xl font-bold text-amber-700">{summary?.unmatched ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden border-slate-200/80">
                      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-500 to-indigo-500" />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><TrendingUp className="h-3 w-3" /> Credits in</div>
                        <p className="mt-1 text-lg font-bold text-emerald-700 tabular-nums">KES {money(summary?.credits)}</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden border-slate-200/80">
                      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-rose-500 to-pink-500" />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><TrendingDown className="h-3 w-3" /> Debits out</div>
                        <p className="mt-1 text-lg font-bold text-rose-700 tabular-nums">KES {money(Math.abs(summary?.debits ?? 0))}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
                    <CardContent className="p-4 flex flex-wrap items-center gap-2">
                      <Button onClick={handleAutoMatch} disabled={autoMatching}
                        className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        {autoMatching ? "Matching…" : "Auto-match"}
                      </Button>
                      <Badge variant="outline" className="gap-1 bg-slate-50">
                        <Calendar className="h-3 w-3" />
                        {workbench.statement?.period_start} → {workbench.statement?.period_end}
                      </Badge>
                      {workbench.statement && (
                        <Badge variant="outline" className="gap-1 bg-slate-50">
                          <Banknote className="h-3 w-3" /> {sourceLabel(workbench.statement)}
                        </Badge>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                          <Receipt className="h-3 w-3" /> {workbench.availableReceipts.length} receipts
                        </Badge>
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1">
                          <Inbox className="h-3 w-3" /> {workbench.availableExpenses.length} expenses
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                    <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 shadow shadow-emerald-500/30">
                          <Layers className="h-4 w-4 text-white" />
                        </div>
                        Statement Lines
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                            <TableHead className="whitespace-nowrap">Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Amount (KES)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workbench.lines.map((l) => (
                            <TableRow key={l.id} className={cn(
                              "hover:bg-slate-50/50",
                              l.status === "matched" && "bg-emerald-50/30",
                              l.status === "ignored" && "bg-slate-50 text-slate-400",
                            )}>
                              <TableCell className="whitespace-nowrap text-xs text-slate-600">{l.line_date}</TableCell>
                              <TableCell className="max-w-xs">
                                <div className="text-sm font-medium text-slate-900 truncate" title={l.description}>{l.description}</div>
                                {l.payer_name && (
                                  <div className="text-xs text-slate-500">{l.payer_name}{l.payer_phone && ` · ${l.payer_phone}`}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-slate-600">{l.reference || "—"}</TableCell>
                              <TableCell className={cn(
                                "text-right whitespace-nowrap font-semibold tabular-nums",
                                l.amount > 0 ? "text-emerald-700" : "text-rose-700",
                              )}>
                                {l.amount > 0 ? "+" : ""}{money(l.amount)}
                              </TableCell>
                              <TableCell>
                                {l.status === "matched" && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> {l.match_confidence}%
                                  </Badge>
                                )}
                                {l.status === "unmatched" && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 border">Unmatched</Badge>
                                )}
                                {l.status === "ignored" && (
                                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 border">Ignored</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                {l.receipts && <span>Receipt {l.receipts.receipt_number}</span>}
                                {l.expenses && <span>Expense {l.expenses.expense_number}</span>}
                                {!l.receipts && !l.expenses && "—"}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {l.status === "matched" ? (
                                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100" onClick={() => patchLine(l.id, "unmatch")}>
                                    <Unlink className="h-3.5 w-3.5" />
                                  </Button>
                                ) : l.status === "unmatched" ? (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-sky-50 hover:text-sky-700" onClick={() => setMatchSheet(l)}>
                                      <Link2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100" onClick={() => patchLine(l.id, "ignore")}>
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100" onClick={() => patchLine(l.id, "unmatch")}>
                                    <Unlink className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ── HISTORY TAB ──────────────────────────── */}
            <TabsContent value="history" className="space-y-4 mt-5">
              <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 shadow shadow-emerald-500/30">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    Imported Statements
                    <Badge variant="outline" className="ml-auto bg-slate-50 text-slate-600 border-slate-200">
                      {statements.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {statements.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                        <FileText className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-700">No statements imported</p>
                      <p className="text-xs text-slate-500">Use the Import tab to upload your first statement.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead>Payment Source</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead className="whitespace-nowrap">Period</TableHead>
                          <TableHead className="text-right">Lines</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Closing</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statements.map((s) => (
                          <TableRow key={s.id} className="hover:bg-slate-50/50">
                            <TableCell className="whitespace-nowrap text-xs text-slate-600">{s.statement_date}</TableCell>
                            <TableCell className="text-sm text-slate-800">{sourceLabel(s)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize gap-1 bg-slate-50">
                                {s.source === "mpesa" ? <Smartphone className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                                {s.source}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">{s.period_start} → {s.period_end}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.line_count}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">{money(s.closing_balance)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-sky-50 hover:text-sky-700" onClick={() => openWorkbench(s.id)}>
                                <Link2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-rose-50 hover:text-rose-600" onClick={() => setDeleteId(s.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
      </div>

      {/* Manual match sheet */}
      <Sheet open={!!matchSheet} onOpenChange={(o) => !o && setMatchSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-indigo-600 shadow shadow-sky-500/30">
                <Link2 className="h-4 w-4 text-white" />
              </div>
              Manual Match
            </SheetTitle>
            <SheetDescription>Pick a matching receipt or expense for this bank line.</SheetDescription>
          </SheetHeader>
          {matchSheet && workbench && (
            <div className="mt-6 space-y-4 px-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Bank line</div>
                <div className="mt-1 flex justify-between gap-2 items-start">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{matchSheet.description}</div>
                    <div className="text-xs text-slate-500">{matchSheet.line_date} · {matchSheet.reference || "no ref"}</div>
                  </div>
                  <div className={cn(
                    "text-lg font-bold tabular-nums",
                    matchSheet.amount > 0 ? "text-emerald-700" : "text-rose-700",
                  )}>
                    {matchSheet.amount > 0 ? "+" : ""}{money(matchSheet.amount)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                  {matchSheet.amount > 0 ? <><Receipt className="h-3 w-3" /> Available receipts</> : <><Wallet className="h-3 w-3" /> Available expenses</>}
                </Label>
                <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y">
                  {matchSheet.amount > 0
                    ? workbench.availableReceipts.length === 0
                      ? <div className="p-6 text-sm text-slate-500 text-center">No available receipts in period.</div>
                      : workbench.availableReceipts.map((r) => (
                        <button
                          key={r.id}
                          className="w-full p-3 text-left hover:bg-sky-50 flex justify-between items-center gap-2 transition"
                          onClick={() => {
                            patchLine(matchSheet.id, "match", { id: r.id, type: "receipt" });
                            setMatchSheet(null);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900">{r.receipt_number}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {r.customers?.name ?? "—"} · {r.payment_date}
                            </div>
                          </div>
                          <div className="text-sm font-bold tabular-nums shrink-0 text-emerald-700">KES {money(r.amount)}</div>
                        </button>
                      ))
                    : workbench.availableExpenses.length === 0
                      ? <div className="p-6 text-sm text-slate-500 text-center">No available expenses in period.</div>
                      : workbench.availableExpenses.map((e) => (
                        <button
                          key={e.id}
                          className="w-full p-3 text-left hover:bg-sky-50 flex justify-between items-center gap-2 transition"
                          onClick={() => {
                            patchLine(matchSheet.id, "match", { id: e.id, type: "expense" });
                            setMatchSheet(null);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900">{e.expense_number}</div>
                            <div className="text-xs text-slate-500 truncate">{e.category} · {e.expense_date}</div>
                          </div>
                          <div className="text-sm font-bold tabular-nums shrink-0 text-rose-700">KES {money(e.amount)}</div>
                        </button>
                      ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete statement?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the imported statement and all its lines. Matches will be undone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
