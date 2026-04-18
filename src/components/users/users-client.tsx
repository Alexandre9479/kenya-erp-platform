"use client";

import { useMemo, useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  UserX,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Mail,
  Phone as PhoneIcon,
  Clock,
  Sparkles,
  ShieldAlert,
  Briefcase,
  Warehouse as WarehouseIcon,
  HeartHandshake,
  Calculator,
  ShoppingCart,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserForm, type UserRow } from "./user-form";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

type RoleKey =
  | "super_admin"
  | "tenant_admin"
  | "accountant"
  | "sales"
  | "purchasing"
  | "warehouse"
  | "hr"
  | "viewer";

const ROLE_CONFIG: Record<RoleKey, {
  label: string;
  icon: typeof ShieldAlert;
  pill: string;
  chipBg: string;
  chipIcon: string;
  tone: string;
}> = {
  super_admin: {
    label: "Super Admin",
    icon: ShieldAlert,
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    chipBg: "from-rose-500 to-rose-600",
    chipIcon: "text-white",
    tone: "Full platform access",
  },
  tenant_admin: {
    label: "Admin",
    icon: ShieldCheck,
    pill: "bg-violet-50 text-violet-700 border-violet-200",
    chipBg: "from-violet-500 to-violet-600",
    chipIcon: "text-white",
    tone: "Workspace owner",
  },
  accountant: {
    label: "Accountant",
    icon: Calculator,
    pill: "bg-sky-50 text-sky-700 border-sky-200",
    chipBg: "from-sky-500 to-sky-600",
    chipIcon: "text-white",
    tone: "Finance & books",
  },
  sales: {
    label: "Sales",
    icon: Briefcase,
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    chipBg: "from-emerald-500 to-emerald-600",
    chipIcon: "text-white",
    tone: "Revenue team",
  },
  purchasing: {
    label: "Purchasing",
    icon: ShoppingCart,
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    chipBg: "from-amber-500 to-amber-600",
    chipIcon: "text-white",
    tone: "Procurement",
  },
  warehouse: {
    label: "Warehouse",
    icon: WarehouseIcon,
    pill: "bg-orange-50 text-orange-700 border-orange-200",
    chipBg: "from-orange-500 to-orange-600",
    chipIcon: "text-white",
    tone: "Stock & fulfilment",
  },
  hr: {
    label: "HR",
    icon: HeartHandshake,
    pill: "bg-pink-50 text-pink-700 border-pink-200",
    chipBg: "from-pink-500 to-pink-600",
    chipIcon: "text-white",
    tone: "People operations",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    pill: "bg-slate-100 text-slate-600 border-slate-200",
    chipBg: "from-slate-400 to-slate-500",
    chipIcon: "text-white",
    tone: "Read-only access",
  },
};

function roleCfg(role: string) {
  return (ROLE_CONFIG as Record<string, (typeof ROLE_CONFIG)[RoleKey]>)[role] ?? ROLE_CONFIG.viewer;
}

const roleFilterOptions: Array<{ value: "all" | RoleKey; label: string }> = [
  { value: "all", label: "All Roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "tenant_admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
  { value: "purchasing", label: "Purchasing" },
  { value: "warehouse", label: "Warehouse" },
  { value: "hr", label: "HR" },
  { value: "viewer", label: "Viewer" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function avatarGradient(seed: string) {
  const palette = [
    "from-indigo-500 to-violet-600",
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-fuchsia-500 to-purple-600",
    "from-cyan-500 to-sky-600",
    "from-lime-500 to-emerald-600",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length]!;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsersClientProps {
  initialData: UserRow[];
  totalCount: number;
  currentUserId: string;
}

type ApiResponse = { data: UserRow[]; count: number };

// ─── Hero stat tile ───────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: typeof UsersIcon;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-medium">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-white tabular-nums leading-tight truncate">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-[11px] text-white/55 truncate">{hint}</p>
          )}
        </div>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-white/25 to-white/5 border border-white/15 shrink-0">
          <Icon className="size-4 text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsersClient({
  initialData,
  totalCount,
  currentUserId,
}: UsersClientProps) {
  const [users, setUsers] = useState<UserRow[]>(initialData);
  const [count, setCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | undefined>(undefined);

  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ─── Hero metrics (from current page window) ──────────────────────────────
  const heroStats = useMemo(() => {
    const active = users.filter((u) => u.is_active).length;
    const inactive = users.length - active;
    const admins = users.filter(
      (u) => u.role === "tenant_admin" || u.role === "super_admin"
    ).length;
    return { active, inactive, admins };
  }, [users]);

  // ─── Fetch helpers ────────────────────────────────────────────────────────
  const fetchUsers = useCallback(
    (nextSearch: string, nextRole: string, nextPage: number) => {
      startTransition(async () => {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(PAGE_SIZE),
        });
        if (nextSearch) params.set("search", nextSearch);
        if (nextRole && nextRole !== "all") params.set("role", nextRole);

        try {
          const res = await fetch(`/api/users?${params.toString()}`);
          if (!res.ok) return;
          const json = (await res.json()) as ApiResponse;
          setUsers(json.data);
          setCount(json.count);
        } catch {
          toast.error("Failed to load users.");
        }
      });
    },
    []
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchUsers(value, roleFilter, 1);
  };

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
    fetchUsers(search, value, 1);
  };

  const handlePreviousPage = () => {
    const next = page - 1;
    setPage(next);
    fetchUsers(search, roleFilter, next);
  };

  const handleNextPage = () => {
    const next = page + 1;
    setPage(next);
    fetchUsers(search, roleFilter, next);
  };

  const handleAddUser = () => {
    setEditingUser(undefined);
    setFormOpen(true);
  };

  const handleEditUser = (user: UserRow) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchUsers(search, roleFilter, page);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/users/${deactivateTarget.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to deactivate user.");
        return;
      }
      toast.success(`${deactivateTarget.full_name} has been deactivated.`);
      fetchUsers(search, roleFilter, page);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsDeactivating(false);
      setDeactivateTarget(null);
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  const hasFilters = search.length > 0 || roleFilter !== "all";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 px-6 py-7 sm:px-8 sm:py-9 text-white shadow-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #1e1b4b 0%, #3730a3 45%, #7c3aed 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80 backdrop-blur">
                <Sparkles className="size-3" />
                Access control
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
                Team & Users
              </h1>
              <p className="mt-1.5 text-sm text-white/75 max-w-xl">
                Invite teammates, assign roles, and manage access across your
                workspace.
              </p>
            </div>
            <Button
              onClick={handleAddUser}
              className="gap-2 shrink-0 bg-white text-indigo-700 hover:bg-white/90 shadow-lg shadow-indigo-950/30"
            >
              <UserPlus className="h-4 w-4" />
              Invite user
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat
              label="Total users"
              value={count.toLocaleString()}
              hint={`${users.length} on this page`}
              icon={UsersIcon}
            />
            <HeroStat
              label="Active"
              value={heroStats.active.toLocaleString()}
              hint="On this page"
              icon={UserCheck}
            />
            <HeroStat
              label="Inactive"
              value={heroStats.inactive.toLocaleString()}
              hint="On this page"
              icon={UserX}
            />
            <HeroStat
              label="Admins"
              value={heroStats.admins.toLocaleString()}
              hint="Full workspace access"
              icon={ShieldCheck}
            />
          </div>
        </div>
      </div>

      {/* Filters card */}
      <Card className="relative overflow-hidden border-slate-200/80 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-400/50 to-transparent" />
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 min-w-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              <Select value={roleFilter} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full sm:w-48 bg-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  {roleFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {hasFilters ? (
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
                >
                  Filters active
                </Badge>
              ) : (
                <span className="hidden sm:inline text-xs text-slate-500">
                  Showing all users
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card className="relative overflow-hidden border-slate-200/80 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-indigo-400/60 via-violet-400/60 to-fuchsia-400/60" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="font-semibold text-slate-700">
                  User
                </TableHead>
                <TableHead className="font-semibold text-slate-700 hidden md:table-cell">
                  Contact
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Role</TableHead>
                <TableHead className="font-semibold text-slate-700 hidden sm:table-cell">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-slate-700 hidden lg:table-cell">
                  Last login
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-3.5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-3.5 w-24" />
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-indigo-50 to-violet-50 border border-indigo-100">
                        <UsersIcon className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          No users found
                        </p>
                        <p className="text-sm mt-0.5 text-slate-500">
                          {hasFilters
                            ? "Try adjusting your search or filters."
                            : "Add your first team member to get started."}
                        </p>
                      </div>
                      {!hasFilters && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddUser}
                          className="gap-1.5 mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Invite user
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const cfg = roleCfg(user.role);
                  const RoleIcon = cfg.icon;
                  const gradient = avatarGradient(user.id || user.email);
                  const lastLogin = timeAgo(user.last_login_at);

                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {user.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div
                              className={cn(
                                "h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white shadow-sm bg-linear-to-br",
                                gradient
                              )}
                            >
                              {initials(user.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 leading-tight truncate flex items-center gap-1.5">
                              {user.full_name}
                              {isSelf && (
                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-px">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate md:hidden">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell align-middle">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="text-sm text-slate-700 flex items-center gap-1.5 min-w-0">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <PhoneIcon className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium gap-1 pl-1.5",
                            cfg.pill
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {user.last_login_at ? (
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-slate-700 tabular-nums">
                              {formatDate(user.last_login_at, "dd MMM yyyy")}
                            </span>
                            {lastLogin && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lastLogin}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Never signed in
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
                              aria-label="User actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => handleEditUser(user)}
                              className="gap-2"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit user
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={isSelf || !user.is_active}
                              onClick={() =>
                                !isSelf &&
                                user.is_active &&
                                setDeactivateTarget(user)
                              }
                              className={cn(
                                "gap-2",
                                isSelf || !user.is_active
                                  ? "opacity-40 cursor-not-allowed"
                                  : "text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                              )}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              {user.is_active ? "Deactivate" : "Deactivated"}
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

        {count > PAGE_SIZE && (
          <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700 tabular-nums">
                {from}
              </span>
              –
              <span className="font-medium text-slate-700 tabular-nums">
                {to}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700 tabular-nums">
                {count}
              </span>{" "}
              users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page <= 1 || isPending}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-slate-600 px-1 tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= totalPages || isPending}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Sheet */}
      <UserForm
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={handleFormSuccess}
      />

      {/* Deactivate confirmation */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-100">
                <UserX className="size-4 text-rose-600" />
              </div>
              <AlertDialogTitle>Deactivate user</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-slate-900">
                {deactivateTarget?.full_name}
              </span>
              ? They will immediately lose access to the platform. You can
              reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              disabled={isDeactivating}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating…
                </>
              ) : (
                "Deactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
