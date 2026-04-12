"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Download,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Pencil,
  UserX,
  Loader2,
  TrendingUp,
  Clock,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { EmployeeForm } from "@/components/hr/employee-form";
import type { Tables } from "@/lib/types/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeRow = Tables<"employees">;

interface PayrollLine {
  employee_id: string;
  employee_number: string;
  full_name: string;
  department: string | null;
  employment_type: string;
  basic_salary: number;
  gross: number;
  paye: number;
  nhif: number;
  nssf_employee: number;
  nssf_employer: number;
  total_deductions: number;
  net_pay: number;
}

interface PayrollSummary {
  month: number;
  year: number;
  employee_count: number;
  total_gross: number;
  total_paye: number;
  total_nhif: number;
  total_nssf_employee: number;
  total_nssf_employer: number;
  total_net_pay: number;
  lines: PayrollLine[];
}

interface HRClientProps {
  initialEmployees: EmployeeRow[];
  totalCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EMPLOYMENT_TYPE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  permanent: { label: "Permanent", className: "bg-blue-100 text-blue-700 border-blue-200" },
  contract: { label: "Contract", className: "bg-amber-100 text-amber-800 border-amber-200" },
  casual: { label: "Casual", className: "bg-slate-100 text-slate-700 border-slate-200" },
  part_time: { label: "Part-time", className: "bg-purple-100 text-purple-800 border-purple-200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKES(amount: number): string {
  return `KES ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function EmploymentBadge({ type }: { type: string }) {
  const config = EMPLOYMENT_TYPE_CONFIG[type] ?? {
    label: type,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${config.className}`}>
      {config.label}
    </span>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  title,
  amount,
  highlight,
}: {
  title: string;
  amount: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"} shadow-sm`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-base font-bold ${highlight ? "text-blue-700" : "text-slate-900"}`}>
        {formatKES(amount)}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HRClient({ initialEmployees, totalCount }: HRClientProps) {
  // ── Employee state ───────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees);
  const [total, setTotal] = useState(totalCount);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, startTransition] = useTransition();

  // ── Form / deactivate dialog state ──────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | undefined>(undefined);
  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeRow | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ── Payroll state ────────────────────────────────────────────────────────
  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());
  const [payrollData, setPayrollData] = useState<PayrollSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── KPI derived values ───────────────────────────────────────────────────
  const permanentCount = employees.filter((e) => e.employment_type === "permanent").length;
  const contractCount = employees.filter((e) => e.employment_type === "contract").length;

  // ─── Fetch employees ──────────────────────────────────────────────────────

  const fetchEmployees = useCallback(
    (nextPage: number, q: string, dept: string, empType: string) => {
      startTransition(async () => {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(PAGE_SIZE),
        });
        if (q) params.set("search", q);
        if (dept) params.set("department", dept);
        if (empType && empType !== "all") params.set("employment_type", empType);

        try {
          const res = await fetch(`/api/employees?${params.toString()}`);
          if (!res.ok) throw new Error("Failed to fetch employees");
          const json = (await res.json()) as {
            data: EmployeeRow[];
            count: number;
          };
          setEmployees(json.data);
          setTotal(json.count);
          setPage(nextPage);
        } catch {
          toast.error("Could not load employees. Please try again.");
        }
      });
    },
    []
  );

  // ─── Search / filter handlers ─────────────────────────────────────────────

  function handleSearch(value: string) {
    setSearch(value);
    fetchEmployees(1, value, departmentFilter, typeFilter);
  }

  function handleDepartmentFilter(value: string) {
    setDepartmentFilter(value);
    fetchEmployees(1, search, value, typeFilter);
  }

  function handleTypeFilter(value: string) {
    setTypeFilter(value);
    fetchEmployees(1, search, departmentFilter, value);
  }

  function handlePrev() {
    if (page > 1) fetchEmployees(page - 1, search, departmentFilter, typeFilter);
  }

  function handleNext() {
    if (page < totalPages) fetchEmployees(page + 1, search, departmentFilter, typeFilter);
  }

  // ─── Add / Edit handlers ──────────────────────────────────────────────────

  function openAdd() {
    setEditingEmployee(undefined);
    setFormOpen(true);
  }

  function openEdit(emp: EmployeeRow) {
    setEditingEmployee(emp);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    fetchEmployees(page, search, departmentFilter, typeFilter);
  }

  // ─── Deactivate handler ───────────────────────────────────────────────────

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/employees/${deactivateTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        toast.error(json.error ?? "Failed to deactivate employee.");
        return;
      }
      toast.success(`${deactivateTarget.full_name} has been deactivated.`);
      setDeactivateTarget(null);
      fetchEmployees(page, search, departmentFilter, typeFilter);
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsDeactivating(false);
    }
  }

  // ─── Payroll calculation ──────────────────────────────────────────────────

  async function handleCalculatePayroll() {
    setIsCalculating(true);
    try {
      const res = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: payrollMonth, year: payrollYear }),
      });
      const json = (await res.json()) as {
        data?: PayrollSummary;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Payroll calculation failed.");
        return;
      }
      if (!json.data) {
        toast.error("No payroll data returned.");
        return;
      }
      setPayrollData(json.data);
      if (json.data.employee_count === 0) {
        toast.info("No active employees found for payroll calculation.");
      } else {
        toast.success(
          `Payroll calculated for ${json.data.employee_count} employee(s).`
        );
      }
    } catch {
      toast.error("An unexpected error occurred during calculation.");
    } finally {
      setIsCalculating(false);
    }
  }

  // ─── CSV Export ───────────────────────────────────────────────────────────

  function handleExportCSV() {
    if (!payrollData || payrollData.lines.length === 0) {
      toast.error("No payroll data to export.");
      return;
    }

    const monthName = MONTH_NAMES[payrollData.month - 1];
    const headers = [
      "Employee No", "Full Name", "Department", "Employment Type",
      "Basic Salary", "Gross", "PAYE", "NHIF/SHIF",
      "NSSF (Employee)", "NSSF (Employer)", "Total Deductions", "Net Pay",
    ];

    const rows = payrollData.lines.map((l) => [
      l.employee_number, l.full_name, l.department ?? "",
      EMPLOYMENT_TYPE_CONFIG[l.employment_type]?.label ?? l.employment_type,
      l.basic_salary.toFixed(2), l.gross.toFixed(2), l.paye.toFixed(2),
      l.nhif.toFixed(2), l.nssf_employee.toFixed(2), l.nssf_employer.toFixed(2),
      l.total_deductions.toFixed(2), l.net_pay.toFixed(2),
    ]);

    rows.push([
      "", "TOTALS", "", "",
      "", payrollData.total_gross.toFixed(2), payrollData.total_paye.toFixed(2),
      payrollData.total_nhif.toFixed(2), payrollData.total_nssf_employee.toFixed(2),
      payrollData.total_nssf_employer.toFixed(2), "", payrollData.total_net_pay.toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payroll_${monthName}_${payrollData.year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Payroll CSV downloaded.");
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Module Hero Strip ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-blue-100">
        {/* Gradient top */}
        <div className="relative h-24 bg-linear-to-r from-blue-500 to-indigo-600 px-6 flex items-center justify-between overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">HR &amp; Payroll</h1>
              <p className="text-sm text-white/70">Manage employees and run monthly payroll</p>
            </div>
          </div>
          <Button
            onClick={openAdd}
            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Employee
          </Button>
        </div>
        {/* KPI pills */}
        <div className="bg-white px-6 py-3 flex flex-wrap gap-4 border-t border-blue-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm text-slate-600 font-medium">{total} Total Employees</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span className="text-sm text-slate-600 font-medium">{permanentCount} Permanent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm text-slate-600 font-medium">{contractCount} Contract</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-blue-500 to-indigo-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500 font-medium">Active Employees</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-blue-500 to-indigo-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{permanentCount}</p>
              <p className="text-xs text-slate-500 font-medium">Permanent Staff</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-linear-to-r from-blue-500 to-indigo-600" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{contractCount}</p>
              <p className="text-xs text-slate-500 font-medium">On Contract</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="employees">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="employees">
              <Users className="h-4 w-4 mr-1.5" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="payroll">
              <Calculator className="h-4 w-4 mr-1.5" />
              Payroll
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            EMPLOYEES TAB
            ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="employees" className="space-y-4 mt-4">
          {/* Search / Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or employee number..."
                className="pl-9 border-slate-200 focus-visible:ring-blue-500"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Input
              placeholder="Filter by department..."
              className="sm:w-48 border-slate-200 focus-visible:ring-blue-500"
              value={departmentFilter}
              onChange={(e) => handleDepartmentFilter(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={handleTypeFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-y border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emp No</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Basic Salary</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">No employees found</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {search || departmentFilter || typeFilter !== "all"
                            ? "Try adjusting your filters."
                            : 'Click "Add Employee" to get started.'}
                        </p>
                        {!search && !departmentFilter && typeFilter === "all" && (
                          <Button
                            onClick={openAdd}
                            className="mt-4 bg-linear-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add First Employee
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-blue-50/20 transition-colors border-b border-slate-100">
                      <TableCell className="font-mono text-sm text-slate-600">
                        {emp.employee_number}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {emp.full_name}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {emp.department ?? <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {emp.designation ?? <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell>
                        <EmploymentBadge type={emp.employment_type} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatKES(emp.basic_salary)}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-50 hover:text-blue-700"
                            title="Edit employee"
                            onClick={() => openEdit(emp)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Deactivate employee"
                            onClick={() => setDeactivateTarget(emp)}
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                Page {page} of {totalPages} &bull; {total} employees
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1 || isLoading}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={page === totalPages || isLoading}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════
            PAYROLL TAB
            ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="payroll" className="space-y-6 mt-4">
          {/* Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Month</label>
              <Select
                value={String(payrollMonth)}
                onValueChange={(v) => {
                  setPayrollMonth(parseInt(v, 10));
                  setPayrollData(null);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Year</label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={payrollYear}
                onChange={(e) => {
                  setPayrollYear(parseInt(e.target.value, 10) || now.getFullYear());
                  setPayrollData(null);
                }}
                className="w-28"
              />
            </div>

            <Button
              onClick={handleCalculatePayroll}
              disabled={isCalculating}
              className="self-end bg-linear-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Calculating…
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-1.5" />
                  Calculate Payroll
                </>
              )}
            </Button>

            {payrollData && payrollData.lines.length > 0 && (
              <Button variant="outline" onClick={handleExportCSV} className="self-end">
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Results */}
          {payrollData && (
            <>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-800">
                  {MONTH_NAMES[payrollData.month - 1]} {payrollData.year} Payroll
                </h2>
                <Badge variant="secondary">
                  {payrollData.employee_count} employee
                  {payrollData.employee_count !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <SummaryCard title="Total Gross" amount={payrollData.total_gross} />
                <SummaryCard title="Total PAYE" amount={payrollData.total_paye} />
                <SummaryCard title="Total NHIF/SHIF" amount={payrollData.total_nhif} />
                <SummaryCard title="Total NSSF" amount={payrollData.total_nssf_employee} />
                <SummaryCard title="Total Net Pay" amount={payrollData.total_net_pay} highlight />
              </div>

              {payrollData.lines.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/30">
                    <Calculator className="h-8 w-8 text-white" />
                  </div>
                  <p className="font-bold text-slate-800">No active employees</p>
                  <p className="text-sm text-slate-500 mt-1">Add employees first to generate payroll.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-y border-slate-200">
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Gross</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">PAYE</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">NHIF/SHIF</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">NSSF (Emp)</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">NSSF (Emplr)</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right text-blue-700">Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.lines.map((line) => (
                        <TableRow key={line.employee_id} className="hover:bg-blue-50/20 transition-colors border-b border-slate-100">
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{line.full_name}</p>
                              <p className="text-xs text-slate-400">
                                {line.employee_number}
                                {line.department ? ` · ${line.department}` : ""}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatKES(line.gross)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-600">{formatKES(line.paye)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-600">{formatKES(line.nhif)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-600">{formatKES(line.nssf_employee)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-slate-500">{formatKES(line.nssf_employer)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold text-blue-700">{formatKES(line.net_pay)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals footer row */}
                      <TableRow className="bg-slate-50 font-semibold border-t-2 border-slate-300">
                        <TableCell className="text-slate-700">TOTALS ({payrollData.employee_count} employees)</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatKES(payrollData.total_gross)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-700">{formatKES(payrollData.total_paye)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-700">{formatKES(payrollData.total_nhif)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-700">{formatKES(payrollData.total_nssf_employee)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-slate-600">{formatKES(payrollData.total_nssf_employer)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-blue-700">{formatKES(payrollData.total_net_pay)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {/* Empty state before first calculation */}
          {!payrollData && !isCalculating && (
            <div className="rounded-xl border border-dashed border-slate-300 p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/30">
                <Calculator className="h-8 w-8 text-white" />
              </div>
              <p className="font-bold text-slate-800 text-base">
                Select a month and year, then click &ldquo;Calculate Payroll&rdquo;
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Payroll will be computed using Kenya 2024 PAYE, NHIF/SHIF, and NSSF rates.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Employee Form Sheet ───────────────────────────────────────── */}
      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
        onSuccess={handleFormSuccess}
      />

      {/* ── Deactivate Confirm Dialog ─────────────────────────────────── */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <span className="font-semibold">{deactivateTarget?.full_name}</span>{" "}
              and set their termination date to today. They will no longer appear
              in active employee lists or payroll runs. This action can be reversed
              by a system administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={isDeactivating}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeactivating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
