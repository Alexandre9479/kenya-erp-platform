"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Settings, User, Bell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/sales": "Sales",
  "/purchasing": "Purchasing",
  "/warehouse": "Warehouse",
  "/accounting": "Accounting",
  "/hr": "HR & Payroll",
  "/crm": "CRM",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/settings": "Settings",
  "/users": "User Management",
  "/admin": "Super Admin",
};

function getPageLabel(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname];
  const match = Object.keys(routeLabels).find((key) => key !== "/" && pathname.startsWith(key));
  return match ? routeLabels[match] : "Dashboard";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatRole(role: string | undefined): string {
  if (!role) return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AppHeaderProps { onMobileMenuOpen: () => void }

export default function AppHeader({ onMobileMenuOpen }: AppHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const pageLabel = getPageLabel(pathname);
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userRole = session?.user?.role;

  // Build breadcrumb segments from pathname
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 sticky top-0 z-30 shadow-sm">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" onClick={onMobileMenuOpen}
        className="lg:hidden text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-slate-400 text-sm hidden sm:block">{session?.user?.tenantName ?? "Kenya ERP"}</span>
        {segments.length > 0 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:block shrink-0" />
            <h1 className="text-sm font-semibold text-slate-900 truncate">{pageLabel}</h1>
          </>
        )}
        {segments.length === 0 && (
          <h1 className="text-sm font-semibold text-slate-900">{pageLabel}</h1>
        )}
      </div>

      <div className="flex-1" />

      {/* Notification bell */}
      <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
        <Bell className="h-4.5 w-4.5" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white" />
      </Button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2.5 rounded-xl px-2 hover:bg-slate-100 transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-linear-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="max-w-32 truncate text-sm font-semibold leading-tight text-slate-900">{userName}</p>
              <p className="max-w-32 truncate text-[10px] leading-tight text-slate-400 font-medium">{formatRole(userRole)}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60 rounded-xl border-slate-200 shadow-xl p-1">
          <DropdownMenuLabel className="font-normal px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {getInitials(userName)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 text-sm">{userName}</p>
                <p className="truncate text-xs text-slate-400">{userEmail}</p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2.5 text-slate-700 focus:bg-slate-50">
            <Link href="/settings">
              <User className="h-4 w-4 text-slate-400" />
              Profile & Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2.5 text-slate-700 focus:bg-slate-50">
            <Link href="/settings">
              <Settings className="h-4 w-4 text-slate-400" />
              Company Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg cursor-pointer gap-2.5 text-red-600 focus:bg-red-50 focus:text-red-600">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
