"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus, FolderKanban, Clock3, Users, Briefcase, TrendingUp, CheckCircle2,
  CalendarDays, Coins, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

type Project = {
  id: string; code: string; name: string;
  customer_id: string | null; customers?: { name: string } | null;
  budget_amount: number | null; currency_code: string | null;
  billing_type: string | null; hourly_rate: number | null;
  status: string | null; start_date: string | null; end_date: string | null;
};
type Customer = { id: string; name: string };
type Employee = { id: string; first_name: string; last_name: string };
type Timesheet = {
  id: string; project_id: string | null; task_id: string | null;
  employee_id: string | null; work_date: string; hours: number;
  billable: boolean; hourly_rate: number | null; notes: string | null;
  status: string;
  projects?: { name: string; code: string } | null;
  employees?: { first_name: string; last_name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  active:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  on_hold:    "bg-amber-100 text-amber-700 border-amber-200",
  completed:  "bg-slate-100 text-slate-700 border-slate-200",
  cancelled:  "bg-rose-100 text-rose-700 border-rose-200",
};

const BILLING_LABEL: Record<string, string> = {
  fixed: "Fixed Price",
  time_and_materials: "Time & Materials",
  non_billable: "Non-billable",
};

const TS_STATUS_COLOR: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  approved:  "bg-emerald-100 text-emerald-700",
  rejected:  "bg-rose-100 text-rose-700",
  invoiced:  "bg-violet-100 text-violet-700",
};

const KES = (v: number, ccy = "KES") =>
  `${ccy} ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0 }).format(v)}`;

export function ProjectsClient({
  projects: initialProjects, customers, timesheets: initialTs, employees,
}: {
  projects: Project[]; customers: Customer[]; timesheets: Timesheet[]; employees: Employee[];
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [timesheets, setTimesheets] = useState<Timesheet[]>(initialTs);
  const [openProj, setOpenProj] = useState(false);
  const [openTs, setOpenTs] = useState(false);
  const [busy, setBusy] = useState(false);

  const [pForm, setPForm] = useState({
    code: "", name: "", customer_id: "", description: "",
    start_date: "", end_date: "",
    budget_amount: 0, currency_code: "KES",
    billing_type: "time_and_materials" as "fixed"|"time_and_materials"|"non_billable",
    hourly_rate: 0,
  });

  const [tForm, setTForm] = useState({
    project_id: "", task_id: "", employee_id: "",
    work_date: new Date().toISOString().slice(0, 10),
    hours: 1, billable: true, hourly_rate: 0, notes: "",
  });

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const budget = projects.reduce((s, p) => s + Number(p.budget_amount ?? 0), 0);
    const hours = timesheets.reduce((s, t) => s + Number(t.hours ?? 0), 0);
    const billable = timesheets.filter((t) => t.billable).reduce((s, t) => s + Number(t.hours ?? 0), 0);
    return { total: projects.length, active, budget, hours, billable };
  }, [projects, timesheets]);

  async function saveProject() {
    if (!pForm.code || !pForm.name) { toast.error("Code and name required"); return; }
    setBusy(true);
    try {
      const payload = {
        ...pForm,
        customer_id: pForm.customer_id || null,
        start_date: pForm.start_date || null,
        end_date: pForm.end_date || null,
        hourly_rate: pForm.billing_type === "time_and_materials" ? pForm.hourly_rate : null,
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      const cust = customers.find((c) => c.id === pForm.customer_id);
      setProjects((prev) => [{ ...json.data, customers: cust ? { name: cust.name } : null }, ...prev]);
      setOpenProj(false);
      toast.success("Project created");
      setPForm({ ...pForm, code: "", name: "", customer_id: "", description: "" });
    } finally { setBusy(false); }
  }

  async function saveTimesheet() {
    if (!tForm.hours || tForm.hours <= 0) { toast.error("Hours must be > 0"); return; }
    setBusy(true);
    try {
      const payload = {
        ...tForm,
        project_id: tForm.project_id || null,
        task_id: tForm.task_id || null,
        employee_id: tForm.employee_id || null,
        hourly_rate: tForm.hourly_rate || null,
        notes: tForm.notes || null,
      };
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      const proj = projects.find((p) => p.id === tForm.project_id);
      const emp = employees.find((e) => e.id === tForm.employee_id);
      setTimesheets((prev) => [{
        ...json.data,
        projects: proj ? { name: proj.name, code: proj.code } : null,
        employees: emp ? { first_name: emp.first_name, last_name: emp.last_name } : null,
      }, ...prev]);
      setOpenTs(false);
      toast.success("Time logged");
    } finally { setBusy(false); }
  }

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-16"
        style={{ background: "linear-gradient(135deg, #042f2e 0%, #115e59 45%, #0891b2 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-teal-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-cyan-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-teal-100 backdrop-blur">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Delivery &amp; Time</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Projects &amp; Timesheets</h1>
          <p className="mt-2 text-teal-100/80 text-sm md:text-base max-w-2xl">
            Track billable delivery against budgets — fixed price, T&amp;M or non-billable.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            <HeroStat label="Projects" value={String(stats.total)} icon={FolderKanban} tone="teal" />
            <HeroStat label="Active" value={String(stats.active)} icon={Target} tone="emerald" />
            <HeroStat label="Budget" value={KES(stats.budget)} icon={Coins} tone="amber" />
            <HeroStat label="Hours logged" value={String(Math.round(stats.hours * 10) / 10)} icon={Clock3} tone="cyan" />
            <HeroStat label="Billable" value={String(Math.round(stats.billable * 10) / 10)} icon={TrendingUp} tone="violet" />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl">
          <Tabs defaultValue="projects">
            <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
              <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
                <TabsList className="h-10 bg-slate-100">
                  <TabsTrigger value="projects" className="data-[state=active]:bg-white gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5" /> Projects
                  </TabsTrigger>
                  <TabsTrigger value="timesheets" className="data-[state=active]:bg-white gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" /> Timesheets
                  </TabsTrigger>
                </TabsList>
                <div className="md:ml-auto flex gap-2">
                  {/* New Project */}
                  <Sheet open={openProj} onOpenChange={setOpenProj}>
                    <SheetTrigger asChild>
                      <Button className="bg-linear-to-br from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-500/20">
                        <Plus className="h-4 w-4 mr-1.5" /> New Project
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>New Project</SheetTitle>
                        <SheetDescription>Set up a project with billing method and budget.</SheetDescription>
                      </SheetHeader>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Code</Label>
                            <Input value={pForm.code} onChange={(e) => setPForm({ ...pForm, code: e.target.value })} placeholder="PRJ-001" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Name</Label>
                            <Input value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Customer</Label>
                          <Select value={pForm.customer_id} onValueChange={(v) => setPForm({ ...pForm, customer_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Internal (no customer)" /></SelectTrigger>
                            <SelectContent>
                              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Billing Type</Label>
                            <Select value={pForm.billing_type} onValueChange={(v: any) => setPForm({ ...pForm, billing_type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Price</SelectItem>
                                <SelectItem value="time_and_materials">Time &amp; Materials</SelectItem>
                                <SelectItem value="non_billable">Non-billable</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Budget</Label>
                            <Input type="number" value={pForm.budget_amount}
                              onChange={(e) => setPForm({ ...pForm, budget_amount: Number(e.target.value) })} />
                          </div>
                          {pForm.billing_type === "time_and_materials" && (
                            <div className="col-span-2 space-y-1.5">
                              <Label>Hourly Rate</Label>
                              <Input type="number" value={pForm.hourly_rate}
                                onChange={(e) => setPForm({ ...pForm, hourly_rate: Number(e.target.value) })} />
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <Label>Start</Label>
                            <Input type="date" value={pForm.start_date}
                              onChange={(e) => setPForm({ ...pForm, start_date: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>End</Label>
                            <Input type="date" value={pForm.end_date}
                              onChange={(e) => setPForm({ ...pForm, end_date: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Description</Label>
                          <Textarea rows={3} value={pForm.description}
                            onChange={(e) => setPForm({ ...pForm, description: e.target.value })} />
                        </div>
                      </div>
                      <SheetFooter className="border-t bg-white px-4 py-3 gap-2">
                        <Button variant="outline" onClick={() => setOpenProj(false)}>Cancel</Button>
                        <Button onClick={saveProject} disabled={busy} className="bg-linear-to-br from-teal-600 to-cyan-600">Create</Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>

                  {/* New Timesheet */}
                  <Sheet open={openTs} onOpenChange={setOpenTs}>
                    <SheetTrigger asChild>
                      <Button variant="outline">
                        <Clock3 className="h-4 w-4 mr-1.5" /> Log Time
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Log Timesheet</SheetTitle>
                        <SheetDescription>Record work against a project.</SheetDescription>
                      </SheetHeader>
                      <div className="p-4 space-y-4">
                        <div className="space-y-1.5">
                          <Label>Project</Label>
                          <Select value={tForm.project_id} onValueChange={(v) => setTForm({ ...tForm, project_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                            <SelectContent>
                              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Employee</Label>
                          <Select value={tForm.employee_id} onValueChange={(v) => setTForm({ ...tForm, employee_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                            <SelectContent>
                              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Date</Label>
                            <Input type="date" value={tForm.work_date}
                              onChange={(e) => setTForm({ ...tForm, work_date: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Hours</Label>
                            <Input type="number" step="0.25" min="0.25" max="24" value={tForm.hours}
                              onChange={(e) => setTForm({ ...tForm, hours: Number(e.target.value) })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Billable</Label>
                            <Select value={String(tForm.billable)} onValueChange={(v) => setTForm({ ...tForm, billable: v === "true" })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Rate (optional)</Label>
                            <Input type="number" value={tForm.hourly_rate}
                              onChange={(e) => setTForm({ ...tForm, hourly_rate: Number(e.target.value) })} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Notes</Label>
                          <Textarea rows={2} value={tForm.notes}
                            onChange={(e) => setTForm({ ...tForm, notes: e.target.value })} />
                        </div>
                      </div>
                      <SheetFooter className="border-t bg-white px-4 py-3 gap-2">
                        <Button variant="outline" onClick={() => setOpenTs(false)}>Cancel</Button>
                        <Button onClick={saveTimesheet} disabled={busy}>Log Time</Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardContent>
            </Card>

            <TabsContent value="projects" className="mt-5">
              {projects.length === 0 ? (
                <Card className="border-dashed border-slate-300 bg-white/70">
                  <CardContent className="p-16 text-center">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-linear-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-4">
                      <FolderKanban className="h-8 w-8 text-teal-600" />
                    </div>
                    <p className="text-base font-semibold text-slate-700">No projects yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create one to start tracking work and billing.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p) => {
                    const spent = timesheets
                      .filter((t) => t.project_id === p.id)
                      .reduce((s, t) => s + Number(t.hours ?? 0) * Number(t.hourly_rate ?? p.hourly_rate ?? 0), 0);
                    const budget = Number(p.budget_amount ?? 0);
                    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                    return (
                      <Card key={p.id} className="border-slate-200/80 shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5 overflow-hidden">
                        <div className="h-1 bg-linear-to-r from-teal-500 to-cyan-600" />
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-sm">{p.name}</CardTitle>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{p.code}</div>
                            </div>
                            <Badge className={`${STATUS_COLOR[p.status ?? ""] ?? STATUS_COLOR.active} border capitalize`}>
                              {p.status ?? "—"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            {p.customers?.name ?? <span className="italic text-slate-400">Internal</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            {BILLING_LABEL[p.billing_type ?? ""] ?? "—"}
                          </div>
                          {budget > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Budget used</span>
                                <span className="font-semibold">{pct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 100 ? "bg-rose-500" :
                                    pct >= 80 ? "bg-amber-500" :
                                    "bg-linear-to-r from-teal-500 to-cyan-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-500">
                                <span>{KES(spent, p.currency_code ?? "KES")}</span>
                                <span>{KES(budget, p.currency_code ?? "KES")}</span>
                              </div>
                            </div>
                          )}
                          {(p.start_date || p.end_date) && (
                            <div className="flex items-center gap-1.5 text-slate-500 pt-1 border-t">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {p.start_date ?? "—"} → {p.end_date ?? "—"}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timesheets" className="mt-5">
              <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Clock3 className="h-8 w-8 text-slate-300" />
                            <span>No timesheet entries yet.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : timesheets.map((t) => {
                      const initials = t.employees
                        ? `${t.employees.first_name[0]}${t.employees.last_name[0]}`.toUpperCase()
                        : "??";
                      return (
                        <TableRow key={t.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-xs">{t.work_date}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-linear-to-br from-teal-500 to-cyan-600 text-white text-[10px] font-bold grid place-items-center">
                                {(t.projects?.code ?? "?").slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{t.projects?.name ?? "—"}</div>
                                <div className="text-[10px] font-mono text-slate-400">{t.projects?.code}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold grid place-items-center">
                                {initials}
                              </div>
                              <span className="text-sm">{t.employees ? `${t.employees.first_name} ${t.employees.last_name}` : "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">{t.hours}h</TableCell>
                          <TableCell>
                            {t.billable ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Billable
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-500">Internal</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${TS_STATUS_COLOR[t.status] ?? ""} capitalize border-0`}>{t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const TONES = {
  teal:    "from-teal-500 to-cyan-600 shadow-teal-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  amber:   "from-amber-500 to-orange-600 shadow-amber-500/30",
  cyan:    "from-cyan-500 to-sky-600 shadow-cyan-500/30",
  violet:  "from-violet-500 to-purple-600 shadow-violet-500/30",
} as const;

function HeroStat({
  label, value, icon: Icon, tone,
}: { label: string; value: string; icon: React.ElementType; tone: keyof typeof TONES }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${TONES[tone]} shadow-lg shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{label}</div>
        <div className="text-lg md:text-xl font-bold text-white truncate">{value}</div>
      </div>
    </div>
  );
}
