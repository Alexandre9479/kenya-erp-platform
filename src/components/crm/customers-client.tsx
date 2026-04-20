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
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
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
import {
  PremiumHero,
  HeroStatGrid,
  HeroStat,
  HeroPill,
  EmptyState,
} from "@/components/ui/premium-hero";

type CustomerRow = Tables<"customers">;

interface CustomersClientProps {
  initialData: CustomerRow[];
  totalCount: number;
}

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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarGradient(seed: string): string {
  const palettes = [
    "from-rose-500 to-pink-600",
    "from-fuchsia-500 to-purple-600",
    "from-violet-500 to-indigo-600",
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length]!;
}

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | undefined>(
    undefined
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 400);
  };

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

  const openAdd = () => {
    setEditingCustomer(undefined);
    setSheetOpen(true);
  };
  const openEdit = (customer: CustomerRow) => {
    setEditingCustomer(customer);
    setSheetOpen(true);
  };

  const activeCount = customers.filter((c) => c.is_active).length;
  const totalBalance = customers.reduce(
    (s, c) => s + (c.current_balance ?? 0),
    0
  );
  const totalCredit = customers.reduce(
    (s, c) => s + (c.credit_limit ?? 0),
    0
  );
  const overLimitCount = customers.filter(
    (c) => c.current_balance > c.credit_limit && c.credit_limit > 0
  ).length;

  const firstItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const lastItem = Math.min(currentPage * PAGE_LIMIT, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT));

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <CustomerForm
          customer={editingCustomer}
          onSuccess={async () => {
            setSheetOpen(false);
            await fetchCustomers();
          }}
        />
      </Sheet>

      <div className="flex flex-col gap-4 sm:gap-6">
        <PremiumHero
          gradient="rose"
          icon={Users}
          eyebrow={
            <>
              <Sparkles className="size-3 sm:size-3.5" />
              CRM workspace
            </>
          }
          title="Customer Management"
          description="Track relationships, credit limits, balances and account health across all customers."
          actions={
            <Button
              onClick={openAdd}
              size="sm"
              className="bg-white text-rose-700 hover:bg-white/90 font-semibold shadow-md gap-1.5"
            >
              <Plus className="size-3.5" />
              New customer
            </Button>
          }
        >
          <HeroStatGrid>
            <HeroStat
              icon={Users}
              label="Total customers"
              value={String(totalCount)}
              sub={
                <HeroPill tone={activeCount > 0 ? "success" : "default"}>
                  {activeCount} active
                </HeroPill>
              }
            />
            <HeroStat
              icon={UserCheck}
              label="Active"
              value={String(activeCount)}
              sub={`${Math.max(0, customers.length - activeCount)} inactive`}
            />
            <HeroStat
              icon={Wallet}
              label="Outstanding"
              value={formatKESShort(totalBalance)}
              sub={`of ${formatKESShort(totalCredit)} credit`}
              accent={totalBalance > 0 ? "warning" : "default"}
            />
            <HeroStat
              icon={overLimitCount > 0 ? AlertTriangle : TrendingUp}
              label={overLimitCount > 0 ? "Over limit" : "Utilisation"}
              value={
                overLimitCount > 0
                  ? String(overLimitCount)
                  : `${totalCredit > 0 ? Math.round((totalBalance / totalCredit) * 100) : 0}%`
              }
              sub={overLimitCount > 0 ? "customers" : "of credit used"}
              accent={overLimitCount > 0 ? "danger" : "success"}
            />
          </HeroStatGrid>
        </PremiumHero>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-60 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search name, email or phone…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => {
                  setShowInactive(checked);
                  setCurrentPage(1);
                }}
              />
              <Label
                htmlFor="show-inactive"
                className="text-xs sm:text-sm text-slate-600 cursor-pointer"
              >
                Show inactive
              </Label>
            </div>
            <Badge variant="secondary" className="text-xs sm:text-sm font-medium">
              {totalCount} total
            </Badge>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : customers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white">
              <EmptyState
                icon={Users}
                title="No customers found"
                description={
                  search
                    ? "Try a different search term."
                    : "Add your first customer to get started."
                }
                action={
                  <Button
                    onClick={openAdd}
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                  >
                    <Plus className="size-3.5" /> Add customer
                  </Button>
                }
              />
            </div>
          ) : (
            customers.map((customer) => {
              const overLimit =
                customer.current_balance > customer.credit_limit &&
                customer.credit_limit > 0;
              const grad = avatarGradient(customer.name);
              return (
                <div
                  key={customer.id}
                  className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  onClick={() => openEdit(customer)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-linear-to-r from-rose-500 via-pink-500 to-fuchsia-500" />
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl text-white font-bold shrink-0 bg-linear-to-br shadow-md",
                        grad
                      )}
                    >
                      {initials(customer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {customer.name}
                        </p>
                        {customer.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                            <UserX className="size-2.5" /> Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                        {customer.email && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </p>
                        )}
                        {customer.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="size-3 shrink-0" />
                            {customer.phone}
                          </p>
                        )}
                        {customer.city && (
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{customer.city}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">
                        Credit limit
                      </p>
                      <p className="text-slate-700 font-semibold tabular-nums">
                        {formatKES(customer.credit_limit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">
                        Balance
                      </p>
                      <p
                        className={cn(
                          "font-bold tabular-nums",
                          overLimit ? "text-rose-600" : "text-slate-700"
                        )}
                      >
                        {formatKES(customer.current_balance)}
                        {overLimit && " ⚠"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-linear-to-r from-rose-500 via-pink-500 to-fuchsia-500" />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">
                    Customer
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">
                    Contact
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">
                    City
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs text-right">
                    Credit limit
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs text-right">
                    Balance
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wide text-xs">
                    Status
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={Users}
                        title="No customers found"
                        description={
                          search
                            ? "Try a different search term."
                            : "Add your first customer to get started."
                        }
                        action={
                          <Button
                            onClick={openAdd}
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                          >
                            <Plus className="size-3.5" /> Add customer
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => {
                    const overLimit =
                      customer.current_balance > customer.credit_limit &&
                      customer.credit_limit > 0;
                    const grad = avatarGradient(customer.name);
                    return (
                      <TableRow
                        key={customer.id}
                        className="hover:bg-rose-50/40 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "flex size-9 items-center justify-center rounded-xl text-white text-xs font-bold shrink-0 bg-linear-to-br shadow-sm",
                                grad
                              )}
                            >
                              {initials(customer.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {customer.name}
                              </p>
                              {customer.kra_pin && (
                                <p className="text-[11px] text-slate-500 font-mono truncate">
                                  {customer.kra_pin}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-slate-600 gap-0.5">
                            {customer.email && (
                              <span className="flex items-center gap-1 truncate max-w-55">
                                <Mail className="size-3 text-slate-400 shrink-0" />
                                {customer.email}
                              </span>
                            )}
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="size-3 text-slate-400 shrink-0" />
                                {customer.phone}
                              </span>
                            )}
                            {!customer.email && !customer.phone && (
                              <span className="text-slate-300">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {customer.city ?? (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 tabular-nums text-sm">
                          {formatKES(customer.credit_limit)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-semibold text-sm",
                            overLimit ? "text-rose-600" : "text-slate-700"
                          )}
                        >
                          <div className="inline-flex items-center gap-1 justify-end">
                            {formatKES(customer.current_balance)}
                            {overLimit && (
                              <AlertTriangle className="size-3.5 text-rose-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 text-[11px] font-semibold">
                              <UserX className="size-2.5" /> Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                aria-label="Actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openEdit(customer)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled
                                className="text-slate-400 cursor-not-allowed"
                                title="Coming soon"
                              >
                                View statement
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(customer)}
                                className={
                                  customer.is_active
                                    ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                                    : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                                }
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
        </div>

        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-slate-600">
            <span>
              Showing {firstItem}–{lastItem} of {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <span className="text-xs text-slate-500 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
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
