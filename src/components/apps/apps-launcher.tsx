"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Package,
  Warehouse,
  UserCheck,
  Users,
  Calculator,
  BarChart3,
  Search,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type AppCard = {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  glow: string;
  category: "Operations" | "People" | "Finance" | "Intelligence";
  keywords?: string[];
};

const APPS: AppCard[] = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Your command centre — KPIs, activity, and quick actions at a glance.",
    icon: LayoutDashboard,
    gradient: "from-slate-700 to-slate-900",
    glow: "shadow-slate-500/20",
    category: "Intelligence",
    keywords: ["home", "overview", "kpi"],
  },
  {
    href: "/sales",
    title: "Sales",
    description: "Quotes, sales orders, invoices, and customer receivables.",
    icon: ShoppingCart,
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
    category: "Operations",
    keywords: ["quotes", "invoices", "orders", "customers"],
  },
  {
    href: "/purchasing",
    title: "Purchasing",
    description: "Requisitions, purchase orders, supplier bills and payables.",
    icon: Truck,
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/30",
    category: "Operations",
    keywords: ["po", "supplier", "rfq", "bills"],
  },
  {
    href: "/inventory",
    title: "Inventory",
    description: "Products, stock levels, adjustments and valuation.",
    icon: Package,
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/30",
    category: "Operations",
    keywords: ["stock", "products", "sku"],
  },
  {
    href: "/warehouse",
    title: "Warehouse",
    description: "Receipts, picking, transfers and multi-location control.",
    icon: Warehouse,
    gradient: "from-cyan-500 to-blue-700",
    glow: "shadow-cyan-500/30",
    category: "Operations",
    keywords: ["receipts", "transfers", "bin"],
  },
  {
    href: "/crm",
    title: "CRM",
    description: "Leads, opportunities, and the full customer pipeline.",
    icon: UserCheck,
    gradient: "from-fuchsia-500 to-pink-600",
    glow: "shadow-fuchsia-500/30",
    category: "People",
    keywords: ["leads", "pipeline", "deals"],
  },
  {
    href: "/hr",
    title: "HR & Payroll",
    description: "Employees, attendance, leave, payroll, PAYE and NSSF/SHIF.",
    icon: Users,
    gradient: "from-violet-500 to-purple-700",
    glow: "shadow-violet-500/30",
    category: "People",
    keywords: ["payroll", "employees", "paye", "nssf", "shif"],
  },
  {
    href: "/accounting",
    title: "Accounting",
    description: "General ledger, expenses, reconciliation, fixed assets, budgets and KRA eTIMS.",
    icon: Calculator,
    gradient: "from-indigo-500 to-violet-700",
    glow: "shadow-indigo-500/30",
    category: "Finance",
    keywords: [
      "gl",
      "ledger",
      "expenses",
      "reconciliation",
      "bank",
      "supplier",
      "fixed assets",
      "budgets",
      "etims",
      "kra",
      "vat",
      "tax",
    ],
  },
  {
    href: "/reports",
    title: "Reports",
    description: "Financial statements, operational insights and exportable analytics.",
    icon: BarChart3,
    gradient: "from-rose-500 to-red-600",
    glow: "shadow-rose-500/30",
    category: "Intelligence",
    keywords: ["p&l", "balance sheet", "cashflow"],
  },
];

const CATEGORY_ORDER: AppCard["category"][] = ["Operations", "People", "Finance", "Intelligence"];

interface Props {
  userName: string;
  tenantName: string;
}

export function AppsLauncher({ userName, tenantName }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPS;
    return APPS.filter((a) => {
      const hay = [a.title, a.description, a.category, ...(a.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<AppCard["category"], AppCard[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const app of filtered) map.get(app.category)?.push(app);
    return map;
  }, [filtered]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = userName.split(" ")[0];

  return (
    <div className="-m-4 md:-m-6 min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <div
        className="relative overflow-hidden px-4 md:px-10 pt-10 pb-16"
        style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-violet-500 blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-fuchsia-500/60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-indigo-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Kenya ERP Platform</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight text-white">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-2 text-slate-300 text-base md:text-lg max-w-2xl">
            Pick an app to get started at <span className="text-white font-semibold">{tenantName}</span>.
            Related tools are grouped together — finance, operations, people and intelligence.
          </p>

          <div className="mt-7 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps — try 'payroll', 'invoice', 'eTIMS'…"
                className="pl-10 h-12 bg-white/10 border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:border-indigo-400/50 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* App grid */}
      <div className="-mt-10 px-4 md:px-10 pb-16">
        <div className="mx-auto max-w-7xl space-y-10">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">{cat}</h2>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((app) => (
                    <AppTile key={app.href} app={app} />
                  ))}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-slate-600">No apps match “{query}”.</p>
              <button
                onClick={() => setQuery("")}
                className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppTile({ app }: { app: AppCard }) {
  const Icon = app.icon;
  return (
    <Link
      href={app.href}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-2xl"
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-br ${app.gradient}`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${app.gradient} shadow-lg ${app.glow}`}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-slate-300 transition-all duration-300 group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div className="relative mt-5">
        <h3 className="text-lg font-bold text-slate-900 transition-colors duration-300 group-hover:text-white">
          {app.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 transition-colors duration-300 group-hover:text-white/90">
          {app.description}
        </p>
      </div>
    </Link>
  );
}
