"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/sales": "Sales",
  "/purchasing": "Purchasing",
  "/warehouse": "Warehouse",
  "/accounting": "Accounting",
  "/hr": "HR & Payroll",
  "/crm": "CRM",
  "/reports": "Reports",
  "/settings": "Settings",
  "/users": "User Management",
  "/admin": "Super Admin",
};

function getPageLabel(pathname: string): string {
  // exact match first
  if (routeLabels[pathname]) return routeLabels[pathname];
  // prefix match for sub-routes
  const match = Object.keys(routeLabels).find(
    (key) => key !== "/" && pathname.startsWith(key)
  );
  return match ? routeLabels[match] : "Dashboard";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatRole(role: string | undefined): string {
  if (!role) return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AppHeaderProps {
  onMobileMenuOpen: () => void;
}

export default function AppHeader({ onMobileMenuOpen }: AppHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const pageLabel = getPageLabel(pathname);
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userRole = session?.user?.role;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMobileMenuOpen}
        className="lg:hidden text-slate-600 hover:text-slate-900"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-slate-900">{pageLabel}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 gap-2 rounded-lg px-2 hover:bg-slate-100"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-blue-600 text-xs font-semibold text-white">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="max-w-32 truncate text-sm font-medium leading-tight text-slate-900">
                {userName}
              </p>
              <p className="max-w-32 truncate text-xs leading-tight text-slate-500">
                {formatRole(userRole)}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate font-semibold text-slate-900">{userName}</p>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-red-600 focus:bg-red-50 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
