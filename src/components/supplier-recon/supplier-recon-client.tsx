"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Users, Upload, Sparkles, CheckCircle2, AlertCircle, FileText,
  Link2, Unlink, XCircle, Trash2, Calendar, AlertTriangle, HelpCircle,
  Layers, Scale, Wallet, TrendingUp,
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

type Supplier = { id: string; name: string; phone: string | null; email: string | null };
type Statement = {
  id: string;
  supplier_id: string;
  statement_date: string;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number;
  closing_balance: number;
  line_count: number;
  status: string;
  filename: string | null;
  suppliers?: { name: string } | null;
};
type Line = {
  id: string;
  line_date: string;
  document_type: string;
  document_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number | null;
  status: "unmatched" | "matched" | "missing_in_books" | "disputed" | "ignored";
  matched_po_id: string | null;
  matched_expense_id: string | null;
  book_amount: number | null;
  variance: number | null;
  match_confidence: number;
  purchase_orders?: { lpo_number: string; total_amount: number | string } | null;
  expenses?: { expense_number: string; amount: number | string } | null;
};
type AvailPO = { id: string; lpo_number: string; total_amount: number | string; issue_date: string; status: string };

const TONES = {
  amber:   "from-amber-500 to-orange-600 shadow-amber-500/30",
  rose:    "from-rose-500 to-pink-600 shadow-rose-500/30",
  sky:     "from-sky-500 to-indigo-600 shadow-sky-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
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

const money = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_CONFIG: Record<string, { bg: string; icon: React.ElementType; label: string }> = {
  matched:          { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2,   label: "Matched" },
  unmatched:        { bg: "bg-amber-100 text-amber-800 border-amber-200",       icon: AlertCircle,    label: "Unmatched" },
  missing_in_books: { bg: "bg-rose-100 text-rose-800 border-rose-200",          icon: AlertTriangle,  label: "Missing in books" },
  disputed:         { bg: "bg-amber-100 text-amber-800 border-amber-200",       icon: HelpCircle,     label: "Disputed" },
  ignored:          { bg: "bg-slate-100 text-slate-700 border-slate-200",       icon: XCircle,        label: "Ignored" },
};

export function SupplierReconClient({
  initialSuppliers, initialStatements,
}: {
  initialSuppliers: Supplier[];
  initialStatements: Statement[];
}) {
  const [tab, setTab] = useState<"import" | "workbench" | "history">("import");
  const [suppliers] = useState(initialSuppliers);
  const [statements, setStatements] = useState(initialStatements);

  const [importSupplierId, setImportSupplierId] = useState(initialSuppliers[0]?.id ?? "");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<{
    statement: Statement | null;
    lines: Line[];
    availablePOs: AvailPO[];
  } | null>(null);
  const [loadingWb, setLoadingWb] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [matchSheet, setMatchSheet] = useState<Line | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadStatements = async () => {
    const res = await fetch("/api/supplier-recon/statements");
    const json = await res.json();
    if (json.data) setStatements(json.data);
  };

  const openWb = async (id: string) => {
    setSelectedId(id);
    setTab("workbench");
    setLoadingWb(true);
    try {
      const res = await fetch(`/api/supplier-recon/statements?statement_id=${id}`);
      const json = await res.json();
      if (json.data) {
        setWorkbench({
          statement: json.data.statement,
          lines: json.data.lines,
          availablePOs: json.data.available_pos,
        });
      }
    } finally { setLoadingWb(false); }
  };

  const handleImport = async () => {
    if (!importSupplierId || !importFile) {
      toast.error("Select a supplier and a CSV file.");
      return;
    }
    setImporting(true);
    try {
      const csv_text = await importFile.text();
      const res = await fetch("/api/supplier-recon/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: importSupplierId, csv_text, filename: importFile.name }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Import failed"); return; }
      toast.success(`Imported ${json.data.line_count} lines`);
      await loadStatements();
      await openWb(json.data.statement.id);
      setImportFile(null);
    } finally { setImporting(false); }
  };

  const autoMatch = async () => {
    if (!selectedId) return;
    setAutoMatching(true);
    try {
      const res = await fetch("/api/supplier-recon/auto-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement_id: selectedId }),
      });
      const json = await res.json();
      if (res.ok) toast.success(`Matched ${json.data?.matched ?? 0} lines`);
      else toast.error(json.error ?? "Auto-match failed");
      await openWb(selectedId);
    } finally { setAutoMatching(false); }
  };

  const patchLine = async (lineId: string, action: string, target?: { id: string; type: "po" | "expense" }) => {
    const res = await fetch(`/api/supplier-recon/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target_id: target?.id, target_type: target?.type }),
    });
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Action failed"); return; }
    if (selectedId) await openWb(selectedId);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/supplier-recon/statements?id=${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    await loadStatements();
    if (selectedId === deleteId) { setSelectedId(null); setWorkbench(null); setTab("history"); }
    toast.success("Statement deleted");
  };

  const summary = useMemo(() => {
    if (!workbench) return null;
    const matched = workbench.lines.filter((l) => l.status === "matched").length;
    const unmatched = workbench.lines.filter((l) => l.status === "unmatched").length;
    const missing = workbench.lines.filter((l) => l.status === "missing_in_books").length;
    const disputed = workbench.lines.filter((l) => l.status === "disputed").length;
    const supplierOwed = workbench.lines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    const totalVariance = workbench.lines.reduce((s, l) => s + Number(l.variance ?? 0), 0);
    return { matched, unmatched, missing, disputed, supplierOwed, totalVariance };
  }, [workbench]);

  const heroSummary = useMemo(() => {
    const total = statements.reduce((s, st) => s + st.line_count, 0);
    const supplierCount = new Set(statements.map((s) => s.supplier_id)).size;
    return { statements: statements.length, lines: total, supplierCount };
  }, [statements]);

  const matchLineAmount = matchSheet ? (matchSheet.debit > 0 ? matchSheet.debit : matchSheet.credit) : 0;

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-14"
        style={{ background: "linear-gradient(135deg, #78350f 0%, #9a3412 45%, #b45309 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-orange-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-amber-100 backdrop-blur">
            <Users className="h-3.5 w-3.5" />
            <span>Payables · Supplier Reconciliation</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Supplier Reconciliation</h1>
          <p className="mt-2 text-amber-100/80 text-sm md:text-base max-w-2xl">
            Import supplier statements, match them to your POs and payments, and flag discrepancies for dispute before month-end.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat label="Statements" value={heroSummary.statements} icon={FileText} tone="amber" hint={`${heroSummary.supplierCount} suppliers`} />
            <HeroStat label="Total lines" value={heroSummary.lines.toLocaleString()} icon={Layers} tone="sky" />
            <HeroStat label="Matched" value={summary?.matched ?? 0} icon={CheckCircle2} tone="emerald" hint={workbench ? "Active workbench" : "Open a statement"} />
            <HeroStat label="Disputed/Missing" value={(summary?.missing ?? 0) + (summary?.disputed ?? 0)} icon={AlertTriangle} tone="rose" />
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
                  <TabsTrigger value="workbench" className="data-[state=active]:bg-white gap-1.5" disabled={!selectedId}>
                    <Link2 className="h-3.5 w-3.5" /> Workbench
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-white gap-1.5"><FileText className="h-3.5 w-3.5" /> History</TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            {/* IMPORT */}
            <TabsContent value="import" className="space-y-4 mt-5">
              <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-red-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow shadow-amber-500/30">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                    Import Supplier Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {suppliers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                      </div>
                      <p className="mt-3 text-sm text-amber-900">
                        Add a supplier in <strong>Purchasing</strong> first.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Supplier</Label>
                          <Select value={importSupplierId} onValueChange={setImportSupplierId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>CSV file</Label>
                          <Input type="file" accept=".csv,.txt"
                            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-900 flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>Expected columns: <code className="font-mono bg-sky-100 px-1 rounded">date</code>, <code className="font-mono bg-sky-100 px-1 rounded">invoice/doc_number</code>, <code className="font-mono bg-sky-100 px-1 rounded">description</code>, <code className="font-mono bg-sky-100 px-1 rounded">debit</code>, <code className="font-mono bg-sky-100 px-1 rounded">credit</code>, <code className="font-mono bg-sky-100 px-1 rounded">balance</code></span>
                      </div>
                      <Separator />
                      <Button onClick={handleImport} disabled={importing || !importFile}
                        className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                        {importing ? "Importing…" : "Import & Parse"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* WORKBENCH */}
            <TabsContent value="workbench" className="space-y-4 mt-5">
              {loadingWb && (
                <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
                  <CardContent className="p-12 text-center text-sm text-slate-500">Loading workbench…</CardContent>
                </Card>
              )}
              {!loadingWb && workbench && (
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
                      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-rose-500 to-pink-500" />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><AlertTriangle className="h-3 w-3" /> Missing/Disputed</div>
                        <p className="mt-1 text-2xl font-bold text-rose-700">{(summary?.missing ?? 0) + (summary?.disputed ?? 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden border-slate-200/80">
                      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-500 to-indigo-500" />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><Scale className="h-3 w-3" /> Variance</div>
                        <p className={cn("mt-1 text-lg font-bold tabular-nums",
                          Math.abs(summary?.totalVariance ?? 0) < 0.01 ? "text-emerald-700" : "text-rose-700")}>
                          KES {money(summary?.totalVariance)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
                    <CardContent className="p-4 flex flex-wrap items-center gap-2">
                      <Button onClick={autoMatch} disabled={autoMatching}
                        className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        {autoMatching ? "Matching…" : "Auto-match"}
                      </Button>
                      <Badge variant="outline" className="gap-1 bg-slate-50">
                        <Calendar className="h-3 w-3" />
                        {workbench.statement?.period_start} → {workbench.statement?.period_end}
                      </Badge>
                      <Badge variant="outline" className="gap-1 bg-slate-50">
                        <Users className="h-3 w-3" /> {workbench.statement?.suppliers?.name}
                      </Badge>
                      <div className="ml-auto flex items-center gap-2">
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 gap-1">
                          <FileText className="h-3 w-3" /> {workbench.availablePOs.length} POs available
                        </Badge>
                        <Badge variant="outline" className={cn("gap-1",
                          (summary?.supplierOwed ?? 0) >= 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                          <Wallet className="h-3 w-3" /> Supplier owed: KES {money(summary?.supplierOwed)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                    <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-red-500" />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow shadow-amber-500/30">
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
                            <TableHead className="whitespace-nowrap">Doc</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Debit</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Credit</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Variance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workbench.lines.map((l) => {
                            const st = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.unmatched;
                            const StIcon = st.icon;
                            return (
                              <TableRow key={l.id} className={cn(
                                "hover:bg-slate-50/50",
                                l.status === "matched" && "bg-emerald-50/30",
                                l.status === "ignored" && "bg-slate-50 text-slate-400",
                                l.status === "missing_in_books" && "bg-rose-50/40",
                                l.status === "disputed" && "bg-amber-50/40",
                              )}>
                                <TableCell className="whitespace-nowrap text-xs text-slate-600">{l.line_date}</TableCell>
                                <TableCell className="text-xs font-mono">
                                  <div className="text-slate-800 font-medium">{l.document_number || "—"}</div>
                                  <Badge variant="outline" className="text-[9px] capitalize mt-0.5">{l.document_type.replace("_", " ")}</Badge>
                                </TableCell>
                                <TableCell className="max-w-xs text-sm text-slate-800 truncate" title={l.description ?? ""}>{l.description}</TableCell>
                                <TableCell className="text-right whitespace-nowrap tabular-nums">{l.debit > 0 ? money(l.debit) : "—"}</TableCell>
                                <TableCell className="text-right whitespace-nowrap tabular-nums">{l.credit > 0 ? money(l.credit) : "—"}</TableCell>
                                <TableCell className={cn(
                                  "text-right whitespace-nowrap text-xs tabular-nums",
                                  l.variance == null ? "text-slate-400"
                                    : Math.abs(l.variance) < 0.01 ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold",
                                )}>
                                  {l.variance != null ? money(l.variance) : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${st.bg} border gap-1`}>
                                    <StIcon className="h-3 w-3" />
                                    {l.status === "matched" ? `${l.match_confidence}%` : st.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  {l.status === "matched" ? (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100" onClick={() => patchLine(l.id, "unmatch")}>
                                      <Unlink className="h-3.5 w-3.5" />
                                    </Button>
                                  ) : (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-sky-50 hover:text-sky-700" onClick={() => setMatchSheet(l)}>
                                        <Link2 className="h-3.5 w-3.5" />
                                      </Button>
                                      {l.status !== "disputed" && l.debit > 0 && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-amber-50 hover:text-amber-700" title="Mark disputed" onClick={() => patchLine(l.id, "dispute")}>
                                          <HelpCircle className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {l.status !== "ignored" && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100" onClick={() => patchLine(l.id, "ignore")}>
                                          <XCircle className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* HISTORY */}
            <TabsContent value="history" className="space-y-4 mt-5">
              <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-red-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow shadow-amber-500/30">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    Imported Supplier Statements
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
                      <p className="mt-3 text-sm font-medium text-slate-700">No supplier statements imported</p>
                      <p className="text-xs text-slate-500">Use the Import tab to upload your first statement.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="whitespace-nowrap">Period</TableHead>
                          <TableHead className="text-right">Lines</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Closing (KES)</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statements.map((s) => (
                          <TableRow key={s.id} className="hover:bg-slate-50/50">
                            <TableCell className="whitespace-nowrap text-xs text-slate-600">{s.statement_date}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                  <Users className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-sm font-medium text-slate-800">{s.suppliers?.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">{s.period_start} → {s.period_end}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.line_count}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">{money(s.closing_balance)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-sky-50 hover:text-sky-700" onClick={() => openWb(s.id)}>
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

      {/* Match sheet */}
      <Sheet open={!!matchSheet} onOpenChange={(o) => !o && setMatchSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-indigo-600 shadow shadow-sky-500/30">
                <Link2 className="h-4 w-4 text-white" />
              </div>
              Match to Purchase Order
            </SheetTitle>
            <SheetDescription>Pick a matching PO for this supplier line.</SheetDescription>
          </SheetHeader>
          {matchSheet && workbench && (
            <div className="mt-6 space-y-4 px-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Supplier line</div>
                <div className="mt-1 flex justify-between gap-2 items-start">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{matchSheet.document_number || "(no number)"}</div>
                    <div className="text-xs text-slate-500">{matchSheet.line_date} · {matchSheet.description}</div>
                  </div>
                  <div className="text-lg font-bold tabular-nums text-slate-900">
                    KES {money(matchLineAmount)}
                  </div>
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                  <TrendingUp className="h-3 w-3" /> Available POs (±30 days)
                </Label>
                <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y">
                  {workbench.availablePOs.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500 text-center">No POs available for this supplier in period.</div>
                  ) : workbench.availablePOs.map((po) => {
                    const poAmount = Number(po.total_amount);
                    const variance = poAmount - matchLineAmount;
                    const tight = Math.abs(variance) < 0.01;
                    return (
                      <button
                        key={po.id}
                        className="w-full p-3 text-left hover:bg-sky-50 flex justify-between items-center gap-2 transition"
                        onClick={() => {
                          patchLine(matchSheet.id, "match", { id: po.id, type: "po" });
                          setMatchSheet(null);
                        }}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900">{po.lpo_number}</div>
                          <div className="text-xs text-slate-500 capitalize">{po.issue_date} · {po.status.replace("_", " ")}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold tabular-nums text-slate-900">KES {money(poAmount)}</div>
                          {!tight && (
                            <div className={cn("text-[10px] font-medium",
                              variance > 0 ? "text-amber-700" : "text-rose-700")}>
                              Δ {variance > 0 ? "+" : ""}{money(variance)}
                            </div>
                          )}
                          {tight && <div className="text-[10px] font-medium text-emerald-700">Exact match</div>}
                        </div>
                      </button>
                    );
                  })}
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
            <AlertDialogDescription>Removes the supplier statement and all lines. Cannot be undone.</AlertDialogDescription>
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
