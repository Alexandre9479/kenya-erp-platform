"use client";

import { useState, useMemo } from "react";
import {
  Banknote, Upload, Sparkles, CheckCircle2, AlertCircle, FileText,
  Link2, Unlink, XCircle, Smartphone, Trash2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
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

const sourceLabel = (s: Pick<Statement, "bank_accounts" | "payment_channels">) => {
  if (s.bank_accounts) return `${s.bank_accounts.bank_name} — ${s.bank_accounts.account_number}`;
  if (s.payment_channels) {
    return `${s.payment_channels.name}${s.payment_channels.mpesa_shortcode ? ` (${s.payment_channels.mpesa_shortcode})` : ""}`;
  }
  return "—";
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
  initialBankAccounts,
  initialStatements,
  initialPaymentChannels = [],
}: {
  initialBankAccounts: BankAccount[];
  initialStatements: Statement[];
  initialPaymentChannels?: PaymentChannel[];
}) {
  const [tab, setTab] = useState<"import" | "workbench" | "history">("import");
  const [bankAccounts] = useState(initialBankAccounts);
  const [statements, setStatements] = useState(initialStatements);
  const [paymentChannels] = useState(initialPaymentChannels);

  // Non-bank channels (bank-type channels are shown via the bank_accounts list instead)
  const nonBankChannels = paymentChannels.filter((c) => c.channel_type !== "bank");

  // Import state — encoded as "bank:<id>" or "channel:<id>"
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
  const [importMessage, setImportMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Workbench state
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<{
    statement: Statement | null;
    lines: Line[];
    availableReceipts: AvailReceipt[];
    availableExpenses: AvailExpense[];
  } | null>(null);
  const [loadingWorkbench, setLoadingWorkbench] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [matchDialog, setMatchDialog] = useState<{ line: Line; open: boolean } | null>(null);
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
      setImportMessage({ type: "err", text: "Select a payment source and a CSV file." });
      return;
    }
    const [kind, sourceId] = importSourceKey.split(":");
    setImporting(true);
    setImportMessage(null);
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
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setImportMessage({
        type: "ok",
        text: `Imported ${json.data.line_count} transactions. Opening workbench…`,
      });
      await loadStatements();
      await openWorkbench(json.data.statement.id);
      setImportFile(null);
    } catch (e: any) {
      setImportMessage({ type: "err", text: e.message });
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
      if (json.data) {
        await openWorkbench(selectedStatementId);
      }
    } finally {
      setAutoMatching(false);
    }
  };

  const patchLine = async (lineId: string, action: string, target?: { id: string; type: "receipt" | "expense" }) => {
    await fetch(`/api/reconciliation/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        target_id: target?.id,
        target_type: target?.type,
      }),
    });
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

  return (
    <div className="space-y-6">
      {/* Hero strip */}
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-700 p-4 sm:p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
            <Banknote className="size-5 sm:size-7 text-white" />
          </div>
          <div>
            <p className="text-emerald-100 text-xs sm:text-sm font-medium tracking-wide uppercase">Finance</p>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Bank Reconciliation</h1>
            <p className="text-emerald-100 text-sm mt-0.5 hidden sm:block">
              Match bank & M-Pesa statements against your books
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-max min-w-full">
            <TabsTrigger value="import" className="gap-1.5"><Upload className="size-4" />Import</TabsTrigger>
            <TabsTrigger value="workbench" className="gap-1.5" disabled={!selectedStatementId}>
              <Link2 className="size-4" />Workbench
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><FileText className="size-4" />History</TabsTrigger>
          </TabsList>
        </div>

        {/* ── IMPORT TAB ──────────────────────────── */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-4" />Import Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bankAccounts.length === 0 && nonBankChannels.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">
                    No payment sources yet. Add a bank account or M-Pesa till/paybill in{" "}
                    <strong>Settings → Payment Methods</strong> first.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Payment source</Label>
                      <Select value={importSourceKey} onValueChange={setImportSourceKey}>
                        <SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger>
                        <SelectContent>
                          {bankAccounts.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Bank Accounts
                              </div>
                              {bankAccounts.map((b) => (
                                <SelectItem key={`bank:${b.id}`} value={`bank:${b.id}`}>
                                  {b.bank_name} — {b.account_number}
                                  {b.is_default && " (default)"}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {nonBankChannels.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                M-Pesa & Other Channels
                              </div>
                              {nonBankChannels.map((c) => (
                                <SelectItem key={`channel:${c.id}`} value={`channel:${c.id}`}>
                                  {c.name}
                                  {c.mpesa_shortcode ? ` (${c.mpesa_shortcode})` : ""}
                                  {" — "}{CHANNEL_TYPE_LABEL[c.channel_type]}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Statement source</Label>
                      <Select value={importSource} onValueChange={(v) => setImportSource(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">
                            <div className="flex items-center gap-2"><Banknote className="size-4" />Bank CSV (generic)</div>
                          </SelectItem>
                          <SelectItem value="mpesa">
                            <div className="flex items-center gap-2"><Smartphone className="size-4" />M-Pesa Statement</div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>CSV file</Label>
                    <Input
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-slate-500">
                      {importSource === "mpesa"
                        ? "Export your M-Pesa statement from the Safaricom portal as CSV."
                        : "Expected columns: date, description, reference, debit/credit (or amount), balance."}
                    </p>
                  </div>

                  {importMessage && (
                    <div className={cn(
                      "rounded-lg p-3 text-sm flex items-start gap-2",
                      importMessage.type === "ok"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    )}>
                      {importMessage.type === "ok"
                        ? <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                        : <AlertCircle className="size-4 mt-0.5 shrink-0" />}
                      <span>{importMessage.text}</span>
                    </div>
                  )}

                  <Button onClick={handleImport} disabled={importing || !importFile}>
                    {importing ? "Importing…" : "Import & Parse"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WORKBENCH TAB ──────────────────────────── */}
        <TabsContent value="workbench" className="space-y-4">
          {loadingWorkbench && <p className="text-sm text-slate-500">Loading…</p>}
          {!loadingWorkbench && workbench && (
            <>
              {/* Summary cards */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card><CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase">Matched</p>
                  <p className="text-2xl font-bold text-emerald-600">{summary?.matched ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase">Unmatched</p>
                  <p className="text-2xl font-bold text-amber-600">{summary?.unmatched ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase">Credits In</p>
                  <p className="text-lg font-bold text-emerald-700">KES {money(summary?.credits)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase">Debits Out</p>
                  <p className="text-lg font-bold text-red-700">KES {money(Math.abs(summary?.debits ?? 0))}</p>
                </CardContent></Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleAutoMatch} disabled={autoMatching} size="sm">
                  <Sparkles className="size-4 mr-1.5" />
                  {autoMatching ? "Matching…" : "Auto-match"}
                </Button>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="size-3" />
                  {workbench.statement?.period_start} → {workbench.statement?.period_end}
                </Badge>
                {workbench.statement && (
                  <Badge variant="outline">
                    {sourceLabel(workbench.statement)}
                  </Badge>
                )}
                <div className="flex-1" />
                <Badge variant="outline" className="text-xs">
                  {workbench.availableReceipts.length} receipts, {workbench.availableExpenses.length} expenses available
                </Badge>
              </div>

              {/* Lines table */}
              <Card>
                <CardHeader><CardTitle className="text-base">Statement Lines</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Description</TableHead>
                        <TableHead className="whitespace-nowrap">Ref</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Amount (KES)</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap">Match</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workbench.lines.map((l) => (
                        <TableRow key={l.id} className={cn(
                          l.status === "matched" && "bg-emerald-50/50",
                          l.status === "ignored" && "bg-slate-50 text-slate-400",
                        )}>
                          <TableCell className="whitespace-nowrap text-xs">{l.line_date}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm truncate" title={l.description}>{l.description}</div>
                            {l.payer_name && (
                              <div className="text-xs text-slate-500">{l.payer_name} {l.payer_phone && `• ${l.payer_phone}`}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{l.reference || "—"}</TableCell>
                          <TableCell className={cn(
                            "text-right whitespace-nowrap font-semibold",
                            l.amount > 0 ? "text-emerald-700" : "text-red-700"
                          )}>
                            {l.amount > 0 ? "+" : ""}{money(l.amount)}
                          </TableCell>
                          <TableCell>
                            {l.status === "matched" && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                <CheckCircle2 className="size-3" />
                                {l.match_confidence}%
                              </Badge>
                            )}
                            {l.status === "unmatched" && (
                              <Badge variant="outline" className="text-amber-700 border-amber-300">Unmatched</Badge>
                            )}
                            {l.status === "ignored" && (
                              <Badge variant="secondary">Ignored</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {l.receipts && <span>Receipt {l.receipts.receipt_number}</span>}
                            {l.expenses && <span>Expense {l.expenses.expense_number}</span>}
                            {!l.receipts && !l.expenses && "—"}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {l.status === "matched" ? (
                              <Button size="sm" variant="ghost" onClick={() => patchLine(l.id, "unmatch")}>
                                <Unlink className="size-3.5" />
                              </Button>
                            ) : l.status === "unmatched" ? (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => setMatchDialog({ line: l, open: true })}>
                                  <Link2 className="size-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => patchLine(l.id, "ignore")}>
                                  <XCircle className="size-3.5" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => patchLine(l.id, "unmatch")}>
                                <Unlink className="size-3.5" />
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
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Imported Statements</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {statements.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <FileText className="size-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No statements imported yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Payment Source</TableHead>
                      <TableHead className="whitespace-nowrap">Source</TableHead>
                      <TableHead className="whitespace-nowrap">Period</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Lines</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Closing (KES)</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statements.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="whitespace-nowrap text-xs">{s.statement_date}</TableCell>
                        <TableCell className="text-sm">
                          {sourceLabel(s)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize gap-1">
                            {s.source === "mpesa" ? <Smartphone className="size-3" /> : <Banknote className="size-3" />}
                            {s.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {s.period_start} → {s.period_end}
                        </TableCell>
                        <TableCell className="text-right">{s.line_count}</TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">
                          {money(s.closing_balance)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => openWorkbench(s.id)}>
                            <Link2 className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="size-3.5 text-red-600" />
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

      {/* Manual match dialog */}
      <Dialog open={matchDialog?.open ?? false} onOpenChange={(o) => !o && setMatchDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual Match</DialogTitle>
          </DialogHeader>
          {matchDialog && workbench && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                <div className="text-xs uppercase text-slate-500 mb-1">Bank line</div>
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-medium">{matchDialog.line.description}</div>
                    <div className="text-xs text-slate-500">{matchDialog.line.line_date} • {matchDialog.line.reference || "no ref"}</div>
                  </div>
                  <div className={cn(
                    "font-bold",
                    matchDialog.line.amount > 0 ? "text-emerald-700" : "text-red-700"
                  )}>
                    {matchDialog.line.amount > 0 ? "+" : ""}{money(matchDialog.line.amount)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase text-slate-500">
                  {matchDialog.line.amount > 0 ? "Available receipts" : "Available expenses"}
                </Label>
                <div className="mt-2 max-h-80 overflow-y-auto border rounded-lg divide-y">
                  {matchDialog.line.amount > 0
                    ? workbench.availableReceipts.length === 0
                      ? <div className="p-4 text-sm text-slate-500 text-center">No available receipts in period.</div>
                      : workbench.availableReceipts.map((r) => (
                        <button
                          key={r.id}
                          className="w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center gap-2"
                          onClick={() => {
                            patchLine(matchDialog.line.id, "match", { id: r.id, type: "receipt" });
                            setMatchDialog(null);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{r.receipt_number}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {r.customers?.name ?? "—"} • {r.payment_date}
                            </div>
                          </div>
                          <div className="text-sm font-semibold shrink-0">KES {money(r.amount)}</div>
                        </button>
                      ))
                    : workbench.availableExpenses.length === 0
                      ? <div className="p-4 text-sm text-slate-500 text-center">No available expenses in period.</div>
                      : workbench.availableExpenses.map((e) => (
                        <button
                          key={e.id}
                          className="w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center gap-2"
                          onClick={() => {
                            patchLine(matchDialog.line.id, "match", { id: e.id, type: "expense" });
                            setMatchDialog(null);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{e.expense_number}</div>
                            <div className="text-xs text-slate-500 truncate">{e.category} • {e.expense_date}</div>
                          </div>
                          <div className="text-sm font-semibold shrink-0">KES {money(e.amount)}</div>
                        </button>
                      ))
                  }
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete statement?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the imported statement and all its lines. Matches will be undone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
