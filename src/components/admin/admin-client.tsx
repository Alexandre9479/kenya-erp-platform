"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, Users, TrendingUp, AlertCircle, Search, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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

function planBadge(plan: string) {
  const map: Record<string, string> = {
    trial: "bg-amber-100 text-amber-700",
    starter: "bg-blue-100 text-blue-700",
    professional: "bg-green-100 text-green-700",
    enterprise: "bg-purple-100 text-purple-700",
  };
  return map[plan] ?? "bg-slate-100 text-slate-600";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Tenants", value: stats.total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: stats.active, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "On Trial", value: stats.trial, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Inactive", value: stats.inactive, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40">
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Trial Ends</TableHead>
                <TableHead>Created</TableHead>
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
                  <TableCell colSpan={8} className="py-12 text-center">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">No tenants found</p>
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => {
                  const trialExpired = t.trial_ends_at ? new Date(t.trial_ends_at) < new Date() : false;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-slate-500">{t.email}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${planBadge(t.subscription_plan)}`}>
                          {t.subscription_plan}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? "default" : "secondary"} className={t.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                          {t.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{t.user_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className={trialExpired ? "text-red-500" : "text-slate-500"}>
                        {t.trial_ends_at ? formatDate(t.trial_ends_at) : "—"}
                      </TableCell>
                      <TableCell className="text-slate-500">{formatDate(t.created_at)}</TableCell>
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {count > limit && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {from}–{to} of {count}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={to >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
