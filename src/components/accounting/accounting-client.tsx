"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  BookOpen,
  List,
  Landmark,
  FileCheck,
  Sparkles,
  CalendarDays,
  Trash2,
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
import { PremiumHero, HeroStatGrid, HeroStat, EmptyState } from "@/components/ui/premium-hero";

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

const typeConfig: Record<string, { bg: string; dot: string; label: string }> = {
  asset:     { bg: "border-blue-200 bg-blue-50 text-blue-700",         dot: "bg-blue-500",     label: "Asset" },
  liability: { bg: "border-rose-200 bg-rose-50 text-rose-700",         dot: "bg-rose-500",     label: "Liability" },
  equity:    { bg: "border-violet-200 bg-violet-50 text-violet-700",   dot: "bg-violet-500",   label: "Equity" },
  revenue:   { bg: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "Revenue" },
  expense:   { bg: "border-amber-200 bg-amber-50 text-amber-700",      dot: "bg-amber-500",    label: "Expense" },
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
  const draftCount = Math.max(0, jeTotal - postedCount);
  const systemCount = accounts.filter((a) => a.is_system).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Premium Hero ─────────────────────────────────────────────── */}
      <PremiumHero
        gradient="slate"
        icon={Landmark}
        eyebrow={<><Sparkles className="size-3" /> General Ledger</>}
        title="Accounting"
        description="Chart of accounts, double-entry journals and financial control."
        actions={
          <Button
            onClick={() => setAccountFormOpen(true)}
            size="sm"
            className="bg-white text-slate-800 hover:bg-slate-100 font-semibold shadow-md shrink-0"
          >
            <Plus className="size-4 mr-1.5" />
            New Account
          </Button>
        }
      >
        <HeroStatGrid>
          <HeroStat icon={BookOpen}  label="Accounts"        value={accCount.toLocaleString()} />
          <HeroStat icon={List}      label="Journal Entries" value={jeTotal.toLocaleString()}  accent="info" />
          <HeroStat icon={FileCheck} label="Posted"          value={postedCount.toLocaleString()} accent="success" />
          <HeroStat icon={Landmark}  label="System"          value={systemCount.toLocaleString()} />
        </HeroStatGrid>
      </PremiumHero>

      <Tabs defaultValue="chart">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="chart"><BookOpen className="mr-1.5 size-3.5" />Chart of Accounts ({accCount})</TabsTrigger>
            <TabsTrigger value="journals"><List className="mr-1.5 size-3.5" />Journal Entries ({jeTotal})</TabsTrigger>
          </TabsList>
        </div>

        {/* Chart of Accounts */}
        <TabsContent value="chart" className="space-y-4 mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 sm:items-center justify-between shadow-sm">
            <div className="flex flex-1 gap-3 flex-col sm:flex-row">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search accounts…"
                  value={accSearch}
                  onChange={(e) => { setAccSearch(e.target.value); }}
                  className="pl-9 focus-visible:ring-slate-500"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="sm:w-36"><SelectValue placeholder="All types" /></SelectTrigger>
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
              className="bg-linear-to-r from-slate-700 to-slate-900 text-white hover:from-slate-800 hover:to-black shrink-0 shadow-md"
            >
              <Plus className="mr-2 size-4" />New Account
            </Button>
          </div>

          {/* Mobile: account cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {isLoadingAcc ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : accounts.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No accounts found"
                description="Create your chart of accounts to get started."
                action={
                  <Button onClick={() => setAccountFormOpen(true)} className="bg-linear-to-r from-slate-700 to-slate-900 text-white">
                    <Plus className="size-4 mr-1.5" /> New Account
                  </Button>
                }
              />
            ) : (
              accounts.map((acc) => {
                const cfg = typeConfig[acc.type] ?? { bg: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400", label: acc.type };
                return (
                  <div key={acc.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className={`absolute left-0 top-0 h-full w-1 ${cfg.dot}`} />
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-500">{acc.code}</span>
                          {acc.is_system && <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 uppercase tracking-wide">System</span>}
                        </div>
                        <p className="font-semibold text-slate-900 text-sm truncate mt-0.5">{acc.name}</p>
                        {acc.sub_type && <p className="text-[11px] text-slate-500 truncate">{acc.sub_type}</p>}
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${cfg.bg}`}>
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: account table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
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
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        icon={BookOpen}
                        title="No accounts found"
                        description="Create your chart of accounts to get started."
                        action={
                          <Button onClick={() => setAccountFormOpen(true)} className="bg-linear-to-r from-slate-700 to-slate-900 text-white">
                            <Plus className="size-4 mr-1.5" /> New Account
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((acc) => {
                    const cfg = typeConfig[acc.type] ?? { bg: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400", label: acc.type };
                    return (
                      <TableRow key={acc.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                        <TableCell className="font-mono text-sm text-slate-600">{acc.code}</TableCell>
                        <TableCell className="font-medium text-slate-900">{acc.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500">{acc.sub_type ?? "—"}</TableCell>
                        <TableCell>
                          {acc.is_system ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Yes</span>
                          ) : <span className="text-slate-400">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Journal Entries */}
        <TabsContent value="journals" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> {postedCount} posted
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                <span className="size-1.5 rounded-full bg-slate-400" /> {draftCount} draft
              </span>
            </div>
            <Button
              onClick={() => setJEFormOpen(true)}
              className="bg-linear-to-r from-slate-700 to-slate-900 text-white hover:from-slate-800 hover:to-black shadow-md"
            >
              <Plus className="mr-2 size-4" />New Journal Entry
            </Button>
          </div>

          {/* Mobile: JE cards */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {isLoadingJE ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : jes.length === 0 ? (
              <EmptyState
                icon={List}
                title="No journal entries yet"
                description="Create double-entry bookkeeping records."
                action={
                  <Button onClick={() => setJEFormOpen(true)} className="bg-linear-to-r from-slate-700 to-slate-900 text-white">
                    <Plus className="size-4 mr-1.5" /> Create First Entry
                  </Button>
                }
              />
            ) : (
              jes.map((je) => (
                <div key={je.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className={`absolute left-0 top-0 h-full w-1 ${je.is_posted ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <div className="flex items-start justify-between gap-2 pl-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold text-slate-500">{je.entry_number}</p>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5 truncate">{je.description}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${je.is_posted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      <span className={`size-1.5 rounded-full ${je.is_posted ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {je.is_posted ? "Posted" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-500">
                    <CalendarDays className="size-3" />
                    {dateStr(je.entry_date)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: JE table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
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
                    <TableCell colSpan={4} className="p-0">
                      <EmptyState
                        icon={List}
                        title="No journal entries yet"
                        description="Create double-entry bookkeeping records."
                        action={
                          <Button onClick={() => setJEFormOpen(true)} className="bg-linear-to-r from-slate-700 to-slate-900 text-white">
                            <Plus className="size-4 mr-1.5" /> Create First Entry
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  jes.map((je) => (
                    <TableRow key={je.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                      <TableCell className="font-mono text-sm text-slate-600">{je.entry_number}</TableCell>
                      <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3 text-slate-400" />
                          {dateStr(je.entry_date)}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700">{je.description}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${je.is_posted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          <span className={`size-1.5 rounded-full ${je.is_posted ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
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
              <span className="tabular-nums">Showing {(jePage - 1) * limit + 1}–{Math.min(jePage * limit, jeTotal)} of {jeTotal}</span>
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
          <div className="h-1.5 w-full bg-linear-to-r from-slate-700 to-slate-900 shrink-0" />
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-linear-to-br from-slate-700 to-slate-900 shadow-md shadow-slate-500/30">
                <Landmark className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-slate-900 text-lg font-semibold leading-tight">New Account</SheetTitle>
                <SheetDescription className="text-slate-500 text-xs mt-0.5">
                  Add a new account to the chart of accounts.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <Separator className="shrink-0" />
          <form onSubmit={accForm.handleSubmit(onCreateAccount)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Code <span className="text-rose-500">*</span></Label>
                  <Input {...accForm.register("code")} placeholder="1001" className={accForm.formState.errors.code ? "border-rose-400" : ""} />
                  {accForm.formState.errors.code && <p className="text-xs text-rose-500">{accForm.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Type <span className="text-rose-500">*</span></Label>
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
                <Label>Name <span className="text-rose-500">*</span></Label>
                <Input {...accForm.register("name")} placeholder="Cash & Bank" className={accForm.formState.errors.name ? "border-rose-400" : ""} />
                {accForm.formState.errors.name && <p className="text-xs text-rose-500">{accForm.formState.errors.name.message}</p>}
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
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-linear-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white min-w-28 shadow-md shadow-slate-500/20"
              >
                {isSaving ? "Saving…" : "Create Account"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* New Journal Entry Sheet */}
      <Sheet open={jeFormOpen} onOpenChange={(o) => { if (!o) { setJEFormOpen(false); } }}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-slate-700 to-slate-900 shrink-0" />
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-linear-to-br from-slate-700 to-slate-900 shadow-md shadow-slate-500/30">
                <FileCheck className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-slate-900 text-lg font-semibold leading-tight">New Journal Entry</SheetTitle>
                <SheetDescription className="text-slate-500 text-xs mt-0.5">
                  Record a double-entry journal transaction.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <Separator className="shrink-0" />
          <form onSubmit={jeForm.handleSubmit(onCreateJE)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Description <span className="text-rose-500">*</span></Label>
                  <Input {...jeForm.register("description")} placeholder="Rent expense for April" className={jeForm.formState.errors.description ? "border-rose-400" : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date <span className="text-rose-500">*</span></Label>
                  <Input type="date" {...jeForm.register("entry_date")} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-slate-700">Journal Lines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendLine({ account_id: "", debit: 0, credit: 0 })}>
                    <Plus className="mr-1 size-3.5" />Add Line
                  </Button>
                </div>
                <div className="space-y-2">
                  {jeLines.map((line, index) => (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                      <div className="col-span-5">
                        <Controller control={jeForm.control} name={`lines.${index}.account_id`} render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Account…" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div className="col-span-3">
                        <Controller control={jeForm.control} name={`lines.${index}.debit`} render={({ field }) => (
                          <Input className="h-8 text-sm bg-white tabular-nums" type="number" step="0.01" min="0" placeholder="Debit" value={field.value || ""} onChange={(e) => { field.onChange(parseFloat(e.target.value) || 0); if (parseFloat(e.target.value) > 0) jeForm.setValue(`lines.${index}.credit`, 0); }} />
                        )} />
                      </div>
                      <div className="col-span-3">
                        <Controller control={jeForm.control} name={`lines.${index}.credit`} render={({ field }) => (
                          <Input className="h-8 text-sm bg-white tabular-nums" type="number" step="0.01" min="0" placeholder="Credit" value={field.value || ""} onChange={(e) => { field.onChange(parseFloat(e.target.value) || 0); if (parseFloat(e.target.value) > 0) jeForm.setValue(`lines.${index}.debit`, 0); }} />
                        )} />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500" disabled={jeLines.length <= 2} onClick={() => removeLine(index)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex flex-wrap justify-end gap-4 text-sm font-semibold">
                  <span className={`tabular-nums ${totalDebit > 0 ? "text-slate-900" : "text-slate-400"}`}>Debit: KES {KES(totalDebit)}</span>
                  <span className={`tabular-nums ${totalCredit > 0 ? "text-slate-900" : "text-slate-400"}`}>Credit: KES {KES(totalCredit)}</span>
                  {!isBalanced && totalDebit > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700">
                      <span className="size-1.5 rounded-full bg-rose-500" /> Unbalanced
                    </span>
                  )}
                  {isBalanced && totalDebit > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Balanced
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Separator className="shrink-0" />
            <SheetFooter className="px-6 py-4 shrink-0 bg-slate-50 flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setJEFormOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={isSaving || !isBalanced}
                className="bg-linear-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white min-w-28 shadow-md shadow-slate-500/20"
              >
                {isSaving ? "Saving…" : "Create Entry"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
