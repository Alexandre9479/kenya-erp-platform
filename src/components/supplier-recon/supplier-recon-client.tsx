"use client";

import { useState, useMemo } from "react";
import {
  Users, Upload, Sparkles, CheckCircle2, AlertCircle, FileText,
  Link2, Unlink, XCircle, Trash2, Calendar, AlertTriangle, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const money = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SupplierReconClient({
  initialSuppliers,
  initialStatements,
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
  const [importMsg, setImportMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<{
    statement: Statement | null;
    lines: Line[];
    availablePOs: AvailPO[];
  } | null>(null);
  const [loadingWb, setLoadingWb] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [matchDlg, setMatchDlg] = useState<{ line: Line; open: boolean } | null>(null);
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
      setImportMsg({ type: "err", text: "Select a supplier and CSV file." });
      return;
    }
    setImporting(true);
    setImportMsg(null);
    try {
      const csv_text = await importFile.text();
      const res = await fetch("/api/supplier-recon/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: importSupplierId, csv_text, filename: importFile.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setImportMsg({ type: "ok", text: `Imported ${json.data.line_count} lines. Opening workbench…` });
      await loadStatements();
      await openWb(json.data.statement.id);
      setImportFile(null);
    } catch (e: any) {
      setImportMsg({ type: "err", text: e.message });
    } finally { setImporting(false); }
  };

  const autoMatch = async () => {
    if (!selectedId) return;
    setAutoMatching(true);
    try {
      await fetch("/api/supplier-recon/auto-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement_id: selectedId }),
      });
      await openWb(selectedId);
    } finally { setAutoMatching(false); }
  };

  const patchLine = async (lineId: string, action: string, target?: { id: string; type: "po" | "expense" }) => {
    await fetch(`/api/supplier-recon/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target_id: target?.id, target_type: target?.type }),
    });
    if (selectedId) await openWb(selectedId);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/supplier-recon/statements?id=${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    await loadStatements();
    if (selectedId === deleteId) { setSelectedId(null); setWorkbench(null); setTab("history"); }
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

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-amber-600 via-orange-600 to-red-600 p-4 sm:p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
            <Users className="size-5 sm:size-7 text-white" />
          </div>
          <div>
            <p className="text-amber-100 text-xs sm:text-sm font-medium tracking-wide uppercase">Payables</p>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Supplier Reconciliation</h1>
            <p className="text-amber-100 text-sm mt-0.5 hidden sm:block">
              Match supplier statements to your POs & payments
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-max min-w-full">
            <TabsTrigger value="import" className="gap-1.5"><Upload className="size-4" />Import</TabsTrigger>
            <TabsTrigger value="workbench" className="gap-1.5" disabled={!selectedId}>
              <Link2 className="size-4" />Workbench
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><FileText className="size-4" />History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="size-4" />Import Supplier Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {suppliers.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Add a supplier in <strong>Purchasing</strong> first.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select value={importSupplierId} onValueChange={setImportSupplierId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>CSV file</Label>
                    <Input type="file" accept=".csv,.txt"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
                    <p className="text-xs text-slate-500">
                      Expected columns: date, invoice/doc_number, description, debit, credit, balance
                    </p>
                  </div>
                  {importMsg && (
                    <div className={cn("rounded-lg p-3 text-sm flex items-start gap-2",
                      importMsg.type === "ok"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200")}>
                      {importMsg.type === "ok" ? <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                        : <AlertCircle className="size-4 mt-0.5 shrink-0" />}
                      <span>{importMsg.text}</span>
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

        <TabsContent value="workbench" className="space-y-4">
          {loadingWb && <p className="text-sm text-slate-500">Loading…</p>}
          {!loadingWb && workbench && (
            <>
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
                  <p className="text-xs text-slate-500 uppercase">Missing/Disputed</p>
                  <p className="text-2xl font-bold text-red-600">{(summary?.missing ?? 0) + (summary?.disputed ?? 0)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase">Variance</p>
                  <p className={cn("text-lg font-bold", Math.abs(summary?.totalVariance ?? 0) < 0.01 ? "text-emerald-600" : "text-red-600")}>
                    KES {money(summary?.totalVariance)}
                  </p>
                </CardContent></Card>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={autoMatch} disabled={autoMatching} size="sm">
                  <Sparkles className="size-4 mr-1.5" />
                  {autoMatching ? "Matching…" : "Auto-match"}
                </Button>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="size-3" />
                  {workbench.statement?.period_start} → {workbench.statement?.period_end}
                </Badge>
                <Badge variant="outline">
                  {(workbench.statement as any)?.suppliers?.name}
                </Badge>
                <div className="flex-1" />
                <Badge variant="outline" className="text-xs">
                  {workbench.availablePOs.length} POs available
                </Badge>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Statement Lines</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Doc</TableHead>
                        <TableHead className="whitespace-nowrap">Description</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Debit</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Credit</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Variance</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workbench.lines.map((l) => (
                        <TableRow key={l.id} className={cn(
                          l.status === "matched" && "bg-emerald-50/50",
                          l.status === "ignored" && "bg-slate-50 text-slate-400",
                          l.status === "missing_in_books" && "bg-red-50/50",
                          l.status === "disputed" && "bg-amber-50/50",
                        )}>
                          <TableCell className="whitespace-nowrap text-xs">{l.line_date}</TableCell>
                          <TableCell className="text-xs font-mono">
                            <div>{l.document_number || "—"}</div>
                            <Badge variant="outline" className="text-[9px] capitalize mt-0.5">{l.document_type.replace("_", " ")}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs text-sm truncate" title={l.description ?? ""}>{l.description}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{l.debit > 0 ? money(l.debit) : "—"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{l.credit > 0 ? money(l.credit) : "—"}</TableCell>
                          <TableCell className={cn(
                            "text-right whitespace-nowrap text-xs",
                            l.variance == null ? "text-slate-400"
                              : Math.abs(l.variance) < 0.01 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {l.variance != null ? money(l.variance) : "—"}
                          </TableCell>
                          <TableCell>
                            {l.status === "matched" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"><CheckCircle2 className="size-3" />{l.match_confidence}%</Badge>}
                            {l.status === "unmatched" && <Badge variant="outline" className="text-amber-700 border-amber-300">Unmatched</Badge>}
                            {l.status === "missing_in_books" && <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><AlertTriangle className="size-3" />Missing</Badge>}
                            {l.status === "disputed" && <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1"><HelpCircle className="size-3" />Disputed</Badge>}
                            {l.status === "ignored" && <Badge variant="secondary">Ignored</Badge>}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {l.status === "matched" ? (
                              <Button size="sm" variant="ghost" onClick={() => patchLine(l.id, "unmatch")}><Unlink className="size-3.5" /></Button>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => setMatchDlg({ line: l, open: true })}><Link2 className="size-3.5" /></Button>
                                {l.status !== "disputed" && l.debit > 0 && (
                                  <Button size="sm" variant="ghost" title="Mark disputed" onClick={() => patchLine(l.id, "dispute")}><HelpCircle className="size-3.5 text-amber-600" /></Button>
                                )}
                                {l.status !== "ignored" && (
                                  <Button size="sm" variant="ghost" onClick={() => patchLine(l.id, "ignore")}><XCircle className="size-3.5" /></Button>
                                )}
                              </>
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

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Imported Supplier Statements</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {statements.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <FileText className="size-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No supplier statements imported yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Supplier</TableHead>
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
                        <TableCell className="text-sm">{s.suppliers?.name}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{s.period_start} → {s.period_end}</TableCell>
                        <TableCell className="text-right">{s.line_count}</TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">{money(s.closing_balance)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => openWb(s.id)}><Link2 className="size-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}><Trash2 className="size-3.5 text-red-600" /></Button>
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

      <Dialog open={matchDlg?.open ?? false} onOpenChange={(o) => !o && setMatchDlg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Match to Purchase Order</DialogTitle></DialogHeader>
          {matchDlg && workbench && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                <div className="text-xs uppercase text-slate-500 mb-1">Supplier line</div>
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-medium">{matchDlg.line.document_number || "(no number)"}</div>
                    <div className="text-xs text-slate-500">
                      {matchDlg.line.line_date} • {matchDlg.line.description}
                    </div>
                  </div>
                  <div className="font-bold">
                    KES {money(matchDlg.line.debit > 0 ? matchDlg.line.debit : matchDlg.line.credit)}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase text-slate-500">Available POs (±30 days)</Label>
                <div className="mt-2 max-h-80 overflow-y-auto border rounded-lg divide-y">
                  {workbench.availablePOs.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">No POs available for this supplier in period.</div>
                  ) : workbench.availablePOs.map((po) => (
                    <button
                      key={po.id}
                      className="w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center gap-2"
                      onClick={() => {
                        patchLine(matchDlg.line.id, "match", { id: po.id, type: "po" });
                        setMatchDlg(null);
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{po.lpo_number}</div>
                        <div className="text-xs text-slate-500">{po.issue_date} • {po.status}</div>
                      </div>
                      <div className="text-sm font-semibold shrink-0">KES {money(po.total_amount)}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setMatchDlg(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete statement?</AlertDialogTitle>
            <AlertDialogDescription>Removes the supplier statement and all lines. Cannot be undone.</AlertDialogDescription>
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
