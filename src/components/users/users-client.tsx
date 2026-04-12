"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  UserX,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Admin",
  accountant: "Accountant",
  sales: "Sales",
  purchasing: "Purchasing",
  warehouse: "Warehouse",
  hr: "HR",
  viewer: "Viewer",
};

const roleBadgeClass: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  tenant_admin: "bg-purple-100 text-purple-700 border-purple-200",
  accountant: "bg-blue-100 text-blue-700 border-blue-200",
  sales: "bg-green-100 text-green-700 border-green-200",
  purchasing: "bg-amber-100 text-amber-700 border-amber-200",
  warehouse: "bg-orange-100 text-orange-700 border-orange-200",
  hr: "bg-pink-100 text-pink-700 border-pink-200",
  viewer: "bg-slate-100 text-slate-600 border-slate-200",
};

const roleFilterOptions = [
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsersClientProps {
  initialData: UserRow[];
  totalCount: number;
  currentUserId: string;
}

// ─── API response type ────────────────────────────────────────────────────────

type ApiResponse = { data: UserRow[]; count: number };

// ─── Component ────────────────────────────────────────────────────────────────

export function UsersClient({
  initialData,
  totalCount,
  currentUserId,
}: UsersClientProps) {
  const [users, setUsers] = useState<UserRow[]>(initialData);
  const [count, setCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Sheet state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | undefined>(undefined);

  // Deactivate dialog state
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ─── Fetch helpers ──────────────────────────────────────────────────────────

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
          const json = await res.json() as ApiResponse;
          setUsers(json.data);
          setCount(json.count);
        } catch {
          toast.error("Failed to load users.");
        }
      });
    },
    []
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

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
      const json = await res.json() as { error?: string };
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

  // ─── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(count / PAGE_SIZE);
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {count} {count === 1 ? "user" : "users"} in your workspace
          </p>
        </div>
        <Button onClick={handleAddUser} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-full sm:w-44">
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

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">Name</TableHead>
              <TableHead className="font-semibold text-slate-700">Email</TableHead>
              <TableHead className="font-semibold text-slate-700 hidden md:table-cell">
                Phone
              </TableHead>
              <TableHead className="font-semibold text-slate-700">Role</TableHead>
              <TableHead className="font-semibold text-slate-700 hidden sm:table-cell">
                Status
              </TableHead>
              <TableHead className="font-semibold text-slate-700 hidden lg:table-cell">
                Last Login
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Users className="h-10 w-10 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700">No users found</p>
                      <p className="text-sm mt-0.5">
                        {search || roleFilter !== "all"
                          ? "Try adjusting your search or filters."
                          : "Add your first team member to get started."}
                      </p>
                    </div>
                    {!search && roleFilter === "all" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddUser}
                        className="gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add User
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="font-medium text-slate-900 leading-tight">
                        {user.full_name}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600 text-sm">
                      {user.phone ?? <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          roleBadgeClass[user.role] ?? roleBadgeClass.viewer
                        )}
                      >
                        {roleLabels[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={
                          user.is_active
                            ? "bg-green-50 text-green-700 border-green-200 text-xs"
                            : "bg-slate-50 text-slate-500 border-slate-200 text-xs"
                        }
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-600 text-sm">
                      {user.last_login_at
                        ? formatDate(user.last_login_at, "dd MMM yyyy")
                        : <span className="text-slate-400">Never</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="User actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleEditUser(user)}
                            className="gap-2"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isSelf}
                            onClick={() =>
                              !isSelf && setDeactivateTarget(user)
                            }
                            className={cn(
                              "gap-2",
                              isSelf
                                ? "opacity-40 cursor-not-allowed"
                                : "text-red-600 focus:bg-red-50 focus:text-red-600"
                            )}
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Deactivate
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

      {/* Pagination */}
      {count > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {from}–{to} of {count} users
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
            <span className="text-sm text-slate-600 px-1">
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
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
