"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  BookOpen,
  List,
  Landmark,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  sub_type: string | null;
  is_system: boolean;
  is_active: boolean;
};

type JournalEntry = {
  id: string;
  entry_number: string;
  description: string;
  entry_date: string;
  is_posted: boolean;
  created_at: string;
};

const typeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity: "bg-purple-100 text-purple-700",
  revenue: "bg-emerald-100 text-emerald-700",
  expense: "bg-amber-100 text-amber-700",
};

const accountFormSchema = z.object({
  code: z.string().min(1, "Code required"),
  name: z.string().min(1, "Name required"),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  sub_type: z.string().optional(),
  description: z.string().optional(),
});

const jeLineSchema = z.object({
  account_id: z.string().min(1, "Account required"),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string().optional(),
});

const jeFormSchema = z.object({
  description: z.string().min(1, "Description required"),
  entry_date: z.string().min(1, "Date required"),
  lines: z.array(jeLineSchema).min(2, "Need at least two lines"),
});

type AccountForm = z.infer<typeof accountFormSchema>;
type JEForm = z.infer<typeof jeFormSchema>;

interface Props {
  initialAccounts: Account[];
  accountCount: number;
  initialJournalEntries: JournalEntry[];
  jeCount: number;
}

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
const today = () => new Date().toISOString().split("T")[0];

export function AccountingClient({ initialAccounts, accountCount, initialJournalEntries, jeCount }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [accCount, setAccCount] = useState(accountCount);
  const [jes, setJEs] = useState(initialJournalEntries);
  const [jeTotal, setJETotal] = useState(jeCount);
  const [typeFilter, setTypeFilter] = useState("all");
  const [accSearch, setAccSearch] = useState("");
  const [jePage, setJEPage] = useState(1);
  const [isLoadingAcc, setIsLoadingAcc] = useState(false);
  const [isLoadingJE, setIsLoadingJE] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [jeFormOpen, setJEFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isFirst = useRef(true);
  const accTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accForm = useForm<AccountForm>({ resolver: zodResolver(accountFormSchema), defaultValues: { type: "expense" } });
  const jeForm = useForm<JEForm>({
    resolver: zodResolver(jeFormSchema),
    defaultValues: {
      entry_date: today(),
      lines: [{ account_id: "", debit: 0, credit: 0 }, { account_id: "", debit: 0, credit: 0 }],
    },
  });
  const { fields: jeLines, append: appendLine, remove: removeLine } = useFieldArray({ control: jeForm.control, name: "lines" });
  const watchedLines = jeForm.watch("lines");
  const totalDebit = watchedLines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = watchedLines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (accTimer.current) clearTimeout(accTimer.current);
    accTimer.current = setTimeout(fetchAccounts, 400);
    return () => { if (accTimer.current) clearTimeout(accTimer.current); };
  }, [accSearch]);

  useEffect(() => {
    if (isFirst.current) return;
    fetchAccounts();
  }, [typeFilter]);

  useEffect(() => {
    if (isFirst.current) return;
    fetchJEs();
  }, [jePage]);

  async function fetchAccounts() {
    setIsLoadingAcc(true);
    try {
      const params = new URLSearchParams({ search: accSearch });
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/accounts?${params}`);
      const json = await res.json();
      setAccounts(json.data ?? []);
      setAccCount(json.count ?? 0);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setIsLoadingAcc(false);
    }
  }

  async function fetchJEs() {
    setIsLoadingJE(true);
    try {
      const params = new URLSearchParams({ page: String(jePage), limit: "25" });
      const res = await fetch(`/api/journal-entries?${params}`);
      const json = await res.json();
      setJEs(json.data ?? []);
      setJETotal(json.count ?? 0);
    } catch {
      toast.error("Failed to load journal entries");
    } finally {
      setIsLoadingJE(false);
    }
  }

  async function onCreateAccount(data: AccountForm) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Account created");
      accForm.reset({ type: "expense" });
      setAccountFormOpen(false);
      fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function onCreateJE(data: JEForm) {
    if (!isBalanced) { toast.error("Debits must equal credits"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Journal entry created");
      jeForm.reset({ entry_date: today(), lines: [{ account_id: "", debit: 0, credit: 0 }, { account_id: "", debit: 0, credit: 0 }] });
      setJEFormOpen(false);
      fetchJEs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSaving(false);
    }
  }

  const limit = 25;
  const postedCount = jes.filter((j) => j.is_posted).length;

  return (
    <div className="space-y-6">
      {/* ── Module Hero Strip ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        <div className="relative h-24 bg-linear-to-r from-slate-500 to-slate-700 px-6 flex items-center justify-between overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Landmark className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Accounting</h1>
              <p className="text-sm text-white/70">Chart of accounts and double-entry journal entries</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => setAccountFormOpen(true)}
              className="bg-white text-slate-700 hover:bg-slate-50 font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Account
            </Button>
          </div>
        </div>
        <div className="bg-white px-6 py-3 flex flex-wrap gap-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-sm text-slate-600 font-medium">{accCount} Accounts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-sm text-slate-600 font-medium">{jeTotal} Journal Entries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-slate-600 font-medium">{postedCount} Posted</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-slate-500 to-slate-700" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{accCount}</p>
              <p className="text-xs text-slate-500 font-medium">Chart of Accounts</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-slate-500 to-slate-700" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <List className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{jeTotal}</p>
              <p className="text-xs text-slate-500 font-medium">Journal Entries</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-slate-500 to-slate-700" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <FileCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{postedCount}</p>
              <p className="text-xs text-slate-500 font-medium">Posted Entries</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="chart">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="chart"><BookOpen className="mr-1.5 h-3.5 w-3.5" />Chart of Accounts ({accCount})</TabsTrigger>
            <TabsTrigger value="journals"><List className="mr-1.5 h-3.5 w-3.5" />Journal Entries ({jeTotal})</TabsTrigger>
          </TabsList>
        </div>

        {/* Chart of Accounts */}
        <TabsContent value="chart" className="space-y-4 mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search accounts…"
                  value={accSearch}
                  onChange={(e) => { setAccSearch(e.target.value); }}
                  className="pl-9 focus-visible:ring-slate-500"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setAccountFormOpen(true)}
              className="bg-linear-to-r from-slate-500 to-slate-700 text-white hover:from-slate-600 hover:to-slate-800 shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />New Account
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sub-type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAcc ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-slate-500 to-slate-700 flex items-center justify-center mb-4 shadow-lg shadow-slate-500/30">
                          <BookOpen className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No accounts found</p>
                        <p className="text-sm text-slate-500 mt-1">Create your chart of accounts to get started</p>
                        <Button
                          onClick={() => setAccountFormOpen(true)}
                          className="mt-4 bg-linear-to-r from-slate-500 to-slate-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          New Account
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((acc) => (
                    <TableRow key={acc.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <TableCell className="font-mono text-sm text-slate-600">{acc.code}</TableCell>
                      <TableCell className="font-medium text-slate-900">{acc.name}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeColors[acc.type] ?? ""}`}>
                          {acc.type.charAt(0).toUpperCase() + acc.type.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500">{acc.sub_type ?? "—"}</TableCell>
                      <TableCell className="text-slate-500">{acc.is_system ? "Yes" : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Journal Entries */}
        <TabsContent value="journals" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setJEFormOpen(true)}
              className="bg-linear-to-r from-slate-500 to-slate-700 text-white hover:from-slate-600 hover:to-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />New Journal Entry
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entry #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingJE ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : jes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-slate-500 to-slate-700 flex items-center justify-center mb-4 shadow-lg shadow-slate-500/30">
                          <List className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No journal entries yet</p>
                        <p className="text-sm text-slate-500 mt-1">Create double-entry bookkeeping records</p>
                        <Button
                          onClick={() => setJEFormOpen(true)}
                          className="mt-4 bg-linear-to-r from-slate-500 to-slate-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Create First Entry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  jes.map((je) => (
                    <TableRow key={je.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <TableCell className="font-mono text-sm text-slate-600">{je.entry_number}</TableCell>
                      <TableCell className="text-slate-500">{dateStr(je.entry_date)}</TableCell>
                      <TableCell className="text-slate-700">{je.description}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${je.is_posted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {je.is_posted ? "Posted" : "Draft"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {jeTotal > limit && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Showing {(jePage - 1) * limit + 1}–{Math.min(jePage * limit, jeTotal)} of {jeTotal}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={jePage === 1} onClick={() => setJEPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={jePage * limit >= jeTotal} onClick={() => setJEPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Account Sheet */}
      <Sheet open={accountFormOpen} onOpenChange={(o) => { if (!o) { setAccountFormOpen(false); accForm.reset({ type: "expense" }); } }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-slate-600 to-slate-800 shrink-0" />
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100">
                <Landmark className="size-4 text-slate-600" />
              </div>
              <SheetTitle className="text-slate-900 text-lg font-semibold">New Account</SheetTitle>
            </div>
            <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
              Add a new account to the chart of accounts.
            </SheetDescription>
          </SheetHeader>
          <Separator className="shrink-0" />
          <form onSubmit={accForm.handleSubmit(onCreateAccount)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Code <span className="text-red-500">*</span></Label>
                  <Input {...accForm.register("code")} placeholder="1001" className={accForm.formState.errors.code ? "border-red-400" : ""} />
                  {accForm.formState.errors.code && <p className="text-xs text-red-500">{accForm.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Type <span className="text-red-500">*</span></Label>
                  <Controller control={accForm.control} name="type" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input {...accForm.register("name")} placeholder="Cash & Bank" className={accForm.formState.errors.name ? "border-red-400" : ""} />
                {accForm.formState.errors.name && <p className="text-xs text-red-500">{accForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Sub-type</Label>
                <Input {...accForm.register("sub_type")} placeholder="current_asset" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input {...accForm.register("description")} placeholder="Optional description" />
              </div>
            </div>
            <Separator className="shrink-0" />
            <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAccountFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-slate-700 hover:bg-slate-800 text-white min-w-28">
                {isSaving ? "Saving…" : "Create Account"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* New Journal Entry Sheet */}
      <Sheet open={jeFormOpen} onOpenChange={(o) => { if (!o) { setJEFormOpen(false); } }}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-slate-600 to-slate-800 shrink-0" />
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100">
                <FileCheck className="size-4 text-slate-600" />
              </div>
              <SheetTitle className="text-slate-900 text-lg font-semibold">New Journal Entry</SheetTitle>
            </div>
            <SheetDescription className="text-slate-500 text-sm mt-1 ml-12">
              Record a double-entry journal transaction.
            </SheetDescription>
          </SheetHeader>
          <Separator className="shrink-0" />
          <form onSubmit={jeForm.handleSubmit(onCreateJE)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Description <span className="text-red-500">*</span></Label>
                  <Input {...jeForm.register("description")} placeholder="Rent expense for April" className={jeForm.formState.errors.description ? "border-red-400" : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date <span className="text-red-500">*</span></Label>
                  <Input type="date" {...jeForm.register("entry_date")} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-slate-700">Journal Lines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendLine({ account_id: "", debit: 0, credit: 0 })}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Add Line
                  </Button>
                </div>
                <div className="space-y-2">
                  {jeLines.map((line, index) => (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Controller control={jeForm.control} name={`lines.${index}.account_id`} render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Account…" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div className="col-span-3">
                        <Controller control={jeForm.control} name={`lines.${index}.debit`} render={({ field }) => (
                          <Input className="h-8 text-sm" type="number" step="0.01" min="0" placeholder="Debit" value={field.value || ""} onChange={(e) => { field.onChange(parseFloat(e.target.value) || 0); if (parseFloat(e.target.value) > 0) jeForm.setValue(`lines.${index}.credit`, 0); }} />
                        )} />
                      </div>
                      <div className="col-span-3">
                        <Controller control={jeForm.control} name={`lines.${index}.credit`} render={({ field }) => (
                          <Input className="h-8 text-sm" type="number" step="0.01" min="0" placeholder="Credit" value={field.value || ""} onChange={(e) => { field.onChange(parseFloat(e.target.value) || 0); if (parseFloat(e.target.value) > 0) jeForm.setValue(`lines.${index}.debit`, 0); }} />
                        )} />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" disabled={jeLines.length <= 2} onClick={() => removeLine(index)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-end gap-8 text-sm font-semibold">
                  <span className={totalDebit > 0 ? "text-slate-900" : "text-slate-400"}>Debit: KES {KES(totalDebit)}</span>
                  <span className={totalCredit > 0 ? "text-slate-900" : "text-slate-400"}>Credit: KES {KES(totalCredit)}</span>
                  {!isBalanced && totalDebit > 0 && <span className="text-red-600">⚠ Unbalanced</span>}
                  {isBalanced && totalDebit > 0 && <span className="text-emerald-600">✓ Balanced</span>}
                </div>
              </div>
            </div>
            <Separator className="shrink-0" />
            <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setJEFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving || !isBalanced} className="bg-slate-700 hover:bg-slate-800 text-white min-w-28">
                {isSaving ? "Saving…" : "Create Entry"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
