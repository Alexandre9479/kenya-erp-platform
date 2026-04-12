"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRow = {
  id: string;
  tenant_id: string | null;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  phone: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const roleOptions = [
  { value: "tenant_admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
  { value: "purchasing", label: "Purchasing" },
  { value: "warehouse", label: "Warehouse" },
  { value: "hr", label: "HR" },
  { value: "viewer", label: "Viewer" },
] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional().nullable(),
  role: z.enum([
    "tenant_admin",
    "accountant",
    "sales",
    "purchasing",
    "warehouse",
    "hr",
    "viewer",
  ]),
});

const createSchema = baseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const editSchema = baseSchema.extend({
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters",
    }),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;
type FormValues = CreateFormValues | EditFormValues;

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRow;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserForm({ open, onOpenChange, user, onSuccess }: UserFormProps) {
  const isEdit = !!user;
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = isEdit ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      role: (user?.role as EditFormValues["role"]) ?? "viewer",
      password: "",
    },
  });

  const roleValue = watch("role");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setShowPassword(false);
    }
    onOpenChange(open);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: values.full_name,
        email: values.email,
        phone: values.phone || null,
        role: values.role,
      };

      if ("password" in values && values.password) {
        payload.password = values.password;
      }

      const url = isEdit ? `/api/users/${user.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { error?: string };

      if (!res.ok) {
        toast.error(json.error ?? `Failed to ${isEdit ? "update" : "create"} user.`);
        return;
      }

      toast.success(
        isEdit ? "User updated successfully." : "User created successfully."
      );
      handleOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit User" : "Add User"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the user's details and role."
              : "Create a new user account for your team."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-6"
        >
          <Field label="Full Name" error={errors.full_name?.message}>
            <Input
              {...register("full_name")}
              placeholder="Jane Muthoni"
              className={errors.full_name ? "border-destructive" : ""}
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Email Address" error={errors.email?.message}>
            <Input
              {...register("email")}
              type="email"
              placeholder="jane@company.co.ke"
              className={errors.email ? "border-destructive" : ""}
              disabled={isSubmitting || isEdit}
              readOnly={isEdit}
            />
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <Input
              {...register("phone")}
              placeholder="+254 700 000 000"
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Role" error={errors.role?.message}>
            <Select
              value={roleValue}
              onValueChange={(val) =>
                setValue("role", val as EditFormValues["role"], {
                  shouldValidate: true,
                })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={isEdit ? "New Password" : "Password"}
            error={
              "password" in errors
                ? (errors.password as { message?: string } | undefined)?.message
                : undefined
            }
            hint={isEdit ? "Leave blank to keep the current password." : undefined}
          >
            <div className="relative">
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
                className={
                  "password" in errors && errors.password
                    ? "border-destructive pr-10"
                    : "pr-10"
                }
                disabled={isSubmitting}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          <SheetFooter className="mt-2 flex gap-2 sm:flex-row flex-col-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Saving…" : "Creating…"}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create User"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
