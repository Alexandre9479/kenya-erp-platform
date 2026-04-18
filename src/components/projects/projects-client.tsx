"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FolderKanban, Clock3 } from "lucide-react";

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

  async function saveProject() {
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
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      const cust = customers.find((c) => c.id === pForm.customer_id);
      setProjects((prev) => [{ ...json.data, customers: cust ? { name: cust.name } : null }, ...prev]);
      setOpenProj(false);
      setPForm({ ...pForm, code: "", name: "", customer_id: "", description: "" });
    } finally { setBusy(false); }
  }

  async function saveTimesheet() {
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
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      const proj = projects.find((p) => p.id === tForm.project_id);
      const emp = employees.find((e) => e.id === tForm.employee_id);
      setTimesheets((prev) => [{
        ...json.data,
        projects: proj ? { name: proj.name, code: proj.code } : null,
        employees: emp ? { first_name: emp.first_name, last_name: emp.last_name } : null,
      }, ...prev]);
      setOpenTs(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Projects & Timesheets</h1>
        <p className="text-sm text-slate-500 mt-1">Track billable work, budgets and time against projects</p>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects"><FolderKanban className="h-4 w-4 mr-1" /> Projects</TabsTrigger>
          <TabsTrigger value="timesheets"><Clock3 className="h-4 w-4 mr-1" /> Timesheets</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={openProj} onOpenChange={setOpenProj}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Project</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={pForm.code} onChange={(e) => setPForm({ ...pForm, code: e.target.value })} /></div>
                  <div><Label>Name</Label><Input value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} /></div>
                  <div className="col-span-2">
                    <Label>Customer</Label>
                    <Select value={pForm.customer_id} onValueChange={(v) => setPForm({ ...pForm, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Internal (no customer)" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Billing</Label>
                    <Select value={pForm.billing_type} onValueChange={(v: any) => setPForm({ ...pForm, billing_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="time_and_materials">Time & Materials</SelectItem>
                        <SelectItem value="non_billable">Non-billable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Budget</Label>
                    <Input type="number" value={pForm.budget_amount} onChange={(e) => setPForm({ ...pForm, budget_amount: Number(e.target.value) })} />
                  </div>
                  {pForm.billing_type === "time_and_materials" && (
                    <div className="col-span-2">
                      <Label>Hourly Rate</Label>
                      <Input type="number" value={pForm.hourly_rate} onChange={(e) => setPForm({ ...pForm, hourly_rate: Number(e.target.value) })} />
                    </div>
                  )}
                  <div><Label>Start</Label><Input type="date" value={pForm.start_date} onChange={(e) => setPForm({ ...pForm, start_date: e.target.value })} /></div>
                  <div><Label>End</Label><Input type="date" value={pForm.end_date} onChange={(e) => setPForm({ ...pForm, end_date: e.target.value })} /></div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Textarea rows={2} value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setOpenProj(false)}>Cancel</Button>
                  <Button onClick={saveProject} disabled={busy || !pForm.code || !pForm.name}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {projects.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-500">No projects yet.</CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        <div className="text-xs text-slate-500">{p.code}</div>
                      </div>
                      <Badge variant="outline" className="capitalize">{p.status ?? "—"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-500 space-y-1">
                    <div>Customer: {p.customers?.name ?? "Internal"}</div>
                    <div>Billing: {p.billing_type?.replace(/_/g, " ") ?? "—"}</div>
                    {p.budget_amount != null && <div>Budget: {p.currency_code ?? "KES"} {Number(p.budget_amount).toLocaleString()}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timesheets" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={openTs} onOpenChange={setOpenTs}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Log Time</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Log Timesheet</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Project</Label>
                    <Select value={tForm.project_id} onValueChange={(v) => setTForm({ ...tForm, project_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Employee</Label>
                    <Select value={tForm.employee_id} onValueChange={(v) => setTForm({ ...tForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date</Label><Input type="date" value={tForm.work_date} onChange={(e) => setTForm({ ...tForm, work_date: e.target.value })} /></div>
                  <div><Label>Hours</Label><Input type="number" step="0.25" min="0.25" max="24" value={tForm.hours} onChange={(e) => setTForm({ ...tForm, hours: Number(e.target.value) })} /></div>
                  <div><Label>Billable?</Label>
                    <Select value={String(tForm.billable)} onValueChange={(v) => setTForm({ ...tForm, billable: v === "true" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Rate (optional)</Label><Input type="number" value={tForm.hourly_rate} onChange={(e) => setTForm({ ...tForm, hourly_rate: Number(e.target.value) })} /></div>
                  <div className="col-span-2"><Label>Notes</Label>
                    <Textarea rows={2} value={tForm.notes} onChange={(e) => setTForm({ ...tForm, notes: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setOpenTs(false)}>Cancel</Button>
                  <Button onClick={saveTimesheet} disabled={busy}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-500">No entries yet.</TableCell></TableRow>
                ) : timesheets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.work_date}</TableCell>
                    <TableCell>{t.projects?.name ?? "—"}</TableCell>
                    <TableCell>{t.employees ? `${t.employees.first_name} ${t.employees.last_name}` : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{t.hours}</TableCell>
                    <TableCell>{t.billable ? "Yes" : "No"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
