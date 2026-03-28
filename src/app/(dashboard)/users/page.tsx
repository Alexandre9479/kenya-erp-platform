"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, UserCog, Shield,
  Edit, UserX, UserCheck, RefreshCw,
  Mail, Phone, Clock, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLES_CONFIG } from "@/config/app";
import { UserRole } from "@/types";
import UserModal, { UserData } from "@/components/users/UserModal";
import { formatDateTime } from "@/lib/utils/helpers";
import { useSession } from "next-auth/react";

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<UserData | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (user: UserData) => {
    if (user.id === session?.user?.id) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User ${user.isActive ? "deactivated" : "activated"}`);
        fetchUsers();
      }
    } catch {
      toast.error("Failed to update user");
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.role === "tenant_admin").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage team members, roles and access permissions
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchUsers}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setSelected(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-purple-500/25"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.total, icon: UserCog, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: stats.active, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
          { label: "Inactive", value: stats.inactive, icon: UserX, color: "text-red-600", bg: "bg-red-50" },
          { label: "Admins", value: stats.admins, icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLES_CONFIG)
              .filter(([key]) => key !== "super_admin")
              .map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["User", "Role", "Department", "Contact", "Last Login", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <UserCog className="w-8 h-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">No users found</p>
                        <p className="text-sm text-slate-500">Add your first team member</p>
                      </div>
                      <button
                        onClick={() => { setSelected(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold"
                      >
                        <Plus className="w-4 h-4" /> Add User
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const roleConfig = ROLES_CONFIG[user.role as UserRole];
                  const isSelf = user.id === session?.user?.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {user.firstName} {user.lastName}
                              {isSelf && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
                          roleConfig?.color
                        )}>
                          <Shield className="w-3 h-3" />
                          {roleConfig?.label || user.role}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3">
                        {user.department ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {user.department}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3">
                        {user.lastLogin ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(user.lastLogin)}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Never</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full",
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setSelected(user); setShowModal(true); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf}
                            className={cn(
                              "w-8 h-8 flex items-center justify-center rounded-xl transition-colors",
                              isSelf
                                ? "text-slate-200 cursor-not-allowed"
                                : user.isActive
                                  ? "hover:bg-red-50 text-slate-400 hover:text-red-600"
                                  : "hover:bg-green-50 text-slate-400 hover:text-green-600"
                            )}
                            title={user.isActive ? "Deactivate user" : "Activate user"}
                          >
                            {user.isActive
                              ? <UserX className="w-4 h-4" />
                              : <UserCheck className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        open={showModal}
        onClose={() => { setShowModal(false); setSelected(null); }}
        onSuccess={fetchUsers}
        user={selected}
      />
    </div>
  );
}