"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, UserCog, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ROLES_CONFIG } from "@/config/app";
import { UserRole } from "@/types";

const createSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  phone: z.string().optional(),
});

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional().or(z.literal("")),
});

export interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string | null;
  phone?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: UserData | null;
}

const DEPARTMENTS = [
  "Management", "Finance & Accounts", "Sales & Marketing",
  "Procurement", "Warehouse & Logistics", "Human Resources",
  "IT & Systems", "Operations", "Customer Service",
];

const ASSIGNABLE_ROLES: UserRole[] = [
  "tenant_admin", "accountant", "sales",
  "purchasing", "warehouse", "hr", "viewer",
];

export default function UserModal({ open, onClose, onSuccess, user }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const schema = user ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "viewer",
      department: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department || "",
        phone: user.phone || "",
        password: "",
      });
    } else {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "viewer",
        department: "",
        phone: "",
      });
    }
  }, [user, reset, open]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const url = user ? `/api/users/${user.id}` : "/api/users";
      const method = user ? "PUT" : "POST";

      // Remove empty password on edit
      if (user && !data.password) delete data.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(user ? "User updated!" : "User created successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Failed to save user");
      }
    } catch {
      toast.error("Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <UserCog className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {user ? "Edit User" : "Add New User"}
              </h2>
              <p className="text-sm text-slate-500">
                {user ? "Update user details and permissions" : "Create a new team member account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-4">

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  First Name *
                </label>
                <input
                  {...register("firstName")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.firstName.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Last Name *
                </label>
                <input
                  {...register("lastName")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.lastName.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Email - only on create */}
            {!user && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Email Address *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="john@company.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message as string}
                  </p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                {user ? "New Password (leave blank to keep current)" : "Password *"}
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={user ? "Leave blank to keep current" : "Min 8 characters"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message as string}
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Role & Permissions *
              </label>
              <select
                {...register("role")}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {ASSIGNABLE_ROLES.map(role => (
                  <option key={role} value={role}>
                    {ROLES_CONFIG[role]?.label} — {ROLES_CONFIG[role]?.description}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.role.message as string}
                </p>
              )}
            </div>

            {/* Department & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Department
                </label>
                <select
                  {...register("department")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Phone
                </label>
                <input
                  {...register("phone")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+254 700 000 000"
                />
              </div>
            </div>

            {/* Role Permissions Info */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700 mb-2">
                Role Access Levels:
              </p>
              <div className="grid grid-cols-2 gap-1">
                {ASSIGNABLE_ROLES.map(role => (
                  <div key={role} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span className="text-xs text-purple-600">
                      <span className="font-medium">{ROLES_CONFIG[role]?.label}:</span>{" "}
                      {ROLES_CONFIG[role]?.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-xl transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {user ? "Update User" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}