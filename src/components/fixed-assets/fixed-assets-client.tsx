"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Building, Plus, Play, Trash2, CheckCircle2, PackageX, Tag, TrendingDown,
  Landmark, Wallet, Activity, Calendar, Sparkles, Coins, Banknote,
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
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

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

const money = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  active:         { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Active" },
  disposed:       { bg: "bg-slate-100 text-slate-700 border-slate-200",       label: "Disposed" },
  written_off:    { bg: "bg-rose-100 text-rose-800 border-rose-200",          label: "Written off" },
  lost:           { bg: "bg-amber-100 text-amber-800 border-amber-200",       label: "Lost" },
  in_maintenance: { bg: "bg-sky-100 text-sky-800 border-sky-200",             label: "Maintenance" },
};

export function FixedAssetsClient({
  initialAssets, initialCategories, suppliers, employees,
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
    name: "",
    default_method: "straight_line" as "straight_line" | "reducing_balance" | "none",
    default_rate: "12.5",
    default_useful_life_years: "",
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
    setForm((f) => ({ ...f, category_id: categoryId }));
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
      toast.error("Name, acquisition date, and cost are required.");
      return;
    }
    setCreating(true);
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
      if (!res.ok) { toast.error(json.error ?? "Failed to save asset"); return; }
      setCreateOpen(false);
      await reloadAssets();
      setForm((f) => ({ ...f, name: "", description: "", serial_number: "", location: "", acquisition_cost: "0", notes: "" }));
      toast.success("Asset added");
    } finally { setCreating(false); }
  };

  const dispose = async () => {
    if (!disposeOpen) return;
    const res = await fetch(`/api/fixed-assets/${disposeOpen.id}/dispose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disposal_date: disposeForm.disposal_date,
        disposal_amount: Number(disposeForm.disposal_amount),
        status: disposeForm.status,
        disposal_notes: disposeForm.disposal_notes || null,
      }),
    });
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Disposal failed"); return; }
    setDisposeOpen(null);
    await reloadAssets();
    toast.success("Asset disposed");
  };

  const deleteAsset = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/fixed-assets/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    await reloadAssets();
    if (res.ok) toast.success("Asset deleted");
    else toast.error("Delete failed");
  };

  const createCategory = async () => {
    if (!catForm.name) { toast.error("Name required"); return; }
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
      toast.success("Category created");
    } else {
      toast.error(json.error ?? "Failed to create category");
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
      if (res.ok) {
        setRunResult(json.data);
        toast.success(`Depreciation posted for ${json.data?.processed ?? 0} assets`);
      } else {
        toast.error(json.error ?? "Depreciation run failed");
      }
      await reloadAssets();
    } finally { setRunningDep(false); }
  };

  const summary = useMemo(() => {
    const active = assets.filter((a) => a.status === "active");
    const disposed = assets.filter((a) => a.status !== "active").length;
    const totalCost = assets.reduce((s, a) => s + Number(a.acquisition_cost), 0);
    const totalAccum = assets.reduce((s, a) => s + Number(a.accumulated_depreciation), 0);
    const nbv = totalCost - totalAccum;
    return { active: active.length, total: assets.length, disposed, totalCost, totalAccum, nbv };
  }, [assets]);

  const gainLoss = disposeOpen
    ? Number(disposeForm.disposal_amount) - Number(disposeOpen.book_value ?? 0)
    : 0;

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-14"
        style={{ background: "linear-gradient(135deg, #134e4a 0%, #115e59 45%, #0f766e 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-teal-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-100 backdrop-blur">
            <Landmark className="h-3.5 w-3.5" />
            <span>Asset Register</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Fixed Assets</h1>
          <p className="mt-2 text-emerald-100/80 text-sm md:text-base max-w-2xl">
            Register acquisitions, run monthly depreciation, and record disposals. NBV and accumulated depreciation update in real time.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat label="Active assets" value={summary.active} icon={Building} tone="emerald" hint={`${summary.total} in register`} />
            <HeroStat label="Total cost" value={`KES ${money(summary.totalCost)}`} icon={Coins} tone="amber" />
            <HeroStat label="Accum. dep." value={`KES ${money(summary.totalAccum)}`} icon={TrendingDown} tone="rose" />
            <HeroStat label="Net book value" value={`KES ${money(summary.nbv)}`} icon={Wallet} tone="sky" />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl space-y-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
              <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
                <TabsList className="h-10 bg-slate-100">
                  <TabsTrigger value="register" className="data-[state=active]:bg-white gap-1.5">
                    <Building className="h-3.5 w-3.5" /> Register
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="data-[state=active]:bg-white gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Categories
                  </TabsTrigger>
                  <TabsTrigger value="depreciation" className="data-[state=active]:bg-white gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5" /> Depreciation Run
                  </TabsTrigger>
                </TabsList>
                <div className="md:ml-auto">
                  {tab === "register" && (
                    <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                      <SheetTrigger asChild>
                        <Button className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                          <Plus className="h-4 w-4 mr-1.5" /> Add Asset
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 shadow shadow-emerald-500/30">
                              <Building className="h-4 w-4 text-white" />
                            </div>
                            New Fixed Asset
                          </SheetTitle>
                          <SheetDescription>Register a new asset with its depreciation schedule.</SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 grid gap-4 px-4 sm:grid-cols-2">
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label>Asset name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Toyota Hilux KDA 123A" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Category</Label>
                            <Select value={form.category_id} onValueChange={applyCategoryDefaults}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— none —</SelectItem>
                                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Supplier</Label>
                            <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— none —</SelectItem>
                                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Serial number</Label>
                            <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Location</Label>
                            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Assigned to</Label>
                            <Select value={form.assigned_to_employee_id} onValueChange={(v) => setForm({ ...form, assigned_to_employee_id: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— none —</SelectItem>
                                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Acquisition date</Label>
                            <Input type="date" value={form.acquisition_date}
                              onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Acquisition cost (KES)</Label>
                            <Input type="number" step="0.01" value={form.acquisition_cost}
                              onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Salvage value (KES)</Label>
                            <Input type="number" step="0.01" value={form.salvage_value}
                              onChange={(e) => setForm({ ...form, salvage_value: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Depreciation method</Label>
                            <Select value={form.depreciation_method}
                              onValueChange={(v) => setForm({ ...form, depreciation_method: v as typeof form.depreciation_method })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="straight_line">Straight-line</SelectItem>
                                <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Rate (% / year)</Label>
                            <Input type="number" step="0.01" value={form.depreciation_rate}
                              onChange={(e) => setForm({ ...form, depreciation_rate: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Useful life (yrs)</Label>
                            <Input type="number" value={form.useful_life_years}
                              onChange={(e) => setForm({ ...form, useful_life_years: e.target.value })} />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label>Description / notes</Label>
                            <Textarea value={form.description}
                              onChange={(e) => setForm({ ...form, description: e.target.value })} />
                          </div>
                          <Separator className="sm:col-span-2" />
                          <div className="sm:col-span-2 flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button onClick={createAsset} disabled={creating}
                              className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                              {creating ? "Saving…" : "Save Asset"}
                            </Button>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                  {tab === "categories" && (
                    <Sheet open={catOpen} onOpenChange={setCatOpen}>
                      <SheetTrigger asChild>
                        <Button className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                          <Plus className="h-4 w-4 mr-1.5" /> Add Category
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-purple-600 shadow shadow-violet-500/30">
                              <Tag className="h-4 w-4 text-white" />
                            </div>
                            New Asset Category
                          </SheetTitle>
                          <SheetDescription>Defaults from category auto-fill when registering assets.</SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-4 px-4">
                          <div className="space-y-1.5">
                            <Label>Name</Label>
                            <Input value={catForm.name}
                              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                              placeholder="e.g. Computer Equipment" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Default method</Label>
                            <Select value={catForm.default_method}
                              onValueChange={(v) => setCatForm({ ...catForm, default_method: v as typeof catForm.default_method })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="straight_line">Straight-line</SelectItem>
                                <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label>Rate (% / year)</Label>
                              <Input type="number" step="0.01" value={catForm.default_rate}
                                onChange={(e) => setCatForm({ ...catForm, default_rate: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Useful life (yrs)</Label>
                              <Input type="number" value={catForm.default_useful_life_years}
                                onChange={(e) => setCatForm({ ...catForm, default_useful_life_years: e.target.value })} />
                            </div>
                          </div>
                          <Separator />
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
                            <Button onClick={createCategory}
                              className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                              Save Category
                            </Button>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* REGISTER */}
            <TabsContent value="register" className="space-y-4 mt-5">
              <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 shadow shadow-emerald-500/30">
                      <Building className="h-4 w-4 text-white" />
                    </div>
                    Asset Register
                    <Badge variant="outline" className="ml-auto bg-slate-50 text-slate-600 border-slate-200">
                      {assets.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {assets.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                        <Building className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-700">No assets yet</p>
                      <p className="text-xs text-slate-500">Click <strong>Add Asset</strong> to register your first.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableHead className="whitespace-nowrap">Asset #</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="whitespace-nowrap">Acquired</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Cost</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Accum. Dep.</TableHead>
                          <TableHead className="text-right whitespace-nowrap">NBV</TableHead>
                          <TableHead className="whitespace-nowrap">Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((a) => {
                          const st = STATUS_CONFIG[a.status] ?? { bg: "bg-slate-100 text-slate-700 border-slate-200", label: a.status };
                          return (
                            <TableRow key={a.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-mono text-xs whitespace-nowrap">{a.asset_number}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-100 to-teal-100 text-teal-700">
                                    <Building className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{a.name}</div>
                                    {a.location && <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{a.location}</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">{a.fixed_asset_categories?.name ?? "—"}</TableCell>
                              <TableCell className="text-xs text-slate-600 whitespace-nowrap">{a.acquisition_date}</TableCell>
                              <TableCell className="text-right tabular-nums whitespace-nowrap">{money(a.acquisition_cost)}</TableCell>
                              <TableCell className="text-right tabular-nums whitespace-nowrap text-rose-700">{money(a.accumulated_depreciation)}</TableCell>
                              <TableCell className="text-right tabular-nums whitespace-nowrap font-semibold text-emerald-700">{money(a.book_value)}</TableCell>
                              <TableCell className="text-xs capitalize whitespace-nowrap text-slate-600">
                                {a.depreciation_method.replace("_", " ")}
                                {a.depreciation_rate > 0 && <span className="text-slate-400"> · {a.depreciation_rate}%</span>}
                              </TableCell>
                              <TableCell><Badge className={`${st.bg} border`}>{st.label}</Badge></TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {a.status === "active" && (
                                  <Button size="icon" variant="ghost" title="Dispose" className="h-8 w-8 hover:bg-amber-50 hover:text-amber-700" onClick={() => setDisposeOpen(a)}>
                                    <PackageX className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-rose-50 hover:text-rose-600" onClick={() => setDeleteId(a.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* CATEGORIES */}
            <TabsContent value="categories" className="space-y-4 mt-5">
              <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-purple-600 shadow shadow-violet-500/30">
                      <Tag className="h-4 w-4 text-white" />
                    </div>
                    Categories
                    <Badge variant="outline" className="ml-auto bg-slate-50 text-slate-600 border-slate-200">
                      {categories.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {categories.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                        <Tag className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-700">No categories yet</p>
                      <p className="text-xs text-slate-500">Kenya examples: Motor Vehicles (25%), Computers (30%), Furniture (12.5%).</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableHead>Name</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Useful Life</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((c) => (
                          <TableRow key={c.id} className="hover:bg-slate-50/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                                  <Tag className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-medium text-slate-900">{c.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize text-xs text-slate-600">{c.default_method.replace("_", " ")}</TableCell>
                            <TableCell className="text-right tabular-nums">{c.default_rate}%</TableCell>
                            <TableCell className="text-right tabular-nums">{c.default_useful_life_years ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* DEPRECIATION RUN */}
            <TabsContent value="depreciation" className="space-y-4 mt-5">
              <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-rose-500 via-pink-500 to-fuchsia-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-rose-500 to-pink-600 shadow shadow-rose-500/30">
                      <TrendingDown className="h-4 w-4 text-white" />
                    </div>
                    Monthly Depreciation Run
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm text-sky-900 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      Posts depreciation for all active assets for the selected period.
                      <span className="text-sky-800/80"> Already-posted periods are skipped (idempotent).</span>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Year</Label>
                      <Input type="number" value={depPeriod.year}
                        onChange={(e) => setDepPeriod({ ...depPeriod, year: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Month</Label>
                      <Select value={String(depPeriod.month)} onValueChange={(v) => setDepPeriod({ ...depPeriod, month: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }).map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {new Date(2000, i, 1).toLocaleString("en", { month: "long" })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="opacity-0 hidden sm:block">Run</Label>
                      <Button onClick={runDepreciation} disabled={runningDep}
                        className="bg-linear-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white">
                        <Play className="h-4 w-4 mr-1.5" />{runningDep ? "Running…" : "Run Depreciation"}
                      </Button>
                    </div>
                  </div>
                  {runResult && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Processed <strong>{runResult.processed}</strong> of {runResult.total} assets for {new Date(depPeriod.year, depPeriod.month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" })}.</span>
                    </div>
                  )}
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><Activity className="h-3 w-3" /> Depreciable</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{assets.filter((a) => a.status === "active" && a.depreciation_method !== "none").length}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><Calendar className="h-3 w-3" /> Period</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{new Date(depPeriod.year, depPeriod.month - 1, 1).toLocaleString("en", { month: "short", year: "numeric" })}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"><Banknote className="h-3 w-3" /> Current NBV</div>
                      <div className="text-lg font-bold text-emerald-700 mt-1">KES {money(summary.nbv)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* DISPOSE SHEET */}
      <Sheet open={!!disposeOpen} onOpenChange={(o) => !o && setDisposeOpen(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow shadow-amber-500/30">
                <PackageX className="h-4 w-4 text-white" />
              </div>
              Dispose Asset
            </SheetTitle>
            <SheetDescription>
              {disposeOpen && <>Record disposal of <span className="font-mono">{disposeOpen.asset_number}</span></>}
            </SheetDescription>
          </SheetHeader>
          {disposeOpen && (
            <div className="mt-6 space-y-4 px-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-900">{disposeOpen.name}</div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Cost</div>
                    <div className="text-sm tabular-nums font-medium">{money(disposeOpen.acquisition_cost)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Dep.</div>
                    <div className="text-sm tabular-nums font-medium text-rose-700">{money(disposeOpen.accumulated_depreciation)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">NBV</div>
                    <div className="text-sm tabular-nums font-semibold text-emerald-700">{money(disposeOpen.book_value)}</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Disposal date</Label>
                  <Input type="date" value={disposeForm.disposal_date}
                    onChange={(e) => setDisposeForm({ ...disposeForm, disposal_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Disposal amount (KES)</Label>
                  <Input type="number" step="0.01" value={disposeForm.disposal_amount}
                    onChange={(e) => setDisposeForm({ ...disposeForm, disposal_amount: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Type</Label>
                  <Select value={disposeForm.status}
                    onValueChange={(v) => setDisposeForm({ ...disposeForm, status: v as typeof disposeForm.status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disposed">Disposed (sold)</SelectItem>
                      <SelectItem value="written_off">Written off</SelectItem>
                      <SelectItem value="lost">Lost / stolen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={disposeForm.disposal_notes}
                    onChange={(e) => setDisposeForm({ ...disposeForm, disposal_notes: e.target.value })} />
                </div>
              </div>
              {Number(disposeForm.disposal_amount) !== Number(disposeOpen.book_value) && (
                <div className={`rounded-xl border p-3 text-sm flex items-center justify-between ${
                  gainLoss >= 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}>
                  <span className="font-medium">{gainLoss >= 0 ? "Gain on disposal" : "Loss on disposal"}</span>
                  <span className="font-bold tabular-nums">KES {money(Math.abs(gainLoss))}</span>
                </div>
              )}
              <Separator />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDisposeOpen(null)}>Cancel</Button>
                <Button onClick={dispose}
                  className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                  Confirm Disposal
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the asset and all its depreciation history. If it&apos;s historical, consider disposing instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAsset} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
