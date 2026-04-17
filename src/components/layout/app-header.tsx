"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LogOut, Settings, User, Bell, ChevronRight, Check, Info, AlertTriangle, CheckCircle2, XCircle, LayoutGrid, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const routeLabels: Record<string, string> = {
  "/apps": "Apps",
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/sales": "Sales",
  "/purchasing": "Purchasing",
  "/warehouse": "Warehouse",
  "/accounting": "Accounting",
  "/hr": "HR & Payroll",
  "/crm": "CRM",
  "/expenses": "Expenses",
  "/reconciliation": "Bank Reconciliation",
  "/supplier-recon": "Supplier Reconciliation",
  "/fixed-assets": "Fixed Assets",
  "/budgets": "Budgets",
  "/etims": "KRA eTIMS",
  "/reports": "Reports",
  "/settings": "Settings",
  "/users": "User Management",
  "/admin": "Super Admin",
};

const FINANCE_SUB_ROUTES = [
  "/expenses",
  "/reconciliation",
  "/supplier-recon",
  "/fixed-assets",
  "/budgets",
  "/etims",
];

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

function isFinanceSubroute(pathname: string): boolean {
  return FINANCE_SUB_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const notifIcon: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  error: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AppHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const pageLabel = getPageLabel(pathname);
  const onApps = pathname === "/apps";
  const onFinanceChild = isFinanceSubroute(pathname);
  const backHref = onFinanceChild ? "/accounting" : "/apps";
  const backLabel = onFinanceChild ? "Accounting" : "Apps";
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userRole = session?.user?.role;

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      const json = await res.json();
      if (!res.ok) return;
      setNotifications(json.data ?? []);
      setUnreadCount(json.unreadCount ?? 0);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent fail
    }
  }

  // Build breadcrumb segments from pathname
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 sm:gap-3 border-b border-slate-100 bg-white/95 backdrop-blur-sm px-3 sm:px-4 sticky top-0 z-30 shadow-sm">
      {/* Back to Apps / Accounting — hidden on /apps */}
      {!onApps && (
        <Button
          asChild
          variant="ghost"
          className="h-9 gap-1.5 px-2 sm:px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl shrink-0"
        >
          <Link href={backHref} aria-label={`Back to ${backLabel}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline text-sm font-medium">{backLabel}</span>
          </Link>
        </Button>
      )}

      {/* Apps shortcut on /apps itself */}
      {onApps && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <LayoutGrid className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-slate-400 text-sm hidden md:block truncate">{session?.user?.tenantName ?? "Kenya ERP"}</span>
        {!onApps && segments.length > 0 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden md:block shrink-0" />
            <h1 className="text-sm font-semibold text-slate-900 truncate">{pageLabel}</h1>
          </>
        )}
        {onApps && (
          <h1 className="text-sm font-semibold text-slate-900 truncate md:hidden">Apps</h1>
        )}
      </div>

      <div className="flex-1" />

      {/* Notification bell */}
      <Popover open={notifOpen} onOpenChange={setNotifOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[10px] font-bold text-white leading-none">{unreadCount > 9 ? "9+" : unreadCount}</span>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-xl border-slate-200 shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">You&apos;ll see updates about orders, stock, and more here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 transition-colors ${
                    n.is_read ? "bg-white" : "bg-violet-50/50"
                  } hover:bg-slate-50`}
                >
                  <div className="mt-0.5">{notifIcon[n.type] ?? notifIcon.info}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${n.is_read ? "text-slate-700" : "text-slate-900 font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 text-center">
              <Link
                href="/notifications"
                onClick={() => setNotifOpen(false)}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                View all notifications
              </Link>
            </div>
          )}
        </PopoverContent>
      </Popover>

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
