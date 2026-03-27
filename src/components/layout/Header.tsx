"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Bell, LogOut, User, Settings,
  ChevronDown, Search,
} from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/config/app";
import { ROLES_CONFIG } from "@/config/app";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const currentPage = NAV_ITEMS.find(
    (item) => pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  const roleConfig = ROLES_CONFIG[session.user.role as UserRole];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      {/* Left - Page title */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {currentPage?.title || "Dashboard"}
        </h1>
        <p className="text-xs text-slate-500">
          {new Date().toLocaleDateString("en-KE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { title: "Low stock alert", desc: "5 items below reorder level", time: "2m ago", color: "bg-red-500" },
                  { title: "Invoice overdue", desc: "INV-00023 is 3 days overdue", time: "1h ago", color: "bg-orange-500" },
                  { title: "New customer", desc: "Kamau Enterprises registered", time: "3h ago", color: "bg-green-500" },
                ].map((n) => (
                  <div key={n.title} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", n.color)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500">{n.desc}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              {session.user.firstName?.[0]}{session.user.lastName?.[0]}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {session.user.firstName} {session.user.lastName}
              </p>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-medium",
                roleConfig?.color
              )}>
                {roleConfig?.label}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">
                  {session.user.firstName} {session.user.lastName}
                </p>
                <p className="text-xs text-slate-500">{session.user.email}</p>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}