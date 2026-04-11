"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Warehouse,
  Calculator,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  UserCog,
  Shield,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@/lib/types/supabase";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/purchasing", label: "Purchasing", icon: Truck },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/accounting", label: "Accounting", icon: Calculator },
  { href: "/hr", label: "HR & Payroll", icon: Users },
  { href: "/crm", label: "CRM", icon: UserCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  {
    href: "/users",
    label: "User Management",
    icon: UserCog,
    roles: ["super_admin", "tenant_admin"],
  },
  { href: "/admin", label: "Super Admin", icon: Shield, roles: ["super_admin"] },
];

function NavLink({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = item.icon;

  const inner = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-800 hover:text-white",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={4}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;

  const visibleAdminNav = adminNav.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Logo / brand */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-slate-800 px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-white">
                {session?.user?.tenantName ?? "Kenya ERP"}
              </p>
              <p className="text-xs leading-tight text-slate-500">
                Business Platform
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Building2 className="h-4 w-4 text-white" />
          </div>
        )}

        {onToggleCollapse && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            pathname={pathname}
          />
        ))}

        <Separator className="my-3 bg-slate-800" />

        {visibleAdminNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* Expand button (collapsed state only) */}
      {collapsed && onToggleCollapse && (
        <div className="shrink-0 border-t border-slate-800 p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="w-full h-9 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AppSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* Mobile sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent side="left" className="w-64 p-0 border-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}
