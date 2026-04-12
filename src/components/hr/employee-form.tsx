"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Tables } from "@/lib/types/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeRow = Tables<"employees">;

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const employeeSchema = z.object({
  employee_number: z.string().optional(),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().optional(),
  phone: z.string().optional(),
  id_number: z.string().optional(),
  kra_pin: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employment_type: z.enum(["permanent", "contract", "casual", "part_time"], {
    message: "Employment type is required",
  }),
  hire_date: z.string().min(1, "Hire date is required"),
  basic_salary: z
    .string()
    .min(1, "Basic salary is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Basic salary must be a positive number",
    }),
  nssf_number: z.string().optional(),
  nhif_number: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeRow;
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateEmployeeNumber(): string {
  return `EMP-${Date.now().toString().slice(-5)}`;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  contract: "Contract",
  casual: "Casual",
  part_time: "Part-time",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeForm({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeeFormProps) {
  const isEditing = !!employee;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_number: employee?.employee_number ?? "",
      full_name: employee?.full_name ?? "",
      email: employee?.email ?? "",
      phone: employee?.phone ?? "",
      id_number: employee?.id_number ?? "",
      kra_pin: employee?.kra_pin ?? "",
      department: employee?.department ?? "",
      designation: employee?.designation ?? "",
      employment_type: (employee?.employment_type as EmployeeFormValues["employment_type"]) ?? undefined,
      hire_date: employee?.hire_date ?? "",
      basic_salary: employee ? String(employee.basic_salary) : "",
      nssf_number: employee?.nssf_number ?? "",
      nhif_number: employee?.nhif_number ?? "",
      bank_name: employee?.bank_name ?? "",
      bank_account: employee?.bank_account ?? "",
    },
  });

  const employmentTypeValue = watch("employment_type");

  function handleOpenChange(value: boolean) {
    if (!value) {
      reset();
    }
    onOpenChange(value);
  }

  async function onSubmit(values: EmployeeFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        employee_number: values.employee_number?.trim() || undefined,
        full_name: values.full_name.trim(),
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        id_number: values.id_number?.trim() || null,
        kra_pin: values.kra_pin?.trim() || null,
        department: values.department?.trim() || null,
        designation: values.designation?.trim() || null,
        employment_type: values.employment_type,
        hire_date: values.hire_date,
        basic_salary: parseFloat(values.basic_salary),
        nssf_number: values.nssf_number?.trim() || null,
        nhif_number: values.nhif_number?.trim() || null,
        bank_name: values.bank_name?.trim() || null,
        bank_account: values.bank_account?.trim() || null,
      };

      const url = isEditing
        ? `/api/employees/${employee.id}`
        : "/api/employees";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { error?: unknown };

      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : "Failed to save employee. Please try again.";
        toast.error(msg);
        return;
      }

      toast.success(
        isEditing ? "Employee updated successfully." : "Employee added successfully."
      );
      reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle>{isEditing ? "Edit Employee" : "Add Employee"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the employee's information below."
              : "Fill in the details to add a new employee."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-6">
          {/* ── Personal Information ─────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  placeholder="e.g. Jane Wanjiku Kamau"
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-xs text-red-500">{errors.full_name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    {...register("email")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+254 7XX XXX XXX"
                    {...register("phone")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="id_number">National ID Number</Label>
                  <Input
                    id="id_number"
                    placeholder="e.g. 12345678"
                    {...register("id_number")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kra_pin">KRA PIN</Label>
                  <Input
                    id="kra_pin"
                    placeholder="e.g. A000000000X"
                    {...register("kra_pin")}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Employment Details ───────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Employment Details
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="employee_number">Employee Number</Label>
              <div className="flex gap-2">
                <Input
                  id="employee_number"
                  placeholder="e.g. EMP-00123 (auto-generated if blank)"
                  className="flex-1"
                  {...register("employee_number")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate employee number"
                  onClick={() =>
                    setValue("employee_number", generateEmployeeNumber())
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g. Finance"
                  {...register("department")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation / Job Title</Label>
                <Input
                  id="designation"
                  placeholder="e.g. Senior Accountant"
                  {...register("designation")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Employment Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={employmentTypeValue}
                  onValueChange={(v) =>
                    setValue(
                      "employment_type",
                      v as EmployeeFormValues["employment_type"],
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employment_type && (
                  <p className="text-xs text-red-500">
                    {errors.employment_type.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hire_date">
                  Hire Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hire_date"
                  type="date"
                  {...register("hire_date")}
                />
                {errors.hire_date && (
                  <p className="text-xs text-red-500">{errors.hire_date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="basic_salary">
                Basic Salary (KES) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="basic_salary"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 50000"
                {...register("basic_salary")}
              />
              {errors.basic_salary && (
                <p className="text-xs text-red-500">{errors.basic_salary.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* ── NSSF / NHIF ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              NSSF &amp; NHIF / SHIF
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nssf_number">NSSF Number</Label>
                <Input
                  id="nssf_number"
                  placeholder="e.g. 1234567"
                  {...register("nssf_number")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nhif_number">NHIF / SHIF Number</Label>
                <Input
                  id="nhif_number"
                  placeholder="e.g. 123456789"
                  {...register("nhif_number")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Banking ──────────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Banking Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  placeholder="e.g. Equity Bank"
                  {...register("bank_name")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank_account">Bank Account Number</Label>
                <Input
                  id="bank_account"
                  placeholder="e.g. 0123456789"
                  {...register("bank_account")}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="pt-4 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Employee"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
