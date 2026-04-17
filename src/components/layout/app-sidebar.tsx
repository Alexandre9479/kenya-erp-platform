"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Warehouse,
  Calculator, Users, UserCheck, BarChart3, Settings, UserCog,
  Shield, Building2, ChevronLeft, ChevronRight, Receipt, Banknote, FileCheck2, Building, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserRole } from "@/lib/types/supabase";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
  badge?: string;
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/purchasing", label: "Purchasing", icon: Truck },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/crm", label: "CRM", icon: UserCheck },
  { href: "/hr", label: "HR & Payroll", icon: Users },
  { href: "/accounting", label: "Accounting", icon: Calculator },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reconciliation", label: "Bank Recon", icon: Banknote },
  { href: "/supplier-recon", label: "Supplier Recon", icon: FileCheck2 },
  { href: "/fixed-assets", label: "Fixed Assets", icon: Building },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "User Management", icon: UserCog, roles: ["super_admin", "tenant_admin"] },
  { href: "/admin", label: "Super Admin", icon: Shield, roles: ["super_admin"] },
];

function NavLink({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = item.icon;

  const inner = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-linear-to-r from-indigo-500/20 to-violet-500/20 text-white border border-indigo-500/30 shadow-sm"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
        collapsed && "justify-center px-0 w-10 mx-auto"
      )}
    >
      <div className={cn(
        "flex items-center justify-center shrink-0 rounded-lg transition-all duration-150",
        isActive
          ? "w-7 h-7 bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 text-white"
          : "w-7 h-7 text-slate-400 group-hover:text-white",
        collapsed && "w-8 h-8"
      )}>
        <Icon className={cn(isActive ? "h-3.5 w-3.5" : "h-4 w-4", collapsed && "h-4 w-4")} />
      </div>
      {!collapsed && (
        <span className="flex-1 leading-none">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className="text-[10px] font-bold bg-indigo-500 text-white rounded-full px-1.5 py-0.5">{item.badge}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="bg-slate-800 text-white border-slate-700 text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

function SidebarContent({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;

  const visibleAdminNav = adminNav.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <div className="flex h-full flex-col" style={{ background: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      {/* Logo */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b border-white/5 px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40">
              {session?.user?.tenantLogo ? (
                <Image
                  src={session.user.tenantLogo}
                  alt="Company logo"
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <Building2 className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-white">
                {session?.user?.tenantName ?? "Kenya ERP"}
              </p>
              <p className="text-[10px] leading-tight text-slate-500 font-medium uppercase tracking-wider">
                Business Platform
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40">
            {session?.user?.tenantLogo ? (
              <Image
                src={session.user.tenantLogo}
                alt="Company logo"
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-white" />
            )}
          </div>
        )}
        {onToggleCollapse && !collapsed && (
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}
            className="h-7 w-7 shrink-0 text-slate-500 hover:bg-white/5 hover:text-white rounded-lg">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-4 space-y-0.5", collapsed ? "px-1.5" : "px-3")}>
        {/* Main nav */}
        {!collapsed && (
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Main</p>
        )}
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
        ))}

        {/* Admin nav */}
        {visibleAdminNav.length > 0 && (
          <>
            <div className={cn("my-3 border-t border-white/5", collapsed && "mx-2")} />
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Admin</p>
            )}
            {visibleAdminNav.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* User info + expand button */}
      <div className={cn("shrink-0 border-t border-white/5 p-3", collapsed && "flex justify-center")}>
        {collapsed && onToggleCollapse ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggleCollapse}
                className="w-9 h-9 text-slate-500 hover:bg-white/5 hover:text-white rounded-xl">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700 text-xs">Expand</TooltipContent>
          </Tooltip>
        ) : !collapsed ? (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-lg shadow-indigo-500/30">
              {(session?.user?.name?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session?.user?.name ?? "User"}</p>
              <p className="text-[10px] text-slate-500 truncate">{session?.user?.email ?? ""}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AppSidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      <aside className={cn(
        "hidden lg:flex flex-col shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent side="left" className="w-64 p-0 border-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}
