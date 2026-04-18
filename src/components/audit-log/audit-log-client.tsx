"use client";

import { useMemo, useState } from "react";
import {
  ScrollText, Search, Filter, Activity, Plus, Pencil, Trash2, LogIn, LogOut,
  Eye, Download, Upload, CheckCircle2, XCircle, Send, DollarSign, FileText,
  Users, Package, Warehouse as WarehouseIcon, ShoppingCart, Receipt, Settings,
  Clock, Shield, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  created_at: string;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  users?: { name: string | null; email: string | null } | null;
};

const TONES = {
  slate:   "from-slate-500 to-slate-700 shadow-slate-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  sky:     "from-sky-500 to-indigo-600 shadow-sky-500/30",
  amber:   "from-amber-500 to-orange-600 shadow-amber-500/30",
  rose:    "from-rose-500 to-pink-600 shadow-rose-500/30",
} as const;
type Tone = keyof typeof TONES;

const ACTION_STYLE: Record<string, { bg: string; icon: React.ElementType }> = {
  create:   { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: Plus },
  insert:   { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: Plus },
  update:   { bg: "bg-sky-100 text-sky-800 border-sky-200",             icon: Pencil },
  edit:     { bg: "bg-sky-100 text-sky-800 border-sky-200",             icon: Pencil },
  delete:   { bg: "bg-rose-100 text-rose-800 border-rose-200",          icon: Trash2 },
  remove:   { bg: "bg-rose-100 text-rose-800 border-rose-200",          icon: Trash2 },
  login:    { bg: "bg-indigo-100 text-indigo-800 border-indigo-200",    icon: LogIn },
  logout:   { bg: "bg-slate-100 text-slate-700 border-slate-200",       icon: LogOut },
  view:     { bg: "bg-slate-100 text-slate-700 border-slate-200",       icon: Eye },
  export:   { bg: "bg-violet-100 text-violet-800 border-violet-200",    icon: Download },
  import:   { bg: "bg-violet-100 text-violet-800 border-violet-200",    icon: Upload },
  approve:  { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  reject:   { bg: "bg-rose-100 text-rose-800 border-rose-200",          icon: XCircle },
  send:     { bg: "bg-amber-100 text-amber-800 border-amber-200",       icon: Send },
  pay:      { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: DollarSign },
  payment:  { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: DollarSign },
};

const ENTITY_ICON: Record<string, React.ElementType> = {
  invoice: FileText,
  invoices: FileText,
  quote: FileText,
  quotes: FileText,
  bill: FileText,
  bills: FileText,
  payment: DollarSign,
  payments: DollarSign,
  customer: Users,
  customers: Users,
  vendor: Users,
  vendors: Users,
  user: Users,
  users: Users,
  product: Package,
  products: Package,
  warehouse: WarehouseIcon,
  warehouses: WarehouseIcon,
  order: ShoppingCart,
  orders: ShoppingCart,
  pos_order: Receipt,
  expense: Receipt,
  expenses: Receipt,
  setting: Settings,
  settings: Settings,
};

function actionConfig(action: string | null) {
  const key = (action ?? "").toLowerCase();
  for (const k of Object.keys(ACTION_STYLE)) {
    if (key.includes(k)) return { ...ACTION_STYLE[k], label: action ?? "—" };
  }
  return { bg: "bg-slate-100 text-slate-700 border-slate-200", icon: Activity, label: action ?? "—" };
}

function entityIcon(entity: string | null) {
  const key = (entity ?? "").toLowerCase();
  return ENTITY_ICON[key] ?? Activity;
}

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
        <div className="text-xl font-bold text-white truncate">{value}</div>
        {hint && <div className="text-[10px] text-white/50 truncate">{hint}</div>}
      </div>
    </div>
  );
}

function initials(n?: string | null, e?: string | null) {
  const src = (n ?? e ?? "?").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AuditLogClient({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const actions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.action) s.add(r.action);
    return Array.from(s).sort();
  }, [rows]);

  const entities = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.entity_type) s.add(r.entity_type);
    return Array.from(s).sort();
  }, [rows]);

  const uniqueUsers = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const id = r.users?.email ?? r.users?.name;
      if (id) s.add(id);
    }
    return s.size;
  }, [rows]);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const t = d.getTime();
    return rows.filter((r) => new Date(r.created_at).getTime() >= t).length;
  }, [rows]);

  const destructive = useMemo(
    () => rows.filter((r) => /delete|remove|revoke|void/i.test(r.action ?? "")).length,
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
      if (!q) return true;
      return [
        r.action ?? "", r.entity_type ?? "", r.entity_id ?? "",
        r.description ?? "", r.users?.name ?? "", r.users?.email ?? "",
      ].join(" ").toLowerCase().includes(q);
    });
  }, [rows, query, actionFilter, entityFilter]);

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-14"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #334155 100%)" }}
      >
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-slate-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-indigo-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 backdrop-blur">
            <Shield className="h-3.5 w-3.5" />
            <span>Security &amp; Compliance</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Audit Log</h1>
          <p className="mt-2 text-slate-300/80 text-sm md:text-base max-w-2xl">
            Every meaningful action across the platform — who did what, when, and to which record. Filterable &amp; searchable.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat label="Total events" value={rows.length.toLocaleString()} icon={Activity} tone="sky" hint="last 500 loaded" />
            <HeroStat label="Today" value={today} icon={Clock} tone="emerald" />
            <HeroStat label="Unique users" value={uniqueUsers} icon={Users} tone="amber" />
            <HeroStat label="Destructive" value={destructive} icon={Trash2} tone="rose" hint="delete · void · revoke" />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl space-y-5">
          <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
            <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by user, entity, description…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Filter className="h-3.5 w-3.5" /> Filter
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-10 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actions.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="h-10 w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    {entities.map((e) => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/40">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-slate-500 via-indigo-500 to-slate-700" />
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <ScrollText className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">No events match</p>
                  <p className="text-xs text-slate-500">Adjust your filters or search term.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="w-[160px]">When</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="w-[140px]">Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const a = actionConfig(r.action);
                      const EntIcon = entityIcon(r.entity_type);
                      const ActIcon = a.icon;
                      return (
                        <TableRow key={r.id} className="hover:bg-slate-50/50">
                          <TableCell className="align-top py-3">
                            <div className="text-xs font-medium text-slate-900">{timeAgo(r.created_at)}</div>
                            <div className="text-[11px] text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
                          </TableCell>
                          <TableCell className="align-top py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-slate-500 to-slate-700 text-white text-[10px] font-bold shadow">
                                {initials(r.users?.name, r.users?.email)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate max-w-[160px]">
                                  {r.users?.name ?? r.users?.email ?? "System"}
                                </div>
                                {r.users?.name && r.users?.email && (
                                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{r.users.email}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-3">
                            <Badge className={`${a.bg} border capitalize gap-1 font-medium`}>
                              <ActIcon className="h-3 w-3" /> {a.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                <EntIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-800 capitalize">{r.entity_type ?? "—"}</div>
                                {r.entity_id && (
                                  <div className="text-[11px] text-slate-400 font-mono">{String(r.entity_id).slice(0, 8)}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-3 text-sm text-slate-700 max-w-[420px]">
                            <div className="line-clamp-2">{r.description ?? "—"}</div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
            <Sparkles className="h-3 w-3" />
            <span>Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} events · newest first</span>
            <Separator orientation="vertical" className="h-3" />
            <span>Audit trail is append-only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
