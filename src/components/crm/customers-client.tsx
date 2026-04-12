"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
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
        res = await fetch(`/api/customers/${customer.id}`, {
          method: "DELETE",
        });
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
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message, { id: toastId });
    }
  };

  // Open Add sheet
  const openAdd = () => {
    setEditingCustomer(undefined);
    setSheetOpen(true);
  };

  // Open Edit sheet
  const openEdit = (customer: CustomerRow) => {
    setEditingCustomer(customer);
    setSheetOpen(true);
  };

  // Pagination info
  const firstItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const lastItem = Math.min(currentPage * PAGE_LIMIT, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT));

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Sheet (Add / Edit)                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <CustomerForm
          customer={editingCustomer}
          onSuccess={async () => {
            setSheetOpen(false);
            await fetchCustomers();
          }}
        />
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* Page layout                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Customers
            </h1>
            <Badge variant="secondary" className="text-sm font-medium">
              {totalCount}
            </Badge>
          </div>

          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="size-4" />
            Add Customer
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
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
              onCheckedChange={(checked) => {
                setShowInactive(checked);
                setCurrentPage(1);
              }}
            />
            <Label htmlFor="show-inactive" className="text-sm text-slate-600 cursor-pointer">
              Show inactive
            </Label>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Email</TableHead>
                <TableHead className="font-semibold text-slate-700">Phone</TableHead>
                <TableHead className="font-semibold text-slate-700">City</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">
                  Credit Limit
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">
                  Balance
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                // Skeleton rows
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                      <Users className="size-10" />
                      <p className="text-sm font-medium">No customers found</p>
                      {search && (
                        <p className="text-xs">
                          Try a different search term or clear the filter.
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const overLimit =
                    customer.current_balance > customer.credit_limit;
                  return (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-900">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {customer.email ?? (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {customer.phone ?? (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {customer.city ?? (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-700 tabular-nums">
                        {formatKES(customer.credit_limit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-medium",
                          overLimit ? "text-red-600" : "text-slate-700"
                        )}
                      >
                        {formatKES(customer.current_balance)}
                      </TableCell>
                      <TableCell>
                        {customer.is_active ? (
                          <Badge
                            className="bg-emerald-100 text-emerald-700 border-emerald-200"
                            variant="outline"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-slate-100 text-slate-500 border-slate-200"
                            variant="outline"
                          >
                            Inactive
                          </Badge>
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
                            <DropdownMenuItem
                              onClick={() => openEdit(customer)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled
                              className="text-slate-400 cursor-not-allowed"
                              title="Coming soon"
                            >
                              View Statement
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

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
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
                <ChevronLeft className="size-3.5" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
