"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import {
  LayoutDashboard, Package, ShoppingCart, ClipboardList,
  Calculator, Users, Handshake, Warehouse, BarChart3,
  Settings, UserCog, Building2, ChevronLeft, ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/config/app";
import { UserRole } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Package, ShoppingCart, ClipboardList,
  Calculator, Users, Handshake, Warehouse, BarChart3,
  Settings, UserCog, Shield,
};

interface SidebarProps {
  session: Session;
}

export default function Sidebar({ session }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const userRole = session.user.role as UserRole;

  const allowedItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b border-slate-700/50 h-16",
        collapsed && "justify-center"
      )}>
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight truncate">
              {session.user.tenantName || "ERP Platform"}
            </p>
            <p className="text-slate-400 text-xs truncate">Enterprise ERP</p>
          </div>
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded-full flex items-center justify-center transition-colors z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-white" />
          : <ChevronLeft className="w-3 h-3 text-white" />
        }
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {allowedItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {item.title}
                </span>
              )}
              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {item.title}
                </div>
              )}
              {item.badge && !collapsed && (
                <span className="ml-auto bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className={cn(
        "p-3 border-t border-slate-700/50",
        collapsed && "flex justify-center"
      )}>
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl bg-slate-800/50",
          collapsed && "w-10 h-10 justify-center"
        )}>
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {session.user.firstName?.[0]}{session.user.lastName?.[0]}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">
                {session.user.firstName} {session.user.lastName}
              </p>
              <p className="text-slate-400 text-xs truncate capitalize">
                {session.user.role?.replace("_", " ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}