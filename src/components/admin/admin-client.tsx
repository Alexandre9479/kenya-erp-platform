"use client";

import { useState, useEffect, useRef } from "react";
import {
  Building2, Users, TrendingUp, AlertCircle, Search, MoreHorizontal,
  CheckCircle2, XCircle, Sparkles, Shield, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  PremiumHero,
  HeroStatGrid,
  HeroStat,
  EmptyState,
} from "@/components/ui/premium-hero";

type TenantRow = {
  id: string;
  name: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  is_active: boolean;
  trial_ends_at: string | null;
  created_at: string;
  user_count: number;
};

const PLAN_CONFIG: Record<string, { className: string }> = {
  trial:        { className: "bg-amber-50 text-amber-700 border-amber-200" },
  starter:      { className: "bg-sky-50 text-sky-700 border-sky-200" },
  growth:       { className: "bg-violet-50 text-violet-700 border-violet-200" },
  pro:          { className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  professional: { className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  enterprise:   { className: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
};

function planBadge(plan: string) {
  return PLAN_CONFIG[plan]?.className ?? "bg-slate-50 text-slate-600 border-slate-200";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

const TENANT_PALETTE = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-pink-600",
];

function tenantGradient(name: string): string {
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TENANT_PALETTE[hash % TENANT_PALETTE.length];
}

interface Props {
  initialTenants: TenantRow[];
  totalCount: number;
  stats: { total: number; active: number; trial: number; inactive: number };
}

export function AdminClient({ initialTenants, totalCount, stats }: Props) {
  const [tenants, setTenants] = useState(initialTenants);
  const [count, setCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchTenants(), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    if (isFirstRender.current) return;
    fetchTenants();
  }, [status, page]);

  async function fetchTenants() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ search, status, page: String(page), limit: "25" });
      const res = await fetch(`/api/admin/tenants?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTenants(json.data);
      setCount(json.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleActive(tenant: TenantRow) {
    try {
      const res = await fetch(`/api/admin/tenants?id=${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !tenant.is_active }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Tenant ${tenant.is_active ? "deactivated" : "activated"}`);
      fetchTenants();
    } catch {
      toast.error("Failed to update tenant");
    }
  }

  const limit = 25;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);
  const activeRatio = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PremiumHero
        gradient="slate"
        icon={Shield}
        eyebrow={
          <>
            <Sparkles className="size-3 sm:size-3.5" />
            Super Admin Console
          </>
        }
        title="Platform Tenants"
        description="Manage tenant companies, subscription plans, trial status and activation across the platform."
      >
        <HeroStatGrid>
          <HeroStat icon={Building2} label="Total tenants" value={String(stats.total)} sub={`${count} in view`} />
          <HeroStat icon={CheckCircle2} label="Active" value={String(stats.active)} sub={`${activeRatio}% of base`} accent="success" />
          <HeroStat icon={TrendingUp} label="On trial" value={String(stats.trial)} sub="conversion window" accent="warning" />
          <HeroStat icon={XCircle} label="Inactive" value={String(stats.inactive)} sub={stats.inactive > 0 ? "suspended" : "none"} accent={stats.inactive > 0 ? "danger" : "default"} />
        </HeroStatGrid>
      </PremiumHero>

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 focus-visible:ring-slate-500"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">On Trial</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile tenant cards */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))
        ) : tenants.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={AlertCircle}
              title="No tenants found"
              description="Try a different search or status filter."
            />
          </div>
        ) : (
          tenants.map((t) => {
            const trialExpired = t.trial_ends_at ? new Date(t.trial_ends_at) < new Date() : false;
            const initial = (t.name?.trim() ?? "?").charAt(0).toUpperCase();
            return (
              <div
                key={t.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-slate-600 via-slate-500 to-slate-400" />
                <div className="p-3 pt-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className={cn("flex size-10 items-center justify-center rounded-xl text-white font-bold text-sm shrink-0 shadow-sm bg-linear-to-br", tenantGradient(t.name))}>
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{t.email}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleActive(t)}>
                          {t.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", planBadge(t.subscription_plan))}>
                      {t.subscription_plan}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        t.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", t.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="uppercase tracking-wide font-semibold text-slate-400">Users</p>
                      <p className="font-bold text-slate-700 tabular-nums mt-0.5 flex items-center gap-1">
                        <Users className="size-3" />
                        {t.user_count}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide font-semibold text-slate-400">Trial</p>
                      <p className={cn("font-semibold tabular-nums mt-0.5", trialExpired ? "text-rose-600" : "text-slate-700")}>
                        {t.trial_ends_at ? formatDate(t.trial_ends_at) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="uppercase tracking-wide font-semibold text-slate-400">Joined</p>
                      <p className="font-semibold text-slate-700 tabular-nums mt-0.5">{formatDate(t.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop tenant table */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-linear-to-r from-slate-600 via-slate-500 to-slate-400" />
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-y border-slate-200">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trial Ends</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={AlertCircle}
                    title="No tenants found"
                    description="Try a different search or status filter."
                  />
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((t) => {
                const trialExpired = t.trial_ends_at ? new Date(t.trial_ends_at) < new Date() : false;
                const initial = (t.name?.trim() ?? "?").charAt(0).toUpperCase();
                return (
                  <TableRow key={t.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("flex size-9 items-center justify-center rounded-lg text-white font-bold text-xs shrink-0 shadow-sm bg-linear-to-br", tenantGradient(t.name))}>
                          {initial}
                        </div>
                        <span className="font-medium text-slate-900">{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{t.email}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", planBadge(t.subscription_plan))}>
                        {t.subscription_plan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          t.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", t.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 tabular-nums">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-medium">{t.user_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-sm tabular-nums flex items-center gap-1", trialExpired ? "text-rose-600 font-medium" : "text-slate-500")}>
                      {t.trial_ends_at && <CalendarDays className="size-3.5" />}
                      {t.trial_ends_at ? formatDate(t.trial_ends_at) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm tabular-nums">{formatDate(t.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleActive(t)}>
                            {t.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {count > limit && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="tabular-nums">Showing {from}–{to} of {count}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={to >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
