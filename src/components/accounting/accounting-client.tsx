"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, BookOpen, List } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

  return (
    <div className="space-y-4">
      <Tabs defaultValue="chart">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="chart"><BookOpen className="mr-1.5 h-3.5 w-3.5" />Chart of Accounts ({accCount})</TabsTrigger>
            <TabsTrigger value="journals"><List className="mr-1.5 h-3.5 w-3.5" />Journal Entries ({jeTotal})</TabsTrigger>
          </TabsList>
        </div>

        {/* Chart of Accounts */}
        <TabsContent value="chart" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search accounts…" value={accSearch} onChange={(e) => { setAccSearch(e.target.value); }} className="pl-9" />
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
            <Button onClick={() => setAccountFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />New Account
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sub-type</TableHead>
                    <TableHead>System</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAcc ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center">
                        <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">No accounts found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-mono text-sm text-slate-600">{acc.code}</TableCell>
                        <TableCell className="font-medium">{acc.name}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[acc.type] ?? ""}`}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries */}
        <TabsContent value="journals" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setJEFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />New Journal Entry
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingJE ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : jes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center">
                        <List className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">No journal entries yet</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setJEFormOpen(true)}>Create first entry</Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    jes.map((je) => (
                      <TableRow key={je.id}>
                        <TableCell className="font-mono text-sm text-blue-600">{je.entry_number}</TableCell>
                        <TableCell className="text-slate-500">{dateStr(je.entry_date)}</TableCell>
                        <TableCell>{je.description}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${je.is_posted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {je.is_posted ? "Posted" : "Draft"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>New Account</SheetTitle></SheetHeader>
          <form onSubmit={accForm.handleSubmit(onCreateAccount)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input {...accForm.register("code")} placeholder="1001" className={accForm.formState.errors.code ? "border-destructive" : ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
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
              <Label>Name *</Label>
              <Input {...accForm.register("name")} placeholder="Cash & Bank" className={accForm.formState.errors.name ? "border-destructive" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Sub-type</Label>
              <Input {...accForm.register("sub_type")} placeholder="current_asset" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input {...accForm.register("description")} placeholder="Optional description" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAccountFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? "Saving…" : "Create Account"}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* New Journal Entry Sheet */}
      <Sheet open={jeFormOpen} onOpenChange={(o) => { if (!o) { setJEFormOpen(false); } }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>New Journal Entry</SheetTitle></SheetHeader>
          <form onSubmit={jeForm.handleSubmit(onCreateJE)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Input {...jeForm.register("description")} placeholder="Rent expense for April" className={jeForm.formState.errors.description ? "border-destructive" : ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" {...jeForm.register("entry_date")} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lines</Label>
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
              <div className="flex justify-end gap-8 text-sm font-medium">
                <span className={totalDebit > 0 ? "text-slate-900" : "text-slate-400"}>Debit: KES {KES(totalDebit)}</span>
                <span className={totalCredit > 0 ? "text-slate-900" : "text-slate-400"}>Credit: KES {KES(totalCredit)}</span>
                {!isBalanced && totalDebit > 0 && <span className="text-red-600">Unbalanced</span>}
                {isBalanced && totalDebit > 0 && <span className="text-emerald-600">Balanced</span>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setJEFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isSaving || !isBalanced}>{isSaving ? "Saving…" : "Create Entry"}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
