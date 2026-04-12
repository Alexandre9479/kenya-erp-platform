"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Sheet } from "@/components/ui/sheet";
import { CustomerForm } from "@/components/crm/customer-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CustomerRow = Tables<"customers">;

interface CustomersClientProps {
  initialData: CustomerRow[];
  totalCount: number;
}

// ---------------------------------------------------------------------------
// KES formatter
// ---------------------------------------------------------------------------
function formatKES(amount: number): string {
  return (
    "KES " +
    new Intl.NumberFormat("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  );
}

function formatKESShort(v: number): string {
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${v}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const PAGE_LIMIT = 25;

export function CustomersClient({
  initialData,
  totalCount: initialTotal,
}: CustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialData);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<
    CustomerRow | undefined
  >(undefined);

  // Debounce search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 400);
  };

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_LIMIT),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (showInactive) params.set("show_inactive", "true");

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as {
        data: CustomerRow[];
        count: number;
      };
      setCustomers(json.data);
      setTotalCount(json.count);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, showInactive]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Toggle active/inactive
  const handleToggleActive = async (customer: CustomerRow) => {
    const action = customer.is_active ? "Deactivating" : "Activating";
    const toastId = toast.loading(`${action} ${customer.name}…`);
    try {
      let res: Response;
      if (customer.is_active) {
        res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      } else {
        res = await fetch(`/api/customers/${customer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        });
      }
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Request failed");
      }
      toast.success(
        customer.is_active
          ? `${customer.name} deactivated`
          : `${customer.name} activated`,
        { id: toastId }
      );
      await fetchCustomers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message, { id: toastId });
    }
  };

  const openAdd = () => { setEditingCustomer(undefined); setSheetOpen(true); };
  const openEdit = (customer: CustomerRow) => { setEditingCustomer(customer); setSheetOpen(true); };

  // Derived KPIs
  const activeCount = customers.filter((c) => c.is_active).length;
  const inactiveCount = customers.filter((c) => !c.is_active).length;
  const totalBalance = customers.reduce((s, c) => s + (c.current_balance ?? 0), 0);

  // Pagination info
  const firstItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const lastItem = Math.min(currentPage * PAGE_LIMIT, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT));

  return (
    <>
      {/* Sheet (Add / Edit) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <CustomerForm
          customer={editingCustomer}
          onSuccess={async () => {
            setSheetOpen(false);
            await fetchCustomers();
          }}
        />
      </Sheet>

      <div className="flex flex-col gap-6">

        {/* ── Module Hero Strip ──────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-rose-500 via-pink-500 to-rose-600 p-6 text-white shadow-lg">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-20 w-56 h-56 rounded-full bg-white/5" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner">
                <Users className="size-7 text-white" />
              </div>
              <div>
                <p className="text-rose-100 text-sm font-medium tracking-wide uppercase">CRM</p>
                <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
                <p className="text-rose-100 text-sm mt-0.5">Track relationships, credit limits & balances</p>
              </div>
            </div>
            <Button
              onClick={openAdd}
              className="bg-white text-rose-600 hover:bg-rose-50 font-semibold shadow-md gap-2 shrink-0"
            >
              <Plus className="size-4" />
              Add Customer
            </Button>
          </div>

          {/* KPI row */}
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            {[
              { label: "Total Customers", value: String(totalCount), Icon: Users },
              { label: "Active", value: String(activeCount), Icon: UserCheck },
              { label: "Total Balance", value: formatKESShort(totalBalance), Icon: Wallet },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <Icon className="size-4 text-rose-100 mx-auto mb-1" />
                <p className="text-lg font-bold">{value}</p>
                <p className="text-rose-100 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Toolbar ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-50 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={(checked) => { setShowInactive(checked); setCurrentPage(1); }}
            />
            <Label htmlFor="show-inactive" className="text-sm text-slate-600 cursor-pointer">
              Show inactive
            </Label>
          </div>
          <Badge variant="secondary" className="text-sm font-medium">{totalCount} total</Badge>
        </div>

        {/* ── Table ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* gradient top bar */}
          <div className="h-1 w-full bg-linear-to-r from-rose-500 via-pink-500 to-rose-600" />

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Name</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Email</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Phone</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">City</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs text-right">Credit Limit</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs text-right">Balance</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                      <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                        <Users className="size-8 text-rose-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-600">No customers found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {search ? "Try a different search term." : "Add your first customer to get started."}
                        </p>
                      </div>
                      <Button onClick={openAdd} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
                        <Plus className="size-3.5" /> Add Customer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const overLimit = customer.current_balance > customer.credit_limit;
                  return (
                    <TableRow key={customer.id} className="hover:bg-rose-50/30 transition-colors">
                      <TableCell className="font-semibold text-slate-900">{customer.name}</TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {customer.email ?? <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {customer.phone ?? <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {customer.city ?? <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-slate-700 tabular-nums text-sm">
                        {formatKES(customer.credit_limit)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right tabular-nums font-semibold text-sm",
                        overLimit ? "text-red-600" : "text-slate-700"
                      )}>
                        {formatKES(customer.current_balance)}
                        {overLimit && <span className="ml-1 text-xs">⚠</span>}
                      </TableCell>
                      <TableCell>
                        {customer.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium" variant="outline">
                            <UserCheck className="size-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 font-medium" variant="outline">
                            <UserX className="size-3 mr-1" /> Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7" aria-label="Actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEdit(customer)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem disabled className="text-slate-400 cursor-not-allowed" title="Coming soon">
                              View Statement
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(customer)}
                              className={customer.is_active
                                ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                                : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"}
                            >
                              {customer.is_active ? "Deactivate" : "Activate"}
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

        {/* ── Pagination ────────────────────────────────────── */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Showing {firstItem}–{lastItem} of {totalCount}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
