"use client";

import { useState, useMemo } from "react";
import {
  Building, Plus, Play, Trash2, Edit3, AlertCircle, CheckCircle2,
  PackageX, Tag, Settings2, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Category = {
  id: string; name: string;
  default_method: "straight_line" | "reducing_balance" | "none";
  default_rate: number; default_useful_life_years: number | null;
};
type Asset = {
  id: string;
  asset_number: string;
  name: string;
  description: string | null;
  category_id: string | null;
  fixed_asset_categories?: { name: string } | null;
  serial_number: string | null;
  location: string | null;
  acquisition_date: string;
  acquisition_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  depreciation_method: string;
  depreciation_rate: number;
  useful_life_years: number | null;
  salvage_value: number;
  status: string;
  disposal_date: string | null;
  disposal_amount: number | null;
};
type Supplier = { id: string; name: string };
type Employee = { id: string; full_name: string };

const money = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FixedAssetsClient({
  initialAssets,
  initialCategories,
  suppliers,
  employees,
}: {
  initialAssets: Asset[];
  initialCategories: Category[];
  suppliers: Supplier[];
  employees: Employee[];
}) {
  const [tab, setTab] = useState<"register" | "categories" | "depreciation">("register");
  const [assets, setAssets] = useState(initialAssets);
  const [categories, setCategories] = useState(initialCategories);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", category_id: "none", serial_number: "", location: "",
    assigned_to_employee_id: "none", supplier_id: "none",
    acquisition_date: new Date().toISOString().slice(0, 10),
    acquisition_cost: "0",
    depreciation_method: "straight_line" as "straight_line" | "reducing_balance" | "none",
    depreciation_rate: "10",
    useful_life_years: "",
    salvage_value: "0",
    notes: "",
  });

  const [disposeOpen, setDisposeOpen] = useState<Asset | null>(null);
  const [disposeForm, setDisposeForm] = useState({
    disposal_date: new Date().toISOString().slice(0, 10),
    disposal_amount: "0",
    status: "disposed" as "disposed" | "written_off" | "lost",
    disposal_notes: "",
  });

  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    name: "", default_method: "straight_line" as "straight_line" | "reducing_balance" | "none",
    default_rate: "12.5", default_useful_life_years: "",
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [runningDep, setRunningDep] = useState(false);
  const [runResult, setRunResult] = useState<{ processed: number; total: number } | null>(null);
  const [depPeriod, setDepPeriod] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const reloadAssets = async () => {
    const res = await fetch("/api/fixed-assets");
    const json = await res.json();
    if (json.data) setAssets(json.data);
  };

  const applyCategoryDefaults = (categoryId: string) => {
    if (categoryId === "none") return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    setForm((f) => ({
      ...f,
      category_id: categoryId,
      depreciation_method: cat.default_method,
      depreciation_rate: String(cat.default_rate),
      useful_life_years: cat.default_useful_life_years ? String(cat.default_useful_life_years) : "",
    }));
  };

  const createAsset = async () => {
    if (!form.name || !form.acquisition_date || Number(form.acquisition_cost) <= 0) {
      setFormErr("Name, acquisition date, and cost are required.");
      return;
    }
    setCreating(true);
    setFormErr(null);
    try {
      const res = await fetch("/api/fixed-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          category_id: form.category_id === "none" ? null : form.category_id,
          serial_number: form.serial_number || null,
          location: form.location || null,
          assigned_to_employee_id: form.assigned_to_employee_id === "none" ? null : form.assigned_to_employee_id,
          supplier_id: form.supplier_id === "none" ? null : form.supplier_id,
          acquisition_date: form.acquisition_date,
          acquisition_cost: Number(form.acquisition_cost),
          depreciation_method: form.depreciation_method,
          depreciation_rate: Number(form.depreciation_rate),
          useful_life_years: form.useful_life_years ? Number(form.useful_life_years) : null,
          salvage_value: Number(form.salvage_value),
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCreateOpen(false);
      await reloadAssets();
      setForm((f) => ({ ...f, name: "", description: "", serial_number: "", location: "", acquisition_cost: "0", notes: "" }));
    } catch (e: any) {
      setFormErr(e.message);
    } finally { setCreating(false); }
  };

  const dispose = async () => {
    if (!disposeOpen) return;
    await fetch(`/api/fixed-assets/${disposeOpen.id}/dispose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disposal_date: disposeForm.disposal_date,
        disposal_amount: Number(disposeForm.disposal_amount),
        status: disposeForm.status,
        disposal_notes: disposeForm.disposal_notes || null,
      }),
    });
    setDisposeOpen(null);
    await reloadAssets();
  };

  const deleteAsset = async () => {
    if (!deleteId) return;
    await fetch(`/api/fixed-assets/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    await reloadAssets();
  };

  const createCategory = async () => {
    if (!catForm.name) return;
    const res = await fetch("/api/fixed-assets/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: catForm.name,
        default_method: catForm.default_method,
        default_rate: Number(catForm.default_rate),
        default_useful_life_years: catForm.default_useful_life_years
          ? Number(catForm.default_useful_life_years) : null,
      }),
    });
    const json = await res.json();
    if (res.ok && json.data) {
      setCategories((cs) => [...cs, json.data]);
      setCatOpen(false);
      setCatForm({ name: "", default_method: "straight_line", default_rate: "12.5", default_useful_life_years: "" });
    }
  };

  const runDepreciation = async () => {
    setRunningDep(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/fixed-assets/depreciation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_year: depPeriod.year, period_month: depPeriod.month }),
      });
      const json = await res.json();
      if (res.ok) setRunResult(json.data);
      await reloadAssets();
    } finally { setRunningDep(false); }
  };

  const summary = useMemo(() => {
    const active = assets.filter((a) => a.status === "active");
    const totalCost = assets.reduce((s, a) => s + Number(a.acquisition_cost), 0);
    const totalAccum = assets.reduce((s, a) => s + Number(a.accumulated_depreciation), 0);
    const nbv = totalCost - totalAccum;
    return { active: active.length, total: assets.length, totalCost, totalAccum, nbv };
  }, [assets]);

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-slate-700 via-slate-800 to-slate-900 p-4 sm:p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
            <Building className="size-5 sm:size-7 text-white" />
          </div>
          <div>
            <p className="text-slate-300 text-xs sm:text-sm font-medium tracking-wide uppercase">Assets</p>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Fixed Assets</h1>
            <p className="text-slate-300 text-sm mt-0.5 hidden sm:block">
              Register, depreciation, disposals
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-slate-500 uppercase">Active Assets</p>
          <p className="text-2xl font-bold text-slate-900">{summary.active}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-slate-500 uppercase">Total Cost</p>
          <p className="text-lg font-bold">KES {money(summary.totalCost)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-slate-500 uppercase">Accumulated Dep.</p>
          <p className="text-lg font-bold text-red-700">KES {money(summary.totalAccum)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-slate-500 uppercase">Net Book Value</p>
          <p className="text-lg font-bold text-emerald-700">KES {money(summary.nbv)}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-max min-w-full">
            <TabsTrigger value="register" className="gap-1.5"><Building className="size-4" />Register</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><Tag className="size-4" />Categories</TabsTrigger>
            <TabsTrigger value="depreciation" className="gap-1.5"><TrendingDown className="size-4" />Depreciation Run</TabsTrigger>
          </TabsList>
        </div>

        {/* REGISTER */}
        <TabsContent value="register" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4 mr-1.5" />Add Asset</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New Fixed Asset</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Asset name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={applyCategoryDefaults}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— none —</SelectItem>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Supplier</Label>
                    <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— none —</SelectItem>
                        {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Serial number</Label>
                    <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Assigned to</Label>
                    <Select value={form.assigned_to_employee_id} onValueChange={(v) => setForm({ ...form, assigned_to_employee_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— none —</SelectItem>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Acquisition date</Label>
                    <Input type="date" value={form.acquisition_date}
                      onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Acquisition cost (KES)</Label>
                    <Input type="number" step="0.01" value={form.acquisition_cost}
                      onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Salvage value (KES)</Label>
                    <Input type="number" step="0.01" value={form.salvage_value}
                      onChange={(e) => setForm({ ...form, salvage_value: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Depreciation method</Label>
                    <Select value={form.depreciation_method}
                      onValueChange={(v) => setForm({ ...form, depreciation_method: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">Straight-line</SelectItem>
                        <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Depreciation rate (% / year)</Label>
                    <Input type="number" step="0.01" value={form.depreciation_rate}
                      onChange={(e) => setForm({ ...form, depreciation_rate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Useful life (years, SL optional)</Label>
                    <Input type="number" value={form.useful_life_years}
                      onChange={(e) => setForm({ ...form, useful_life_years: e.target.value })} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Description / notes</Label>
                    <Textarea value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                {formErr && (
                  <div className="rounded-lg p-3 text-sm flex items-start gap-2 bg-red-50 text-red-800 border border-red-200">
                    <AlertCircle className="size-4 mt-0.5 shrink-0" /><span>{formErr}</span>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={createAsset} disabled={creating}>{creating ? "Saving…" : "Save Asset"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Asset Register</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {assets.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Building className="size-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No assets yet. Click <strong>Add Asset</strong> to start.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Asset #</TableHead>
                      <TableHead className="whitespace-nowrap">Name</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">Acquired</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Cost</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Accum. Dep.</TableHead>
                      <TableHead className="whitespace-nowrap text-right">NBV</TableHead>
                      <TableHead className="whitespace-nowrap">Method</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{a.asset_number}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{a.name}</div>
                          {a.location && <div className="text-xs text-slate-500">{a.location}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{a.fixed_asset_categories?.name ?? "—"}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{a.acquisition_date}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{money(a.acquisition_cost)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap text-red-700">{money(a.accumulated_depreciation)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap font-semibold text-emerald-700">{money(a.book_value)}</TableCell>
                        <TableCell className="text-xs capitalize whitespace-nowrap">
                          {a.depreciation_method.replace("_", " ")}
                          {a.depreciation_rate > 0 && ` • ${a.depreciation_rate}%`}
                        </TableCell>
                        <TableCell>
                          {a.status === "active" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>}
                          {a.status === "disposed" && <Badge className="bg-slate-200 text-slate-700">Disposed</Badge>}
                          {a.status === "written_off" && <Badge className="bg-red-100 text-red-800 border-red-200">Written off</Badge>}
                          {a.status === "lost" && <Badge className="bg-amber-100 text-amber-800 border-amber-200">Lost</Badge>}
                          {a.status === "in_maintenance" && <Badge variant="outline">Maintenance</Badge>}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {a.status === "active" && (
                            <Button size="sm" variant="ghost" title="Dispose" onClick={() => setDisposeOpen(a)}>
                              <PackageX className="size-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(a.id)}>
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

        {/* CATEGORIES */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4 mr-1.5" />Add Category</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Asset Category</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      placeholder="e.g. Computer Equipment" />
                  </div>
                  <div className="space-y-1">
                    <Label>Default depreciation method</Label>
                    <Select value={catForm.default_method} onValueChange={(v) => setCatForm({ ...catForm, default_method: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">Straight-line</SelectItem>
                        <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Rate (% / year)</Label>
                      <Input type="number" step="0.01" value={catForm.default_rate}
                        onChange={(e) => setCatForm({ ...catForm, default_rate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Useful life (years)</Label>
                      <Input type="number" value={catForm.default_useful_life_years}
                        onChange={(e) => setCatForm({ ...catForm, default_useful_life_years: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
                  <Button onClick={createCategory}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {categories.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Tag className="size-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No categories yet. Common Kenya examples: Motor Vehicles (25%), Computers (30%), Furniture (12.5%).</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Useful Life</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="capitalize text-xs">{c.default_method.replace("_", " ")}</TableCell>
                        <TableCell className="text-right">{c.default_rate}%</TableCell>
                        <TableCell className="text-right">{c.default_useful_life_years ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPRECIATION RUN */}
        <TabsContent value="depreciation" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="size-4" />Monthly Depreciation Run</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Posts depreciation for all active assets for the selected month. Already-posted periods are skipped (idempotent).
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input type="number" className="w-28" value={depPeriod.year}
                    onChange={(e) => setDepPeriod({ ...depPeriod, year: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Month</Label>
                  <Select value={String(depPeriod.month)} onValueChange={(v) => setDepPeriod({ ...depPeriod, month: Number(v) })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {new Date(2000, i, 1).toLocaleString("en", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={runDepreciation} disabled={runningDep}>
                  <Play className="size-4 mr-1.5" />{runningDep ? "Running…" : "Run Depreciation"}
                </Button>
              </div>
              {runResult && (
                <div className="rounded-lg p-3 text-sm flex items-start gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                  <span>Processed {runResult.processed} of {runResult.total} assets for the period.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DISPOSE DIALOG */}
      <Dialog open={!!disposeOpen} onOpenChange={(o) => !o && setDisposeOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispose Asset — {disposeOpen?.asset_number}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-slate-50 border p-3 text-sm">
              <div className="font-medium">{disposeOpen?.name}</div>
              <div className="text-xs text-slate-500">
                NBV: KES {money(disposeOpen?.book_value)} (cost {money(disposeOpen?.acquisition_cost)} − dep {money(disposeOpen?.accumulated_depreciation)})
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Disposal date</Label>
                <Input type="date" value={disposeForm.disposal_date}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposal_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Disposal amount (KES)</Label>
                <Input type="number" step="0.01" value={disposeForm.disposal_amount}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposal_amount: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Type</Label>
                <Select value={disposeForm.status} onValueChange={(v) => setDisposeForm({ ...disposeForm, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disposed">Disposed (sold)</SelectItem>
                    <SelectItem value="written_off">Written off</SelectItem>
                    <SelectItem value="lost">Lost / stolen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={disposeForm.disposal_notes}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposal_notes: e.target.value })} />
              </div>
            </div>
            {disposeOpen && Number(disposeForm.disposal_amount) !== disposeOpen.book_value && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Gain/loss on disposal: KES {money(Number(disposeForm.disposal_amount) - (disposeOpen?.book_value ?? 0))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeOpen(null)}>Cancel</Button>
            <Button onClick={dispose}>Confirm Disposal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>Removes the asset and all its depreciation history. Consider disposing instead if it's historical.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAsset} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
